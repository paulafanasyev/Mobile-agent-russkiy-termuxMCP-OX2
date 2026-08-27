package expo.modules.systemhands

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.os.Build
import android.provider.DocumentsContract
import android.provider.MediaStore
import android.provider.Settings
import android.view.KeyEvent
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.net.Uri
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.ByteArrayOutputStream
import java.nio.charset.StandardCharsets

class SystemHandsModule : Module() {
  private var cameraLauncher: ActivityResultLauncher<Uri>? = null
  private var pendingCameraUri: Uri? = null
  private var pendingCameraPromise: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("SystemHands")

    RegisterActivityContracts {
      cameraLauncher = registerForActivityResult(ActivityResultContracts.TakePicture()) { success ->
        val context = appContext.reactContext
        val uri = pendingCameraUri
        val promise = pendingCameraPromise
        pendingCameraUri = null
        pendingCameraPromise = null
        if (context == null || uri == null || promise == null) return@registerForActivityResult
        try {
          if (!success) {
            context.contentResolver.delete(uri, null, null)
            promise.resolve(mapOf("status" to "camera_cancelled", "verified" to false, "uri" to uri.toString()))
            return@registerForActivityResult
          }
          if (Build.VERSION.SDK_INT >= 29) {
            val values = ContentValues().apply { put(MediaStore.Images.Media.IS_PENDING, 0) }
            context.contentResolver.update(uri, values, null, null)
          }
          val size = context.contentResolver.openFileDescriptor(uri, "r")?.use { it.statSize } ?: -1L
          promise.resolve(if (size > 0L) mapOf("status" to "camera_verified", "verified" to true, "uri" to uri.toString(), "sizeBytes" to size) else mapOf("status" to "camera_unverified", "verified" to false, "uri" to uri.toString(), "sizeBytes" to size))
        } catch (t: Throwable) {
          promise.resolve(mapOf("status" to "camera_failed", "verified" to false, "uri" to uri.toString(), "reason" to (t.message ?: t.javaClass.simpleName)))
        }
      }
    }

    AsyncFunction("setVolume") { stream: Int, level: Int ->
      val context = appContext.reactContext ?: error("Android context unavailable")
      val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val streamType = stream.coerceIn(0, 5); val max = audio.getStreamMaxVolume(streamType); val value = level.coerceIn(0, max)
      audio.setStreamVolume(streamType, value, 0); mapOf("status" to "changed", "stream" to streamType, "level" to value, "max" to max)
    }
    AsyncFunction("getVolume") { stream: Int ->
      val context = appContext.reactContext ?: error("Android context unavailable"); val audio = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      val streamType = stream.coerceIn(0, 5); mapOf("level" to audio.getStreamVolume(streamType), "max" to audio.getStreamMaxVolume(streamType))
    }
    AsyncFunction("setBrightness") { value: Double ->
      val context = appContext.reactContext ?: error("Android context unavailable")
      if (!Settings.System.canWrite(context)) return@AsyncFunction mapOf("status" to "permission_required")
      val normalized = value.coerceIn(0.0, 1.0); Settings.System.putInt(context.contentResolver, Settings.System.SCREEN_BRIGHTNESS, (normalized * 255.0).toInt()); mapOf("status" to "changed", "value" to normalized)
    }
    AsyncFunction("getBrightness") { val context = appContext.reactContext ?: error("Android context unavailable"); val raw = Settings.System.getInt(context.contentResolver, Settings.System.SCREEN_BRIGHTNESS, 128); mapOf("value" to raw / 255.0, "raw" to raw) }
    AsyncFunction("toggleFlashlight") { enabled: Boolean ->
      val context = appContext.reactContext ?: error("Android context unavailable"); val camera = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
      val cameraId = camera.cameraIdList.firstOrNull { id -> camera.getCameraCharacteristics(id).get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true } ?: return@AsyncFunction mapOf("status" to "unavailable", "enabled" to enabled)
      try { camera.setTorchMode(cameraId, enabled); mapOf("status" to "changed", "enabled" to enabled) } catch (_: SecurityException) { mapOf("status" to "permission_required", "enabled" to enabled) }
    }

