package com.beddatech.accessibilitycontroller

import android.graphics.Rect
import android.view.accessibility.AccessibilityNodeInfo
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap

/**
 * Reads the accessibility tree of the currently active window.
 *
 * Two outputs are provided:
 *   - [getTree] — full tree as a WritableArray (JSON-serialisable, sent to JS)
 *   - [getText] — compact, LLM-friendly text serialisation of the same tree
 *
 * Node IDs are formatted as "<windowId>:<viewIdHash>" where viewIdHash is the
 * resource name when available, otherwise the node's identityHashCode. These
 * IDs are stable within a single screen render and are used by ActionDispatcher
 * to look up nodes for tap/scroll/setText operations.
 */
object ScreenReader {

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Capture the full accessibility tree rooted at the active window root.
     * Returns an empty array when the service is not connected or no window
     * is in the foreground.
     */
    fun getTree(): WritableArray {
        val service = AccessibilityControllerService.instance
            ?: return Arguments.createArray()
        val root = service.rootInActiveWindow
            ?: return Arguments.createArray()
        return try {
            val result = Arguments.createArray()
            result.pushMap(nodeToMap(root, root.windowId))
            result
        } finally {
            @Suppress("DEPRECATION")
            root.recycle()
        }
    }

    /**
     * Serialise the accessibility tree into compact text suitable for LLM
     * prompts. Invisible / zero-area nodes are skipped to reduce noise.
     *
     * Output format (one line per visible node, indented by depth):
     * ```
     * [Button] "OK" (clickable) [100,200-300,400]
     *   [EditText] (editable, focused) [50,600-700,680]
     *   [TextView] "Hello, world" [50,700-700,730]
     * ```
     */
    fun getText(): String {
        val service = AccessibilityControllerService.instance
            ?: return ""
        val root = service.rootInActiveWindow
            ?: return ""
        return try {
            val sb = StringBuilder()
            appendNodeText(root, sb, 0)
            sb.toString().trimEnd()
        } finally {
            @Suppress("DEPRECATION")
            root.recycle()
        }
    }

    // -----------------------------------------------------------------------
    // Tree → WritableMap
    // -----------------------------------------------------------------------

    private fun nodeToMap(node: AccessibilityNodeInfo, windowId: Int): WritableMap {
        val map = Arguments.createMap()

        // Prefer the resource-name view ID for stability; fall back to
        // identity hash so we always produce a non-null string.
        val viewId = node.viewIdResourceName
        val nodeId = if (viewId != null) "$windowId:$viewId"
                     else "$windowId:${System.identityHashCode(node)}"
        map.putString("nodeId", nodeId)

        map.putString("className", node.className?.toString() ?: "")

        val text = node.text?.toString()
        if (text != null) map.putString("text", text) else map.putNull("text")

        val cd = node.contentDescription?.toString()
        if (cd != null) map.putString("contentDescription", cd)
        else map.putNull("contentDescription")

        // Bounds in screen coordinates
        val rect = Rect()
        node.getBoundsInScreen(rect)
        map.putMap("bounds", Arguments.createMap().apply {
            putInt("left", rect.left)
            putInt("top", rect.top)
            putInt("right", rect.right)
            putInt("bottom", rect.bottom)
        })

        map.putBoolean("isClickable", node.isClickable)
        map.putBoolean("isScrollable", node.isScrollable)
        map.putBoolean("isEditable", node.isEditable)
        map.putBoolean("isFocused", node.isFocused)
        map.putBoolean("isChecked", node.isChecked)
        map.putBoolean("isEnabled", node.isEnabled)

        // Available actions (mapped to the JS NodeAction string literals)
        val actions = Arguments.createArray()
        node.actionList.forEach { action ->
            toJsAction(action.id)?.let { actions.pushString(it) }
        }
        map.putArray("availableActions", actions)

        // Children (recursive)
        val children = Arguments.createArray()
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            try {
                children.pushMap(nodeToMap(child, windowId))
            } finally {
                @Suppress("DEPRECATION")
                child.recycle()
            }
        }
        map.putArray("children", children)

        return map
    }

    // -----------------------------------------------------------------------
    // Tree → compact text
    // -----------------------------------------------------------------------

    private fun appendNodeText(
        node: AccessibilityNodeInfo,
        sb: StringBuilder,
        depth: Int,
    ) {
        // Use the last segment of the class name for readability.
        val className = node.className?.toString()?.substringAfterLast('.') ?: "View"

        // Prefer text over contentDescription for the label.
        val label = node.text?.toString()?.ifBlank { null }
            ?: node.contentDescription?.toString()?.ifBlank { null }

        val rect = Rect()
        node.getBoundsInScreen(rect)

        // Skip invisible / zero-area nodes but still recurse into children,
        // because a container may have zero size while its children are visible.
        if (!rect.isEmpty) {
            val indent = "  ".repeat(depth)
            sb.append(indent).append("[$className]")
            if (label != null) sb.append(" \"$label\"")

            val flags = buildList {
                if (node.isClickable) add("clickable")
                if (node.isScrollable) add("scrollable")
                if (node.isEditable) add("editable")
                if (node.isFocused) add("focused")
                if (node.isChecked) add("checked")
                if (!node.isEnabled) add("disabled")
            }
            if (flags.isNotEmpty()) sb.append(" (${flags.joinToString(", ")})")
            sb.append(" [${rect.left},${rect.top}-${rect.right},${rect.bottom}]")
            sb.append('\n')
        }

        val childDepth = if (rect.isEmpty) depth else depth + 1
        for (i in 0 until node.childCount) {
            val child = node.getChild(i) ?: continue
            try {
                appendNodeText(child, sb, childDepth)
            } finally {
                @Suppress("DEPRECATION")
                child.recycle()
            }
        }
    }

    // -----------------------------------------------------------------------
    // Action ID → JS NodeAction string
    // -----------------------------------------------------------------------

    private fun toJsAction(actionId: Int): String? = when (actionId) {
        AccessibilityNodeInfo.ACTION_CLICK          -> "click"
        AccessibilityNodeInfo.ACTION_LONG_CLICK     -> "longClick"
        AccessibilityNodeInfo.ACTION_SCROLL_FORWARD -> "scrollForward"
        AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD -> "scrollBackward"
        AccessibilityNodeInfo.ACTION_SET_TEXT       -> "setText"
        AccessibilityNodeInfo.ACTION_CLEAR_FOCUS    -> "clearFocus"
        AccessibilityNodeInfo.ACTION_SELECT         -> "select"
        else                                        -> null
    }
}
