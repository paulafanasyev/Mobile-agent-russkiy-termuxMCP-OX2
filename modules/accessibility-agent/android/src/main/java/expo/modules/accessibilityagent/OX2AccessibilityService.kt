package expo.modules.accessibilityagent

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.graphics.Rect
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class OX2AccessibilityService : AccessibilityService() {
  override fun onServiceConnected() { super.onServiceConnected(); instance = this }
  override fun onAccessibilityEvent(event: AccessibilityEvent?) = Unit
  override fun onInterrupt() = Unit
  override fun onDestroy() { if (instance === this) instance = null; super.onDestroy() }

  fun snapshot(maxNodes: Int): List<Map<String, Any?>> {
    val limit = maxNodes.coerceIn(1, MAX_TREE_NODES)
    val root = rootInActiveWindow ?: return emptyList()
    return try { ArrayList<Map<String, Any?>>(limit).also { walk(root, "0", limit, it) } } finally { root.recycle() }
  }

  private fun walk(node: AccessibilityNodeInfo, id: String, maxNodes: Int, out: MutableList<Map<String, Any?>>) {
    if (out.size >= maxNodes) return
    val r = Rect(); node.getBoundsInScreen(r)
    out += mapOf("id" to id, "text" to node.text?.toString(), "contentDescription" to node.contentDescription?.toString(), "resourceId" to node.viewIdResourceName, "className" to node.className?.toString(), "packageName" to node.packageName?.toString(), "clickable" to node.isClickable, "editable" to node.isEditable, "enabled" to node.isEnabled, "bounds" to mapOf("left" to r.left, "top" to r.top, "right" to r.right, "bottom" to r.bottom))
    for (i in 0 until node.childCount) { if (out.size >= maxNodes) break; node.getChild(i)?.let { child -> try { walk(child, "$id.$i", maxNodes, out) } finally { child.recycle() } } }
  }

  fun find(query: Map<String, Any?>): List<Map<String, Any?>> {
    val root = rootInActiveWindow ?: return emptyList(); val out = ArrayList<Map<String, Any?>>()
    try { findWalk(root, "0", query, out, MAX_FIND_RESULTS) } finally { root.recycle() }
    return out
  }
  private fun findWalk(node: AccessibilityNodeInfo, id: String, query: Map<String, Any?>, out: MutableList<Map<String, Any?>>, limit: Int) {
    if (out.size >= limit) return
    val text=node.text?.toString(); val desc=node.contentDescription?.toString(); val res=node.viewIdResourceName; val pkg=node.packageName?.toString(); val needle=query["text"] as? String
    val match=(needle == null || text?.contains(needle, true) == true || desc?.contains(needle, true) == true) && ((query["resourceId"] as? String)?.let { res == it } ?: true) && ((query["packageName"] as? String)?.let { pkg == it } ?: true)
    if (match) { val r=Rect(); node.getBoundsInScreen(r); out += mapOf("id" to id,"text" to text,"contentDescription" to desc,"resourceId" to res,"packageName" to pkg,"bounds" to mapOf("left" to r.left,"top" to r.top,"right" to r.right,"bottom" to r.bottom)) }
    for (i in 0 until node.childCount) { if (out.size >= limit) break; node.getChild(i)?.let { child -> try { findWalk(child,"$id.$i",query,out,limit) } finally { child.recycle() } } }
  }

  fun perform(action: Map<String, Any?>): String = when (action["type"] as? String) {
    "back" -> if (performGlobalAction(GLOBAL_ACTION_BACK)) "executed" else "failed"
    "home" -> if (performGlobalAction(GLOBAL_ACTION_HOME)) "executed" else "failed"
    "recents" -> if (performGlobalAction(GLOBAL_ACTION_RECENTS)) "executed" else "failed"
    "press_key" -> pressGlobalAction(action["key"] as? String)
    "tap" -> gesture(action, false)
    "double_tap" -> doubleTap(action)
    "long_press" -> gesture(action, true)
    "swipe", "scroll", "drag" -> gesture(action, false)
    "type", "clear_text", "select_text", "copy", "paste" -> nodeAction(action)
    else -> "unsupported"
  }

  private fun pressGlobalAction(key: String?): String {
    val action = when (key?.lowercase()) {
      "back" -> GLOBAL_ACTION_BACK
      "home" -> GLOBAL_ACTION_HOME
      "recents" -> GLOBAL_ACTION_RECENTS
      "notifications" -> GLOBAL_ACTION_NOTIFICATIONS
      "quick_settings" -> GLOBAL_ACTION_QUICK_SETTINGS
      "power_dialog" -> GLOBAL_ACTION_POWER_DIALOG
      "lock_screen" -> if (android.os.Build.VERSION.SDK_INT >= 28) GLOBAL_ACTION_LOCK_SCREEN else return "unsupported"
      "headset_hook" -> if (android.os.Build.VERSION.SDK_INT >= 28) GLOBAL_ACTION_KEYCODE_HEADSETHOOK else return "unsupported"
      "take_screenshot" -> if (android.os.Build.VERSION.SDK_INT >= 30) GLOBAL_ACTION_TAKE_SCREENSHOT else return "unsupported"
      else -> return "unsupported_global_action"
    }
    return if (performGlobalAction(action)) "executed" else "failed"
  }

  private fun nodeAction(action: Map<String, Any?>): String {
    val nodeId=action["nodeId"] as? String ?: return "invalid_node_target"; val node=findNode(nodeId) ?: return "invalid_node_target"
    return try {
      if (!node.isEnabled) return "target_disabled"
      when (action["type"] as String) {
        "type", "clear_text" -> if (!node.isEditable) "target_not_editable" else { val b=Bundle(); b.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, if (action["type"] == "clear_text") "" else action["text"] as? String ?: return "invalid_action"); if (node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT,b)) "executed" else "failed" }
        "select_text" -> { if (!node.isEditable) "target_not_editable" else { val textLength=node.text?.length ?: 0; val b=Bundle(); b.putInt(AccessibilityNodeInfo.ACTION_ARGUMENT_SELECTION_START_INT,0); b.putInt(AccessibilityNodeInfo.ACTION_ARGUMENT_SELECTION_END_INT,textLength); if (node.performAction(AccessibilityNodeInfo.ACTION_SET_SELECTION,b)) "executed" else "failed" } }
        "copy" -> if (node.performAction(AccessibilityNodeInfo.ACTION_COPY)) "executed" else "failed"
        "paste" -> if (node.performAction(AccessibilityNodeInfo.ACTION_PASTE)) "executed" else "failed"
        else -> "unsupported"
      }
    } finally { node.recycle() }
  }

  private fun doubleTap(action: Map<String, Any?>): String { val first=gesture(action,false); if(first!="executed") return first; try { Thread.sleep(50) } catch(_:InterruptedException){Thread.currentThread().interrupt();return "failed"}; return gesture(action,false) }
  private fun findNode(id: String): AccessibilityNodeInfo? {
    if(!NODE_ID.matches(id)||id=="0") return null; val root=rootInActiveWindow ?: return null; var current=root
    try { for(part in id.split('.').drop(1)){val i=part.toIntOrNull() ?: return null; if(i !in 0 until current.childCount)return null; val next=current.getChild(i) ?: return null; if(current!==root)current.recycle(); current=next}; return current } catch(e:RuntimeException){current.recycle();throw e}
  }
  private fun gesture(action: Map<String,Any?>,longPress:Boolean):String { val x=(action["x"] as? Number)?.toFloat()?:return "invalid_action"; val y=(action["y"] as? Number)?.toFloat()?:return "invalid_action"; val w=resources.displayMetrics.widthPixels.toFloat(); val h=resources.displayMetrics.heightPixels.toFloat(); if(!inside(x,y,w,h))return "out_of_bounds"; val path=Path();path.moveTo(x,y);if(action["type"]=="swipe"||action["type"]=="scroll"||action["type"]=="drag"){val x2=(action["x2"] as? Number)?.toFloat()?:return "invalid_action";val y2=(action["y2"] as? Number)?.toFloat()?:return "invalid_action";if(!inside(x2,y2,w,h))return "out_of_bounds";path.lineTo(x2,y2)};val d=if(longPress)((action["durationMs"] as? Number)?.toLong()?:600L).coerceIn(400,3000) else ((action["durationMs"] as? Number)?.toLong()?:250L).coerceIn(50,2000);return if(dispatchGesture(GestureDescription.Builder().addStroke(GestureDescription.StrokeDescription(path,0,d)).build(),null,null))"executed" else "failed" }
  private fun inside(x:Float,y:Float,w:Float,h:Float)=x>=0&&y>=0&&x<w&&y<h
  companion object { private const val MAX_TREE_NODES=200; private const val MAX_FIND_RESULTS=50; private val NODE_ID=Regex("^0(?:\\.[0-9]+)+$"); @Volatile internal var instance:OX2AccessibilityService?=null }
}
