package com.paulafanasyev.ox2.accessibility

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AccessibilityControllerLegacyModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    companion object { const val NAME = "AccessibilityControllerLegacy" }

    override fun getName(): String = NAME

    @ReactMethod
    fun isServiceEnabled(promise: Promise) {
        try {
            val enabled = Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
            val component = ComponentName(context, OX2BeddaAccessibilityService::class.java).flattenToString()
            promise.resolve(enabled?.split(':')?.contains(component) == true)
        } catch (e: Exception) { promise.reject("ERR_SERVICE_CHECK", e.message, e) }
    }

    @ReactMethod
    fun requestServiceEnable(promise: Promise) {
        try {
            context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            promise.resolve(null)
        } catch (e: Exception) { promise.reject("ERR_SETTINGS_OPEN", e.message, e) }
    }

    @ReactMethod
    fun getAccessibilityTree(promise: Promise) {
        try { promise.resolve(ScreenReader.getTree()) }
        catch (e: Exception) { promise.reject("ERR_GET_TREE", e.message, e) }
    }

    @ReactMethod
    fun tapNode(nodeId: String, promise: Promise) {
        try { promise.resolve(ActionDispatcher.tapNode(nodeId)) }
        catch (e: Exception) { promise.reject("ERR_TAP_NODE", e.message, e) }
    }

    @ReactMethod
    fun tap(x: Double, y: Double, promise: Promise) {
        try { promise.resolve(GestureDispatcher.tap(x.toFloat(), y.toFloat())) }
        catch (e: Exception) { promise.reject("ERR_TAP", e.message, e) }
    }

    @ReactMethod
    fun globalAction(action: String, promise: Promise) {
        try {
            val service = OX2BeddaAccessibilityService.instance ?: run { promise.resolve(false); return }
            val id = when (action) {
                "home" -> android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_HOME
                "back" -> android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK
                "recents" -> android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_RECENTS
                else -> { promise.resolve(false); return }
            }
            promise.resolve(service.performGlobalAction(id))
        } catch (e: Exception) { promise.reject("ERR_GLOBAL_ACTION", e.message, e) }
    }

    @ReactMethod
    fun openApp(packageName: String, promise: Promise) {
        try {
            val intent = context.packageManager.getLaunchIntentForPackage(packageName)
            if (intent == null) { promise.resolve(false); return }
            context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            promise.resolve(true)
        } catch (e: Exception) { promise.reject("ERR_OPEN_APP", e.message, e) }
    }
}
