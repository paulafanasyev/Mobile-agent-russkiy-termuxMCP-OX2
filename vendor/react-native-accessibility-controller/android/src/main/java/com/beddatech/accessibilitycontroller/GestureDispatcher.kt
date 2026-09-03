package com.beddatech.accessibilitycontroller

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

object GestureDispatcher {
    private const val TAP_DURATION_MS = 50L
    private const val LONG_PRESS_DURATION_MS = 1_000L
    private const val GESTURE_TIMEOUT_MS = 5_000L
    fun tap(x: Float, y: Float): Boolean { val path = Path().apply { moveTo(x, y) }; return dispatchGesture(GestureDescription.StrokeDescription(path, 0, TAP_DURATION_MS)) }
    fun longPress(x: Float, y: Float): Boolean { val path = Path().apply { moveTo(x, y) }; return dispatchGesture(GestureDescription.StrokeDescription(path, 0, LONG_PRESS_DURATION_MS)) }
    fun swipe(startX: Float, startY: Float, endX: Float, endY: Float, durationMs: Long): Boolean { val path = Path().apply { moveTo(startX, startY); lineTo(endX, endY) }; return dispatchGesture(GestureDescription.StrokeDescription(path, 0, durationMs.coerceAtLeast(1L))) }
    private fun dispatchGesture(stroke: GestureDescription.StrokeDescription): Boolean {
        val service = AccessibilityControllerService.instance ?: return false
        val gesture = GestureDescription.Builder().addStroke(stroke).build()
        val latch = CountDownLatch(1)
        var success = false
        val accepted = service.dispatchGesture(gesture, object : AccessibilityService.GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription) { success = true; latch.countDown() }
            override fun onCancelled(gestureDescription: GestureDescription) { latch.countDown() }
        }, null)
        if (!accepted) return false
        latch.await(GESTURE_TIMEOUT_MS, TimeUnit.MILLISECONDS)
        return success
    }
}
