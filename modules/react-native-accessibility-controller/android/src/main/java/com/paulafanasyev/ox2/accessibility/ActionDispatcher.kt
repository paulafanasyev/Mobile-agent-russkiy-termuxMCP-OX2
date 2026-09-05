package com.paulafanasyev.ox2.accessibility

import android.util.Log
import android.view.accessibility.AccessibilityNodeInfo

object ActionDispatcher {
    private const val TAG = "OX2BeddaAccessibility"

    fun tapNode(nodeId: String): Boolean = execute(nodeId) { node ->
        val result = node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        Log.i(TAG, "tapNode ACTION_CLICK result=$result nodeId=$nodeId class=${node.className} clickable=${node.isClickable} enabled=${node.isEnabled}")
        result
    }

    private fun execute(nodeId: String, action: (AccessibilityNodeInfo) -> Boolean): Boolean {
        val colon = nodeId.indexOf(':')
        if (colon < 0) {
            Log.i(TAG, "tapNode execute false reason=invalid_node_id nodeId=$nodeId")
            return false
        }
        val windowId = nodeId.substring(0, colon).toIntOrNull()
        if (windowId == null) {
            Log.i(TAG, "tapNode execute false reason=invalid_window_id nodeId=$nodeId")
            return false
        }
        val identifier = nodeId.substring(colon + 1)
        val service = OX2BeddaAccessibilityService.instance
        if (service == null) {
            Log.i(TAG, "tapNode execute false reason=service_null nodeId=$nodeId")
            return false
        }
        val root = service.rootInActiveWindow
        if (root == null) {
            Log.i(TAG, "tapNode execute false reason=root_null nodeId=$nodeId")
            return false
        }
        return try {
            find(root, windowId, identifier, action).also { result ->
                if (!result) Log.i(TAG, "tapNode execute false reason=find_miss windowId=$windowId id=$identifier nodeId=$nodeId")
            }
        } finally { @Suppress("DEPRECATION") root.recycle() }
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
