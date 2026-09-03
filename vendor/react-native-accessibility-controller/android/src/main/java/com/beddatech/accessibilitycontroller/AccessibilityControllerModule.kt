package com.beddatech.accessibilitycontroller

import android.accessibilityservice.AccessibilityService
import android.annotation.SuppressLint
import android.app.Activity
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.provider.Settings
import android.util.Base64
import android.util.Log
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.turbomodule.core.interfaces.TurboModule
import java.io.ByteArrayOutputStream
import java.lang.ref.WeakReference
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

@ReactModule(name = AccessibilityControllerModule.NAME)
class AccessibilityControllerModule(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext), TurboModule, ActivityEventListener {
    companion object {
        const val NAME = "AccessibilityController"
        private const val MEDIA_PROJECTION_REQUEST_CODE = 0x4445_4654
    }
    private var mediaProjectionManager: MediaProjectionManager? = null
    private var mediaProjection: MediaProjection? = null
    private var pendingProjectionPromise: Promise? = null
    init {
        AccessibilityControllerService.reactContextRef = WeakReference(reactContext)
        OverlayManager.onStopRequested = {
            try { reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit("onOverlayStop", Arguments.createMap()) } catch (_: Exception) {}
        }
        reactContext.addActivityEventListener(this)
    }
    override fun getName(): String = NAME
    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != MEDIA_PROJECTION_REQUEST_CODE) return
        val promise = pendingProjectionPromise ?: return
        pendingProjectionPromise = null
        if (resultCode == Activity.RESULT_OK && data != null) {
            val mgr = mediaProjectionManager
            if (mgr == null) { promise.reject("ERR_NO_PROJECTION_MGR", "MediaProjectionManager lost"); return }
            try { mediaProjection = mgr.getMediaProjection(resultCode, data); promise.resolve(true) }
            catch (e: Exception) { promise.reject("ERR_PROJECTION_SETUP", "Failed to create MediaProjection", e) }
        } else promise.resolve(false)
    }
    override fun onNewIntent(intent: Intent) {}
    private fun requireService(promise: Promise): Unit? = if (AccessibilityControllerService.instance == null) { promise.reject("ERR_SERVICE_DISABLED", "AccessibilityService is not enabled"); null } else Unit
    @ReactMethod fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) {}
    @ReactMethod fun removeListeners(@Suppress("UNUSED_PARAMETER") count: Int) {}
    @ReactMethod fun getAccessibilityTree(promise: Promise) { try { if (AccessibilityControllerService.instance == null) { promise.reject("ERR_SERVICE_DISABLED", "AccessibilityService is not enabled"); return }; promise.resolve(ScreenReader.getTree()) } catch (e: Exception) { promise.reject("ERR_GET_TREE", "Failed to capture accessibility tree", e) } }
    @ReactMethod fun getScreenText(promise: Promise) { try { if (AccessibilityControllerService.instance == null) { promise.reject("ERR_SERVICE_DISABLED", "AccessibilityService is not enabled"); return }; promise.resolve(ScreenReader.getText()) } catch (e: Exception) { promise.reject("ERR_GET_TEXT", "Failed to capture screen text", e) } }
    @SuppressLint("NewApi") @ReactMethod fun takeScreenshot(promise: Promise) { if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) { promise.reject("ERR_API_LEVEL", "takeScreenshot requires Android 11 (API 30) or higher"); return }; requireService(promise) ?: return; captureScreenshotApi30(promise) }
    @RequiresApi(Build.VERSION_CODES.R) private fun captureScreenshotApi30(promise: Promise) { try { val service = AccessibilityControllerService.instance ?: return promise.reject("ERR_SERVICE_DISABLED", "AccessibilityService is not enabled"); val callbackIface = AccessibilityService.TakeScreenshotCallback::class.java; val proxy = java.lang.reflect.Proxy.newProxyInstance(callbackIface.classLoader, arrayOf(callbackIface)) { _, method, args -> when (method.name) { "onSuccess" -> extractAndResolveScreenshot(args?.get(0), promise); "onFailure" -> { val code = args?.get(0) as? Int ?: -1; promise.reject("ERR_SCREENSHOT_FAILED", "Screenshot failed: errorCode=$code") } }; null }; service.takeScreenshot(0, reactApplicationContext.mainExecutor, proxy as AccessibilityService.TakeScreenshotCallback) } catch (e: Exception) { promise.reject("ERR_SCREENSHOT", "takeScreenshot failed", e) } }
    private fun extractAndResolveScreenshot(screenshotObj: Any?, promise: Promise) { if (screenshotObj == null) { promise.reject("ERR_SCREENSHOT_NULL", "Screenshot callback received null"); return }; try { val hwBitmap: Bitmap = runCatching { screenshotObj.javaClass.getMethod("getHardwareBitmap").invoke(screenshotObj) as Bitmap }.getOrElse { screenshotObj.javaClass.getMethod("getBitmap").invoke(screenshotObj) as Bitmap }; val swBitmap = if (hwBitmap.config == Bitmap.Config.HARDWARE) hwBitmap.copy(Bitmap.Config.ARGB_8888, false) else hwBitmap; val baos = ByteArrayOutputStream(); swBitmap.compress(Bitmap.CompressFormat.PNG, 100, baos); val base64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP); if (swBitmap !== hwBitmap) swBitmap.recycle(); runCatching { (screenshotObj as? AutoCloseable)?.close() }; promise.resolve(base64) } catch (e: Exception) { promise.reject("ERR_SCREENSHOT_ENCODE", "Failed to encode screenshot", e) } }
    @ReactMethod fun performAction(nodeId: String, action: String, promise: Promise) { try { requireService(promise) ?: return; promise.resolve(ActionDispatcher.performAction(nodeId, action)) } catch (e: Exception) { promise.reject("ERR_PERFORM_ACTION", "performAction failed", e) } }
    @ReactMethod fun tapNode(nodeId: String, promise: Promise) { try { requireService(promise) ?: return; promise.resolve(ActionDispatcher.tapNode(nodeId)) } catch (e: Exception) { promise.reject("ERR_TAP_NODE", "tapNode failed", e) } }
    @ReactMethod fun longPressNode(nodeId: String, promise: Promise) { try { requireService(promise) ?: return; promise.resolve(ActionDispatcher.longPressNode(nodeId)) } catch (e: Exception) { promise.reject("ERR_LONG_PRESS_NODE", "longPressNode failed", e) } }
    @ReactMethod fun setNodeText(nodeId: String, text: String, promise: Promise) { try { requireService(promise) ?: return; promise.resolve(ActionDispatcher.setNodeText(nodeId, text)) } catch (e: Exception) { promise.reject("ERR_SET_NODE_TEXT", "setNodeText failed", e) } }
    @ReactMethod fun scrollNode(nodeId: String, direction: String, promise: Promise) { try { requireService(promise) ?: return; promise.resolve(ActionDispatcher.scrollNode(nodeId, direction)) } catch (e: Exception) { promise.reject("ERR_SCROLL_NODE", "scrollNode failed", e) } }
    @ReactMethod fun tap(x: Double, y: Double, promise: Promise) { try { requireService(promise) ?: return; promise.resolve(GestureDispatcher.tap(x.toFloat(), y.toFloat())) } catch (e: Exception) { promise.reject("ERR_TAP", "tap failed", e) } }
    @ReactMethod fun longPress(x: Double, y: Double, promise: Promise) { try { requireService(promise) ?: return; promise.resolve(GestureDispatcher.longPress(x.toFloat(), y.toFloat())) } catch (e: Exception) { promise.reject("ERR_LONG_PRESS", "longPress failed", e) } }
    @ReactMethod fun swipe(startX: Double, startY: Double, endX: Double, endY: Double, durationMs: Int, promise: Promise) { try { requireService(promise) ?: return; promise.resolve(GestureDispatcher.swipe(startX.toFloat(), startY.toFloat(), endX.toFloat(), endY.toFloat(), durationMs.toLong())) } catch (e: Exception) { promise.reject("ERR_SWIPE", "swipe failed", e) } }
    @ReactMethod fun globalAction(action: String, promise: Promise) { try { requireService(promise) ?: return; val service = AccessibilityControllerService.instance!!; val actionId = when (action) { "home" -> AccessibilityService.GLOBAL_ACTION_HOME; "back" -> AccessibilityService.GLOBAL_ACTION_BACK; "recents" -> AccessibilityService.GLOBAL_ACTION_RECENTS; "notifications" -> AccessibilityService.GLOBAL_ACTION_NOTIFICATIONS; "quickSettings" -> AccessibilityService.GLOBAL_ACTION_QUICK_SETTINGS; "powerDialog" -> AccessibilityService.GLOBAL_ACTION_POWER_DIALOG; else -> { promise.reject("ERR_UNKNOWN_ACTION", "Unknown global action: $action"); return } }; promise.resolve(service.performGlobalAction(actionId)) } catch (e: Exception) { promise.reject("ERR_GLOBAL_ACTION", "globalAction failed", e) } }
    @ReactMethod fun openApp(packageName: String, promise: Promise) { try { val intent = reactApplicationContext.packageManager.getLaunchIntentForPackage(packageName); if (intent == null) { promise.resolve(false); return }; intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); reactApplicationContext.startActivity(intent); promise.resolve(true) } catch (e: Exception) { promise.reject("ERR_OPEN_APP", "openApp failed", e) } }
    @ReactMethod fun getInstalledApps(promise: Promise) { try { val pm = reactApplicationContext.packageManager; val mainIntent = Intent(Intent.ACTION_MAIN).apply { addCategory(Intent.CATEGORY_LAUNCHER) }; val activities = pm.queryIntentActivities(mainIntent, 0); val result = Arguments.createArray(); for (info in activities) { val map = Arguments.createMap(); map.putString("packageName", info.activityInfo.packageName); map.putString("label", info.loadLabel(pm).toString()); result.pushMap(map) }; promise.resolve(result) } catch (e: Exception) { promise.reject("ERR_GET_INSTALLED_APPS", "getInstalledApps failed", e) } }
    @ReactMethod fun showOverlay(config: ReadableMap, promise: Promise) { OverlayManager.show(reactApplicationContext, config) { error -> if (error == null) promise.resolve(null) else promise.reject("ERR_OVERLAY_SHOW", error) } }
    @ReactMethod fun hideOverlay(promise: Promise) { OverlayManager.hide { error -> if (error == null) promise.resolve(null) else promise.reject("ERR_OVERLAY_HIDE", error) } }
    @ReactMethod fun updateOverlay(config: ReadableMap, promise: Promise) { val action = if (config.hasKey("action")) config.getString("action") ?: "" else ""; val step = if (config.hasKey("stepCount")) config.getDouble("stepCount").toInt() else 0; OverlayManager.update(action, step) { error -> if (error == null) promise.resolve(null) else promise.reject("ERR_OVERLAY_UPDATE", error) } }
    @ReactMethod fun isServiceEnabled(promise: Promise) { try { val context = reactApplicationContext; val enabled = Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES); val component = ComponentName(context, AccessibilityControllerService::class.java).flattenToString(); promise.resolve(enabled?.contains(component) == true) } catch (e: Exception) { promise.reject("ERR_SERVICE_CHECK", "Failed to read accessibility settings", e) } }
    @ReactMethod fun requestServiceEnable(promise: Promise) { try { val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }; reactApplicationContext.startActivity(intent); promise.resolve(null) } catch (e: Exception) { promise.reject("ERR_SETTINGS_OPEN", "Failed to open accessibility settings", e) } }
    @ReactMethod fun canDrawOverlays(promise: Promise) { try { promise.resolve(OverlayManager.canDrawOverlays(reactApplicationContext)) } catch (e: Exception) { promise.reject("ERR_OVERLAY_CHECK", "Failed to check overlay permission", e) } }
    @ReactMethod fun requestOverlayPermission(promise: Promise) { try { if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) { val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${reactApplicationContext.packageName}")); intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); reactApplicationContext.startActivity(intent) }; promise.resolve(null) } catch (e: Exception) { promise.reject("ERR_OVERLAY_PERMISSION", "Failed to open overlay permission settings", e) } }
    @ReactMethod fun requestMediaProjection(promise: Promise) { val activity = reactApplicationContext.currentActivity ?: run { promise.reject("ERR_NO_ACTIVITY", "No current activity"); return }; try { val mgr = activity.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager; mediaProjectionManager = mgr; pendingProjectionPromise = promise; @Suppress("DEPRECATION") activity.startActivityForResult(mgr.createScreenCaptureIntent(), MEDIA_PROJECTION_REQUEST_CODE) } catch (e: Exception) { pendingProjectionPromise = null; promise.reject("ERR_PROJECTION_INTENT", "Failed to start screen capture intent", e) } }
    @ReactMethod fun captureWithMediaProjection(promise: Promise) { val projection = mediaProjection ?: run { promise.reject("ERR_NO_PROJECTION", "MediaProjection not set up. Call requestMediaProjection() first."); return }; try { val dm = reactApplicationContext.resources.displayMetrics; val width = dm.widthPixels; val height = dm.heightPixels; val density = dm.densityDpi; val imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2); val captureThread = HandlerThread("deft-mp-capture"); captureThread.start(); val captureHandler = Handler(captureThread.looper); val virtualDisplayRef = AtomicReference<android.hardware.display.VirtualDisplay?>(null); val promiseSettled = AtomicBoolean(false); fun cleanup(vd: android.hardware.display.VirtualDisplay?) { runCatching { vd?.release() }; runCatching { imageReader.close() }; captureThread.quitSafely() }; imageReader.setOnImageAvailableListener({ reader -> if (!promiseSettled.compareAndSet(false, true)) return@setOnImageAvailableListener; val vd = virtualDisplayRef.get(); try { val image = reader.acquireLatestImage(); if (image == null) { cleanup(vd); promise.reject("ERR_NO_IMAGE", "No frame captured from virtual display"); return@setOnImageAvailableListener }; try { val plane = image.planes[0]; val buffer = plane.buffer; val rowStride = plane.rowStride; val pixStride = plane.pixelStride; val rowPad = rowStride - pixStride * width; val bmpWidth = width + rowPad / pixStride; val raw = Bitmap.createBitmap(bmpWidth, height, Bitmap.Config.ARGB_8888); raw.copyPixelsFromBuffer(buffer); val cropped = if (rowPad > 0) Bitmap.createBitmap(raw, 0, 0, width, height).also { raw.recycle() } else raw; val baos = ByteArrayOutputStream(); cropped.compress(Bitmap.CompressFormat.PNG, 100, baos); cropped.recycle(); val base64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP); cleanup(vd); promise.resolve(base64) } finally { image.close() } } catch (e: Exception) { cleanup(vd); promise.reject("ERR_CAPTURE_ENCODE", "Failed to encode captured frame", e) } }, captureHandler); val vd = projection.createVirtualDisplay("deft-mp-capture", width, height, density, DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR, imageReader.surface, null, null); virtualDisplayRef.set(vd); captureHandler.postDelayed({ if (promiseSettled.compareAndSet(false, true)) { cleanup(virtualDisplayRef.get()); promise.reject("ERR_CAPTURE_TIMEOUT", "No frame available within 8s") } }, 8_000L) } catch (e: Exception) { promise.reject("ERR_CAPTURE_SETUP", "captureWithMediaProjection setup failed", e) } }
    @ReactMethod fun releaseMediaProjection(promise: Promise) { try { mediaProjection?.stop(); mediaProjection = null; mediaProjectionManager = null; promise.resolve(null) } catch (e: Exception) { promise.reject("ERR_RELEASE_PROJECTION", "releaseMediaProjection failed", e) } }
}
