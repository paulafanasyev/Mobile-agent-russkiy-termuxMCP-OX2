package expo.modules.accessibilityagent

import android.graphics.Bitmap
import android.os.Build
import android.view.Display
import androidx.annotation.RequiresApi
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

@RequiresApi(Build.VERSION_CODES.R)
object HandsScreenshot {
  fun capture(service: OX2AccessibilityService): Map<String, Any?> {
    val lock = CountDownLatch(1)
    var result: Map<String, Any?> = mapOf("status" to "screenshot_failed", "verified" to false)
    val executor = Executors.newSingleThreadExecutor()
    try {
      service.takeScreenshot(
        Display.DEFAULT_DISPLAY,
        executor,
        object : android.accessibilityservice.AccessibilityService.TakeScreenshotCallback {
          override fun onSuccess(screenshot: android.accessibilityservice.AccessibilityService.ScreenshotResult) {
            try {
              val bitmap = Bitmap.wrapHardwareBuffer(screenshot.hardwareBuffer, screenshot.colorSpace)
              if (bitmap == null) {
                result = mapOf("status" to "screenshot_failed", "verified" to false, "reason" to "bitmap_unavailable")
              } else {
                val dir = File(service.cacheDir, "hands-screenshots").apply { mkdirs() }
                val file = File(dir, "hands-${System.currentTimeMillis()}.png")
                FileOutputStream(file).use { out -> bitmap.compress(Bitmap.CompressFormat.PNG, 100, out) }
                bitmap.recycle()
                result = if (file.exists() && file.length() > 0L) {
                  mapOf("status" to "screenshot_verified", "verified" to true, "path" to file.absolutePath, "sizeBytes" to file.length())
                } else mapOf("status" to "screenshot_unverified", "verified" to false, "path" to file.absolutePath)
              }
            } catch (t: Throwable) {
              result = mapOf("status" to "screenshot_failed", "verified" to false, "reason" to (t.message ?: t.javaClass.simpleName))
            } finally {
              screenshot.hardwareBuffer.close()
              lock.countDown()
            }
          }
          override fun onFailure(errorCode: Int) {
            result = mapOf("status" to "screenshot_failed", "verified" to false, "errorCode" to errorCode)
            lock.countDown()
          }
        }
      )
      lock.await(10, TimeUnit.SECONDS)
      return result
    } finally {
      executor.shutdownNow()
    }
  }
}
