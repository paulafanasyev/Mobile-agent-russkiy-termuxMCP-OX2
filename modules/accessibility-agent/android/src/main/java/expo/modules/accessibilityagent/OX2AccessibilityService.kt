package expo.modules.accessibilityagent

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.graphics.Rect
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class OX2AccessibilityService : AccessibilityService() {
  override fun onServiceConnected() {
    super.onServiceConnected()
    instance = this
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) = Unit

  override fun onInterrupt() = Unit

  override fun onDestroy() {
    if (instance === this) instance = null
    super.onDestroy()
  }

  fun snapshot(maxNodes: Int): List<Map<String, Any?>> {
    val limit = maxNodes.coerceIn(1, 200)
    val root = rootInActiveWindow ?: return emptyList()
    return try {
      val out = ArrayList<Map<String, Any?>>(limit)
      walk(root, "0", limit, out)
      out
    } finally {
      root.recycle()
    }
  }

  private fun walk(
    node: AccessibilityNodeInfo,
    id: String,
    maxNodes: Int,
    out: MutableList<Map<String, Any?>>,
  ) {
    if (out.size >= maxNodes) return
    val r = Rect()
    node.getBoundsInScreen(r)
    out += mapOf(
      "id" to id,
      "text" to node.text?.toString(),
      "contentDescription" to node.contentDescription?.toString(),
      "className" to node.className?.toString(),
      "packageName" to node.packageName?.toString(),
      "clickable" to node.isClickable,
      "editable" to node.isEditable,
      "enabled" to node.isEnabled,
      "bounds" to mapOf("left" to r.left, "top" to r.top, "right" to r.right, "bottom" to r.bottom),
    )
    for (i in 0 until node.childCount) {
      if (out.size >= maxNodes) break
      val child = node.getChild(i) ?: continue
      try {
        walk(child, "$id.$i", maxNodes, out)
      } finally {
        child.recycle()
      }
    }
  }

  fun perform(action: Map<String, Any?>): String {
    val type = action["type"] as? String ?: return "invalid_action"
    return when (type) {
      "back" -> if (performGlobalAction(GLOBAL_ACTION_BACK)) "executed" else "failed"
      "home" -> if (performGlobalAction(GLOBAL_ACTION_HOME)) "executed" else "failed"
      "recents" -> if (performGlobalAction(GLOBAL_ACTION_RECENTS)) "executed" else "failed"
      "tap" -> gesture(action, false)
      "long_press" -> gesture(action, true)
      "swipe" -> gesture(action, false)
      "type" -> typeText(action)
      else -> "unsupported"
    }
  }

  private fun typeText(action: Map<String, Any?>): String {
    val text = action["text"] as? String ?: return "invalid_action"
    if (text.length > MAX_TEXT_LENGTH) return "text_too_long"
    val node = findNode(action["nodeId"] as? String) ?: rootInActiveWindow
      ?: return "target_not_found"
    return try {
      if (!node.isEditable || !node.isEnabled) return "target_not_editable"
      val args = Bundle()
      args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
      if (node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)) "executed" else "failed"
    } finally {
      node.recycle()
    }
  }

  private fun findNode(id: String?): AccessibilityNodeInfo? {
    if (id.isNullOrBlank() || !NODE_ID.matches(id)) return null
    val root = rootInActiveWindow ?: return null
    val parts = id.split('.')
    var current: AccessibilityNodeInfo = root
    try {
      for (part in parts.drop(1)) {
        val index = part.toIntOrNull() ?: return null
        if (index < 0 || index >= current.childCount) return null
        val next = current.getChild(index) ?: return null
        if (current !== root) current.recycle()
        current = next
      }
      return current
    } catch (_: RuntimeException) {
      if (current !== root) current.recycle()
      return null
    } finally {
      if (current === root && parts.size == 1) {
        // Ownership of root is transferred to the caller only for the exact root id.
      }
      if (current !== root && current !== null) {
        // Child ownership is transferred to the caller.
      }
    }
  }

  private fun gesture(action: Map<String, Any?>, longPress: Boolean): String {
    val x = (action["x"] as? Number)?.toFloat() ?: return "invalid_action"
    val y = (action["y"] as? Number)?.toFloat() ?: return "invalid_action"
    val width = resources.displayMetrics.widthPixels.toFloat()
    val height = resources.displayMetrics.heightPixels.toFloat()
    if (!isInsideScreen(x, y, width, height)) return "out_of_bounds"

    val path = Path()
    path.moveTo(x, y)
    if (action["type"] == "swipe") {
      val x2 = (action["x2"] as? Number)?.toFloat() ?: return "invalid_action"
      val y2 = (action["y2"] as? Number)?.toFloat() ?: return "invalid_action"
      if (!isInsideScreen(x2, y2, width, height)) return "out_of_bounds"
      path.lineTo(x2, y2)
    }
    val duration = if (longPress) {
      ((action["durationMs"] as? Number)?.toLong() ?: 600L).coerceIn(400L, 3000L)
    } else {
      ((action["durationMs"] as? Number)?.toLong() ?: 250L).coerceIn(50L, 2000L)
    }
    val stroke = GestureDescription.StrokeDescription(path, 0, duration)
    return if (dispatchGesture(GestureDescription.Builder().addStroke(stroke).build(), null, null)) "executed" else "failed"
  }

  private fun isInsideScreen(x: Float, y: Float, width: Float, height: Float): Boolean =
    x >= 0f && y >= 0f && x < width && y < height

  companion object {
    private const val MAX_TEXT_LENGTH = 4096
    private val NODE_ID = Regex("^0(?:\\.[0-9]+)*$")

    @Volatile
    internal var instance: OX2AccessibilityService? = null
  }
}