    AsyncFunction("captureCamera") { promise: Promise ->
      val context = appContext.reactContext ?: return@AsyncFunction promise.resolve(mapOf("status" to "camera_failed", "verified" to false, "reason" to "Android context unavailable"))
      if (Build.VERSION.SDK_INT < 29) return@AsyncFunction promise.resolve(mapOf("status" to "unsupported_android_version", "verified" to false, "minimumApi" to 29))
      if (pendingCameraPromise != null) return@AsyncFunction promise.resolve(mapOf("status" to "camera_busy", "verified" to false))
      val values = ContentValues().apply { put(MediaStore.Images.Media.DISPLAY_NAME, "hands-${System.currentTimeMillis()}.jpg"); put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg"); put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/OX2"); put(MediaStore.Images.Media.IS_PENDING, 1) }
      val uri = context.contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values) ?: return@AsyncFunction promise.resolve(mapOf("status" to "camera_failed", "verified" to false, "reason" to "MediaStore insert failed"))
      pendingCameraUri = uri; pendingCameraPromise = promise
      val activity = appContext.activityProvider?.currentActivity
      if (activity == null) { pendingCameraUri = null; pendingCameraPromise = null; context.contentResolver.delete(uri, null, null); return@AsyncFunction promise.resolve(mapOf("status" to "camera_failed", "verified" to false, "reason" to "Activity unavailable")) }
      activity.runOnUiThread { cameraLauncher?.launch(uri) ?: run { pendingCameraUri = null; pendingCameraPromise = null; context.contentResolver.delete(uri, null, null); promise.resolve(mapOf("status" to "camera_failed", "verified" to false, "reason" to "Camera launcher unavailable")) } }
    }

    AsyncFunction("sendMediaBroadcast") { action: String, keyCode: Int ->
      val context = appContext.reactContext ?: error("Android context unavailable")
      if (action != Intent.ACTION_MEDIA_BUTTON) return@AsyncFunction mapOf("status" to "unsupported_action", "verified" to false, "action" to action)
      val intent = Intent(Intent.ACTION_MEDIA_BUTTON).apply { putExtra(Intent.EXTRA_KEY_EVENT, KeyEvent(KeyEvent.ACTION_DOWN, keyCode)) }
      context.sendBroadcast(intent)
      context.sendBroadcast(Intent(Intent.ACTION_MEDIA_BUTTON).apply { putExtra(Intent.EXTRA_KEY_EVENT, KeyEvent(KeyEvent.ACTION_UP, keyCode)) })
      mapOf("status" to "broadcast_sent", "verified" to false, "action" to action, "keyCode" to keyCode)
    }

    AsyncFunction("readContent") { uriString: String, maxBytes: Int ->
      val context = appContext.reactContext ?: error("Android context unavailable"); val uri = Uri.parse(uriString)
      if (uri.scheme != "content") return@AsyncFunction mapOf("status" to "unsupported_uri", "verified" to false)
      try { val out = ByteArrayOutputStream(); context.contentResolver.openInputStream(uri)?.use { input -> val buf=ByteArray(8192); var total=0; while(total<maxBytes){ val n=input.read(buf,0,minOf(buf.size,maxBytes-total)); if(n<=0)break; out.write(buf,0,n); total+=n } } ?: return@AsyncFunction mapOf("status" to "read_failed", "verified" to false); val bytes=out.toByteArray(); mapOf("status" to "read_verified", "verified" to true, "content" to String(bytes, StandardCharsets.UTF_8), "sizeBytes" to bytes.size) } catch (t: Throwable) { mapOf("status" to "read_failed", "verified" to false, "reason" to (t.message ?: t.javaClass.simpleName)) }
    }
    AsyncFunction("writeContent") { uriString: String, content: String, append: Boolean ->
      val context = appContext.reactContext ?: error("Android context unavailable"); val uri=Uri.parse(uriString); if(uri.scheme!="content") return@AsyncFunction mapOf("status" to "unsupported_uri", "verified" to false)
      try { val existing=if(append) context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: ByteArray(0) else ByteArray(0); context.contentResolver.openOutputStream(uri,"wt")?.use { it.write(existing); it.write(content.toByteArray(StandardCharsets.UTF_8)) } ?: return@AsyncFunction mapOf("status" to "write_failed", "verified" to false); val after=context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: ByteArray(0); val expected=existing + content.toByteArray(StandardCharsets.UTF_8); mapOf("status" to if(after.contentEquals(expected)) "write_verified" else "write_unverified", "verified" to after.contentEquals(expected), "sizeBytes" to after.size) } catch (t: Throwable) { mapOf("status" to "write_failed", "verified" to false, "reason" to (t.message ?: t.javaClass.simpleName)) }
    }
    AsyncFunction("deleteContent") { uriString: String ->
      val context=appContext.reactContext ?: error("Android context unavailable"); val uri=Uri.parse(uriString); if(uri.scheme!="content") return@AsyncFunction mapOf("status" to "unsupported_uri", "verified" to false)
      try { val ok=DocumentsContract.deleteDocument(context.contentResolver,uri); mapOf("status" to if(ok) "delete_verified" else "delete_unverified", "verified" to ok) } catch (_: Throwable) { mapOf("status" to "delete_failed", "verified" to false) }
    }
    AsyncFunction("renameContent") { uriString: String, displayName: String ->
      val context=appContext.reactContext ?: error("Android context unavailable"); val uri=Uri.parse(uriString); if(uri.scheme!="content") return@AsyncFunction mapOf("status" to "unsupported_uri", "verified" to false)
      try { val renamed=DocumentsContract.renameDocument(context.contentResolver,uri,displayName); mapOf("status" to if(renamed!=null) "rename_verified" else "rename_unverified", "verified" to (renamed!=null), "uri" to (renamed ?: uri).toString()) } catch (_: Throwable) { mapOf("status" to "rename_failed", "verified" to false) }
    }
    AsyncFunction("moveContent") { sourceUriString: String, targetParentUriString: String ->
      val context=appContext.reactContext ?: error("Android context unavailable"); val source=Uri.parse(sourceUriString); val targetParent=Uri.parse(targetParentUriString)
      if(source.scheme!="content" || targetParent.scheme!="content") return@AsyncFunction mapOf("status" to "unsupported_uri", "verified" to false)
      try { val copied=DocumentsContract.copyDocument(context.contentResolver,source,targetParent) ?: return@AsyncFunction mapOf("status" to "move_failed", "verified" to false); val deleted=DocumentsContract.deleteDocument(context.contentResolver,source); mapOf("status" to if(deleted) "move_verified" else "move_unverified", "verified" to deleted, "destinationUri" to copied.toString()) } catch (_: Throwable) { mapOf("status" to "move_failed", "verified" to false) }
    }
  }
}
