package com.paulafanasyev.ox2.accessibility

import android.os.Bundle
import android.view.accessibility.AccessibilityNodeInfo

object ActionDispatcher {
    fun tapNode(nodeId: String): Boolean = execute(nodeId) { it.performAction(AccessibilityNodeInfo.ACTION_CLICK) }

    private fun execute(nodeId: String, action: (AccessibilityNodeInfo) -> Boolean): Boolean {
        val colon = nodeId.indexOf(':')
        if (colon < 0) return false
        val windowId = nodeId.substring(0, colon).toIntOrNull() ?: return false
        val identifier = nodeId.substring(colon + 1)
        val service = OX2BeddaAccessibilityService.instance ?: return false
        val root = service.rootInActiveWindow ?: return false
        return try { find(root, windowId, identifier, action) } finally { @Suppress("DEPRECATION") root.recycle() }
    }

    private fun find(node: AccessibilityNodeInfo, windowId: Int, identifier: String, action: (AccessibilityNodeInfo) -> Boolean): Boolean {
        val id = node.viewIdResourceName
        if (node.windowId == windowId && (id == identifier || (id == null && System.identityHashCode(node).toString() == identifier))) return action(node)
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            try { if (find(child, windowId, identifier, action)) return true }
            finally { @Suppress("DEPRECATION") child.recycle() }
        }
        return false
    }
}
