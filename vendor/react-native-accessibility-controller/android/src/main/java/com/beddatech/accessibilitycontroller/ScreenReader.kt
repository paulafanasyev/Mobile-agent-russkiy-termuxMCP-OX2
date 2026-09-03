package com.beddatech.accessibilitycontroller

import android.graphics.Rect
import android.view.accessibility.AccessibilityNodeInfo
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap

object ScreenReader {
    fun getTree(): WritableArray {
        val service = AccessibilityControllerService.instance ?: return Arguments.createArray()
        val root = service.rootInActiveWindow ?: return Arguments.createArray()
        return try { val result = Arguments.createArray(); result.pushMap(nodeToMap(root, root.windowId)); result } finally { @Suppress("DEPRECATION") root.recycle() }
    }
    fun getText(): String {
        val service = AccessibilityControllerService.instance ?: return ""
        val root = service.rootInActiveWindow ?: return ""
        return try { val sb = StringBuilder(); appendNodeText(root, sb, 0); sb.toString().trimEnd() } finally { @Suppress("DEPRECATION") root.recycle() }
    }
    private fun nodeToMap(node: AccessibilityNodeInfo, windowId: Int): WritableMap {
        val map = Arguments.createMap(); val viewId = node.viewIdResourceName; val nodeId = if (viewId != null) "$windowId:$viewId" else "$windowId:${System.identityHashCode(node)}"; map.putString("nodeId", nodeId); map.putString("className", node.className?.toString() ?: ""); val text = node.text?.toString(); if (text != null) map.putString("text", text) else map.putNull("text"); val cd = node.contentDescription?.toString(); if (cd != null) map.putString("contentDescription", cd) else map.putNull("contentDescription"); val rect = Rect(); node.getBoundsInScreen(rect); map.putMap("bounds", Arguments.createMap().apply { putInt("left", rect.left); putInt("top", rect.top); putInt("right", rect.right); putInt("bottom", rect.bottom) }); map.putBoolean("isClickable", node.isClickable); map.putBoolean("isScrollable", node.isScrollable); map.putBoolean("isEditable", node.isEditable); map.putBoolean("isFocused", node.isFocused); map.putBoolean("isChecked", node.isChecked); map.putBoolean("isEnabled", node.isEnabled); val actions = Arguments.createArray(); node.actionList.forEach { action -> toJsAction(action.id)?.let { actions.pushString(it) } }; map.putArray("availableActions", actions); val children = Arguments.createArray(); for (i in 0 until node.childCount) { val child = node.getChild(i) ?: continue; try { children.pushMap(nodeToMap(child, windowId)) } finally { @Suppress("DEPRECATION") child.recycle() } }; map.putArray("children", children); return map
    }
    private fun appendNodeText(node: AccessibilityNodeInfo, sb: StringBuilder, depth: Int) {
        val className = node.className?.toString()?.substringAfterLast('.') ?: "View"; val label = node.text?.toString()?.ifBlank { null } ?: node.contentDescription?.toString()?.ifBlank { null }; val rect = Rect(); node.getBoundsInScreen(rect); if (!rect.isEmpty) { val indent = "  ".repeat(depth); sb.append(indent).append("[$className]"); if (label != null) sb.append(" \"$label\""); val flags = buildList { if (node.isClickable) add("clickable"); if (node.isScrollable) add("scrollable"); if (node.isEditable) add("editable"); if (node.isFocused) add("focused"); if (node.isChecked) add("checked"); if (!node.isEnabled) add("disabled") }; if (flags.isNotEmpty()) sb.append(" (${flags.joinToString(", ")})"); sb.append(" [${rect.left},${rect.top}-${rect.right},${rect.bottom]"); sb.append('\n') }; val childDepth = if (rect.isEmpty) depth else depth + 1; for (i in 0 until node.childCount) { val child = node.getChild(i) ?: continue; try { appendNodeText(child, sb, childDepth) } finally { @Suppress("DEPRECATION") child.recycle() } }
    }
    private fun toJsAction(actionId: Int): String? = when (actionId) { AccessibilityNodeInfo.ACTION_CLICK -> "click"; AccessibilityNodeInfo.ACTION_LONG_CLICK -> "longClick"; AccessibilityNodeInfo.ACTION_SCROLL_FORWARD -> "scrollForward"; AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD -> "scrollBackward"; AccessibilityNodeInfo.ACTION_SET_TEXT -> "setText"; AccessibilityNodeInfo.ACTION_CLEAR_FOCUS -> "clearFocus"; AccessibilityNodeInfo.ACTION_SELECT -> "select"; else -> null }
}
