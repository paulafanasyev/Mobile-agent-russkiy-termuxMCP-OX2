package com.beddatech.accessibilitycontroller

import android.os.Build
import android.os.Bundle
import android.view.accessibility.AccessibilityNodeInfo

object ActionDispatcher {
    fun performAction(nodeId: String, action: String): Boolean {
        if (action == "imeEnter") return executeOnNode(nodeId) { node -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) { @Suppress("NewApi") node.performAction(AccessibilityNodeInfo.AccessibilityAction.ACTION_IME_ENTER.id) } else node.performAction(AccessibilityNodeInfo.ACTION_CLICK) }
        if (action == "clearText") return setNodeText(nodeId, "")
        val androidActionId = jsActionToAndroid(action) ?: return false
        return executeOnNode(nodeId) { node -> node.performAction(androidActionId) }
    }
    fun tapNode(nodeId: String): Boolean = executeOnNode(nodeId) { node -> node.performAction(AccessibilityNodeInfo.ACTION_CLICK) }
    fun longPressNode(nodeId: String): Boolean = executeOnNode(nodeId) { node -> node.performAction(AccessibilityNodeInfo.ACTION_LONG_CLICK) }
    fun setNodeText(nodeId: String, text: String): Boolean = executeOnNode(nodeId) { node -> val args = Bundle().apply { putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text) }; node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args) }
    fun scrollNode(nodeId: String, direction: String): Boolean {
        val action = when (direction) { "up", "left" -> AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD; "down", "right" -> AccessibilityNodeInfo.ACTION_SCROLL_FORWARD; else -> return false }
        return executeOnNode(nodeId) { node -> node.performAction(action) }
    }
    private fun executeOnNode(nodeId: String, block: (AccessibilityNodeInfo) -> Boolean): Boolean {
        val colonIdx = nodeId.indexOf(':'); if (colonIdx < 0) return false
        val windowId = nodeId.substring(0, colonIdx).toIntOrNull() ?: return false
        val identifier = nodeId.substring(colonIdx + 1)
        val service = AccessibilityControllerService.instance ?: return false
        val root = service.rootInActiveWindow ?: return false
        return try { findAndExecute(root, windowId, identifier, block) } finally { @Suppress("DEPRECATION") root.recycle() }
    }
    private fun findAndExecute(node: AccessibilityNodeInfo, targetWindowId: Int, identifier: String, block: (AccessibilityNodeInfo) -> Boolean): Boolean {
        if (node.windowId == targetWindowId && matchesIdentifier(node, identifier)) return block(node)
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            try { if (findAndExecute(child, targetWindowId, identifier, block)) return true }
            finally { @Suppress("DEPRECATION") child.recycle() }
        }
        return false
    }
    private fun matchesIdentifier(node: AccessibilityNodeInfo, identifier: String): Boolean {
        val viewId = node.viewIdResourceName
        return if (viewId != null) viewId == identifier else System.identityHashCode(node).toString() == identifier
    }
    private fun jsActionToAndroid(action: String): Int? = when (action) {
        "click" -> AccessibilityNodeInfo.ACTION_CLICK
        "longClick" -> AccessibilityNodeInfo.ACTION_LONG_CLICK
        "scrollForward" -> AccessibilityNodeInfo.ACTION_SCROLL_FORWARD
        "scrollBackward" -> AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
        "clearFocus" -> AccessibilityNodeInfo.ACTION_CLEAR_FOCUS
        "select" -> AccessibilityNodeInfo.ACTION_SELECT
        else -> null
    }
}
