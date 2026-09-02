package com.paulafanasyev.ox2.accessibility

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

object GestureDispatcher {
    fun tap(x: Float, y: Float): Boolean {
        val path = Path().apply { moveTo(x, y) }
        return dispatch(GestureDescription.StrokeDescription(path, 0, 50L))
    }

    private fun dispatch(stroke: GestureDescription.StrokeDescription): Boolean {
        val service = OX2BeddaAccessibilityService.instance ?: return false
        val latch = CountDownLatch(1)
        var success = false
        val accepted = service.dispatchGesture(
            GestureDescription.Builder().addStroke(stroke).build(),
            object : AccessibilityService.GestureResultCallback() {
                override fun onCompleted(gestureDescription: GestureDescription) { success = true; latch.countDown() }
                override fun onCancelled(gestureDescription: GestureDescription) { latch.countDown() }
            },
            null,
        )
        if (!accepted) return false
        latch.await(5, TimeUnit.SECONDS)
        return success
    }
}
