package com.paulafanasyev.ox2.accessibility

import android.graphics.Rect
import android.view.accessibility.AccessibilityNodeInfo
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap

object ScreenReader {
    fun getTree(): WritableArray {
        val service = OX2BeddaAccessibilityService.instance ?: return Arguments.createArray()
        val root = service.rootInActiveWindow ?: return Arguments.createArray()
        return try {
            Arguments.createArray().apply { pushMap(nodeToMap(root, root.windowId)) }
        } finally {
            @Suppress("DEPRECATION") root.recycle()
        }
    }

    private fun nodeToMap(node: AccessibilityNodeInfo, windowId: Int): WritableMap {
        val map = Arguments.createMap()
        val viewId = node.viewIdResourceName
        val id = if (viewId != null) "$windowId:$viewId" else "$windowId:${System.identityHashCode(node)}"
        map.putString("nodeId", id)
        map.putString("className", node.className?.toString() ?: "")
        node.text?.toString()?.let { map.putString("text", it) } ?: map.putNull("text")
        node.contentDescription?.toString()?.let { map.putString("contentDescription", it) } ?: map.putNull("contentDescription")
        val rect = Rect()
        node.getBoundsInScreen(rect)
        map.putMap("bounds", Arguments.createMap().apply {
            putInt("left", rect.left); putInt("top", rect.top); putInt("right", rect.right); putInt("bottom", rect.bottom)
        })
        map.putBoolean("isClickable", node.isClickable)
        map.putBoolean("isScrollable", node.isScrollable)
        map.putBoolean("isEditable", node.isEditable)
        map.putBoolean("isFocused", node.isFocused)
        map.putBoolean("isChecked", node.isChecked)
        map.putBoolean("isEnabled", node.isEnabled)
        val children = Arguments.createArray()
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            try { children.pushMap(nodeToMap(child, windowId)) } finally { @Suppress("DEPRECATION") child.recycle() }
        }
        map.putArray("children", children)
        return map
    }
}
