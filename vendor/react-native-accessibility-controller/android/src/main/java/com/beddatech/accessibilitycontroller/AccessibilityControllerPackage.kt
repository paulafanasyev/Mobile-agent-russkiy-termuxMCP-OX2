package com.beddatech.accessibilitycontroller

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class AccessibilityControllerPackage : TurboReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        if (name == AccessibilityControllerModule.NAME) AccessibilityControllerModule(reactContext) else null
    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        mapOf(AccessibilityControllerModule.NAME to ReactModuleInfo(
            AccessibilityControllerModule.NAME,
            AccessibilityControllerModule.NAME,
            false, false, false, true
        ))
    }
}
