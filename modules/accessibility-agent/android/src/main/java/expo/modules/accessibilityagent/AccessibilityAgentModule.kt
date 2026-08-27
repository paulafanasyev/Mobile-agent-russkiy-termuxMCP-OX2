package expo.modules.accessibilityagent

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject

class AccessibilityAgentModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AccessibilityAgent")

    AsyncFunction("isEnabled") {
      OX2AccessibilityService.instance != null
    }

    AsyncFunction("getTree") { maxNodes: Int ->
      OX2AccessibilityService.instance?.snapshot(maxNodes.coerceIn(1, 1000)) ?: emptyList<Map<String, Any?>>()
    }

    AsyncFunction("perform") { actionJson: String ->
      val service = OX2AccessibilityService.instance
        ?: return@AsyncFunction mapOf("status" to "accessibility_disabled", "action" to "unknown")
      val json = JSONObject(actionJson)
      val action = mutableMapOf<String, Any?>()
      json.keys().forEach { key -> action[key] = json.get(key) }
      val type = json.optString("type", "unknown")
      mapOf("status" to service.perform(action), "action" to type)
    }
  }
}
