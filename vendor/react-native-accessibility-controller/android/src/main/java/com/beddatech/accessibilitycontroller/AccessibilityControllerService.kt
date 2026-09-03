package com.beddatech.accessibilitycontroller

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.view.accessibility.AccessibilityEvent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.lang.ref.WeakReference

class AccessibilityControllerService : AccessibilityService() {
    companion object {
        const val EVENT_A11Y = "onAccessibilityEvent"
        const val EVENT_WINDOW = "onWindowChange"
        @Volatile var instance: AccessibilityControllerService? = null
            private set
        @Volatile var reactContextRef: WeakReference<ReactApplicationContext>? = null
    }
    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        serviceInfo = serviceInfo.apply {
            eventTypes = AccessibilityEvent.TYPES_ALL_MASK
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = flags or AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS or AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS
            notificationTimeout = 100
        }
    }
    override fun onDestroy() { super.onDestroy(); instance = null }
    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        event ?: return
        val context = reactContextRef?.get() ?: return
        if (!context.hasActiveReactInstance()) return
        val params = Arguments.createMap().apply {
            putString("eventType", AccessibilityEvent.eventTypeToString(event.eventType))
            putString("packageName", event.packageName?.toString() ?: "")
            putString("className", event.className?.toString() ?: "")
            val text = event.text?.mapNotNull { it?.toString() }?.joinToString(" ")
            if (text != null) putString("text", text) else putNull("text")
            putDouble("timestamp", event.eventTime.toDouble())
        }
        emit(context, EVENT_A11Y, params)
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED || event.eventType == AccessibilityEvent.TYPE_WINDOWS_CHANGED) {
            val window = Arguments.createMap().apply {
                putString("packageName", event.packageName?.toString() ?: "")
                putString("className", event.className?.toString() ?: "")
                val title = event.text?.mapNotNull { it?.toString() }?.joinToString(" ")
                if (title != null) putString("title", title) else putNull("title")
                putBoolean("isActive", true)
            }
            emit(context, EVENT_WINDOW, window)
        }
    }
    override fun onInterrupt() {}
    private fun emit(context: ReactApplicationContext, eventName: String, params: com.facebook.react.bridge.WritableMap) {
        context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(eventName, params)
    }
}
