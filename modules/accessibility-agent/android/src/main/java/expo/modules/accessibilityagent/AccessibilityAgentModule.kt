package expo.modules.accessibilityagent

import android.content.Intent
import android.provider.Settings
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject

class AccessibilityAgentModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AccessibilityAgent")

    AsyncFunction("isEnabled") {
      val enabled = OX2AccessibilityService.instance != null
      Log.i(TAG, "LOG:HANDS_NATIVE_IS_ENABLED_RESULT enabled=$enabled")
      enabled
    }

    AsyncFunction("forensicLog") { message: String ->
      Log.i(TAG, message.take(1000))
      true
    }

    AsyncFunction("openAccessibilitySettings") {
      val context = appContext.reactContext
        ?: return@AsyncFunction false
      context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      })
      true
    }

    AsyncFunction("getTree") { maxNodes: Int ->
      Log.i(TAG, "LOG:HANDS_NATIVE_GET_TREE_START maxNodes=$maxNodes service=${OX2AccessibilityService.instance != null}")
      val result = OX2AccessibilityService.instance
        ?.snapshot(maxNodes.coerceIn(1, HANDS_MAX_TREE_NODES))
        ?: emptyList<Map<String, Any?>>()
      Log.i(TAG, "LOG:HANDS_NATIVE_GET_TREE_RESULT nodes=${result.size}")
      result
    }

    AsyncFunction("perform") { actionJson: String ->
      Log.i(TAG, "LOG:HANDS_NATIVE_PERFORM_START payloadLength=${actionJson.length}")
      val service = OX2AccessibilityService.instance
        ?: return@AsyncFunction mapOf("status" to "accessibility_disabled", "action" to "unknown")

      val json = try {
        JSONObject(actionJson)
      } catch (_: Exception) {
        Log.i(TAG, "LOG:HANDS_NATIVE_PERFORM_RESULT status=invalid_json")
        return@AsyncFunction mapOf("status" to "invalid_json", "action" to "unknown")
      }

      val type = json.optString("type", "")
      if (type !in SUPPORTED_ACTIONS) {
        Log.i(TAG, "LOG:HANDS_NATIVE_PERFORM_RESULT status=unsupported action=$type")
        return@AsyncFunction mapOf("status" to "unsupported", "action" to type.ifBlank { "unknown" })
      }

      if (!validateAction(json, type, service)) {
        Log.i(TAG, "LOG:HANDS_NATIVE_PERFORM_RESULT status=invalid_action action=$type")
        return@AsyncFunction mapOf("status" to "invalid_action", "action" to type)
      }

      val action = mutableMapOf<String, Any?>()
      json.keys().forEach { key -> action[key] = json.get(key) }
      val status = service.perform(action)
      Log.i(TAG, "LOG:HANDS_NATIVE_PERFORM_RESULT status=$status action=$type")
      mapOf("status" to status, "action" to type)
    }
  }

  private fun validateAction(json: JSONObject, type: String, service: OX2AccessibilityService): Boolean {
    return when (type) {
      "back", "home", "recents" -> true
      "type" -> {
        val text = json.optString("text", "")
        val nodeId = json.optString("nodeId", "")
        text.length <= HANDS_MAX_TEXT_LENGTH && NODE_ID.matches(nodeId)
      }
      "tap", "long_press" -> {
        val x = json.optDouble("x", Double.NaN)
        val y = json.optDouble("y", Double.NaN)
        val width = service.resources.displayMetrics.widthPixels.toDouble()
        val height = service.resources.displayMetrics.heightPixels.toDouble()
        x.isFinite() && y.isFinite() && x >= 0.0 && y >= 0.0 && x < width && y < height
      }
      "swipe" -> {
        val x = json.optDouble("x", Double.NaN)
        val y = json.optDouble("y", Double.NaN)
        val x2 = json.optDouble("x2", Double.NaN)
        val y2 = json.optDouble("y2", Double.NaN)
        val width = service.resources.displayMetrics.widthPixels.toDouble()
        val height = service.resources.displayMetrics.heightPixels.toDouble()
        listOf(x, y, x2, y2).all { it.isFinite() } &&
          x >= 0.0 && y >= 0.0 && x < width && y < height &&
          x2 >= 0.0 && y2 >= 0.0 && x2 < width && y2 < height
      }
      else -> false
    }
  }

  companion object {
    private const val TAG = "OX2Hands"
    private const val HANDS_MAX_TREE_NODES = 200
    private const val HANDS_MAX_TEXT_LENGTH = 4096
    private val SUPPORTED_ACTIONS = setOf("back", "home", "recents", "tap", "long_press", "swipe", "type")
    private val NODE_ID = Regex("^0(?:\\.[0-9]+)*$")
  }
}
