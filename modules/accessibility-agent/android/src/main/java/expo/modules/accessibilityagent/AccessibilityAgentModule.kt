package expo.modules.accessibilityagent

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject

class AccessibilityAgentModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AccessibilityAgent")
    AsyncFunction("isEnabled") { OX2AccessibilityService.instance != null }
    AsyncFunction("getTree") { maxNodes: Int -> OX2AccessibilityService.instance?.snapshot(maxNodes.coerceIn(1, HANDS_MAX_TREE_NODES)) ?: emptyList<Map<String, Any?>>() }
    AsyncFunction("find") { queryJson: String ->
      val service = OX2AccessibilityService.instance ?: return@AsyncFunction emptyList<Map<String, Any?>>()
      val json = try { JSONObject(queryJson) } catch (_: Exception) { return@AsyncFunction emptyList<Map<String, Any?>>() }
      val query = mutableMapOf<String, Any?>(); json.keys().forEach { k -> query[k] = json.get(k) }
      service.find(query)
    }
    AsyncFunction("perform") { actionJson: String ->
      val service = OX2AccessibilityService.instance ?: return@AsyncFunction mapOf("status" to "accessibility_disabled", "action" to "unknown")
      val json = try { JSONObject(actionJson) } catch (_: Exception) { return@AsyncFunction mapOf("status" to "invalid_json", "action" to "unknown") }
      val type = json.optString("type", "")
      if (type !in SUPPORTED_ACTIONS) return@AsyncFunction mapOf("status" to "unsupported", "action" to type.ifBlank { "unknown" })
      if (!validateAction(json, type, service)) return@AsyncFunction mapOf("status" to "invalid_action", "action" to type)
      val action = mutableMapOf<String, Any?>(); json.keys().forEach { key -> action[key] = json.get(key) }
      mapOf("status" to service.perform(action), "action" to type)
    }
  }

  private fun validateAction(json: JSONObject, type: String, service: OX2AccessibilityService): Boolean = when (type) {
    "back", "home", "recents" -> true
    "type" -> json.optString("text", "").length <= HANDS_MAX_TEXT_LENGTH && NODE_ID.matches(json.optString("nodeId", ""))
    "clear_text", "select_text", "copy", "paste" -> NODE_ID.matches(json.optString("nodeId", ""))
    "tap", "double_tap", "long_press" -> validPoint(json, "x", "y", service)
    "swipe", "scroll", "drag" -> validPoint(json, "x", "y", service) && validPoint(json, "x2", "y2", service)
    else -> false
  }

  private fun validPoint(json: JSONObject, xKey: String, yKey: String, service: OX2AccessibilityService): Boolean {
    val x=json.optDouble(xKey,Double.NaN); val y=json.optDouble(yKey,Double.NaN); val w=service.resources.displayMetrics.widthPixels.toDouble(); val h=service.resources.displayMetrics.heightPixels.toDouble()
    return x.isFinite() && y.isFinite() && x>=0 && y>=0 && x<w && y<h
  }
  companion object { private const val HANDS_MAX_TREE_NODES=200; private const val HANDS_MAX_TEXT_LENGTH=4096; private val SUPPORTED_ACTIONS=setOf("back","home","recents","tap","double_tap","long_press","swipe","scroll","drag","type","clear_text","select_text","copy","paste"); private val NODE_ID=Regex("^0(?:\\.[0-9]+)+$") }
}
