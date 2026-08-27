package expo.modules.systemhands

import android.content.Context
import android.media.AudioManager
import android.provider.Settings
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SystemHandsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SystemHands")

    AsyncFunction("setVolume") { stream: Int, level: Int ->
      val context = appContext.reactContext ?: error("Android context unavailable")
      val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val streamType = stream.coerceIn(0, 5)
      val max = audio.getStreamMaxVolume(streamType)
      val value = level.coerceIn(0, max)
      audio.setStreamVolume(streamType, value, 0)
      mapOf("status" to "changed", "stream" to streamType, "level" to value, "max" to max)
    }

    AsyncFunction("getVolume") { stream: Int ->
      val context = appContext.reactContext ?: error("Android context unavailable")
      val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val streamType = stream.coerceIn(0, 5)
      mapOf("level" to audio.getStreamVolume(streamType), "max" to audio.getStreamMaxVolume(streamType))
    }

    AsyncFunction("setBrightness") { value: Double ->
      val context = appContext.reactContext ?: error("Android context unavailable")
      if (!Settings.System.canWrite(context)) return@AsyncFunction mapOf("status" to "permission_required")
      val normalized = value.coerceIn(0.0, 1.0)
      Settings.System.putInt(context.contentResolver, Settings.System.SCREEN_BRIGHTNESS, (normalized * 255.0).toInt())
      mapOf("status" to "changed", "value" to normalized)
    }

    AsyncFunction("getBrightness") {
      val context = appContext.reactContext ?: error("Android context unavailable")
      val raw = Settings.System.getInt(context.contentResolver, Settings.System.SCREEN_BRIGHTNESS, 128)
      mapOf("value" to raw / 255.0, "raw" to raw)
    }

    AsyncFunction("toggleFlashlight") { enabled: Boolean ->
      val context = appContext.reactContext ?: error("Android context unavailable")
      val camera = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
      val cameraId = camera.cameraIdList.firstOrNull { id ->
        camera.getCameraCharacteristics(id).get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
      } ?: return@AsyncFunction mapOf("status" to "unavailable", "enabled" to enabled)
      try {
        camera.setTorchMode(cameraId, enabled)
        mapOf("status" to "changed", "enabled" to enabled)
      } catch (e: SecurityException) {
        mapOf("status" to "permission_required", "enabled" to enabled)
      }
    }
  }
}
