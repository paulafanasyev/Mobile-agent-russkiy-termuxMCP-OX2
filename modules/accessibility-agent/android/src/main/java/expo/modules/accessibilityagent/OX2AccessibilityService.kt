package expo.modules.accessibilityagent

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class OX2AccessibilityService : AccessibilityService() {
  override fun onServiceConnected() {
    super.onServiceConnected()
    instance = this
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    instance = this
  }

  override fun onInterrupt() = Unit

  override fun onDestroy() {
    if (instance === this) instance = null
    super.onDestroy()
  }

  fun snapshot(maxNodes: Int): List<Map<String, Any?>> {
    val root = rootInActiveWindow ?: return emptyList()
    val out = ArrayList<Map<String, Any?>>()
    walk(root, "0", maxNodes, out)
    root.recycle()
    return out
  }

  private fun walk(node: AccessibilityNodeInfo, id: String, maxNodes: Int, out: MutableList<Map<String, Any?>>) {
    if (out.size >= maxNodes) return
    val r = android.graphics.Rect()
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
      node.getChild(i)?.let { child ->
        walk(child, "$id.$i", maxNodes, out)
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
    val node = findNode(action["nodeId"] as? String) ?: rootInActiveWindow
    if (node == null || !node.isEditable) return "target_not_editable"
    val args = Bundle()
    args.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
    val ok = node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
    node.recycle()
    return if (ok) "executed" else "failed"
  }

  private fun findNode(id: String?): AccessibilityNodeInfo? {
    if (id.isNullOrBlank()) return null
    val root = rootInActiveWindow ?: return null
    val parts = id.split('.')
    var current: AccessibilityNodeInfo? = root
    for (part in parts.drop(1)) {
      val index = part.toIntOrNull() ?: return null
      val next = current?.getChild(index) ?: return null
      current?.recycle()
      current = next
    }
    return current
  }

  private fun gesture(action: Map<String, Any?>, longPress: Boolean): String {
    val x = (action["x"] as? Number)?.toFloat() ?: return "invalid_action"
    val y = (action["y"] as? Number)?.toFloat() ?: return "invalid_action"
    val path = Path()
    path.moveTo(x, y)
    if (action["type"] == "swipe") {
      val x2 = (action["x2"] as? Number)?.toFloat() ?: return "invalid_action"
      val y2 = (action["y2"] as? Number)?.toFloat() ?: return "invalid_action"
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

  companion object {
    @Volatile var instance: OX2AccessibilityService? = null
  }
}
