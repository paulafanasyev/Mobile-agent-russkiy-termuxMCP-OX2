package com.beddatech.accessibilitycontroller

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import com.facebook.react.bridge.ReadableMap

object OverlayManager {
    private val mainHandler = Handler(Looper.getMainLooper())
    private var rootLayout: LinearLayout? = null
    private var actionLabel: TextView? = null
    private var stepLabel: TextView? = null
    private var windowManager: WindowManager? = null
    var onStopRequested: (() -> Unit)? = null
    fun canDrawOverlays(context: Context): Boolean = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) Settings.canDrawOverlays(context) else true
    fun show(context: Context, config: ReadableMap, onResult: (error: String?) -> Unit) {
        if (!canDrawOverlays(context)) { onResult("SYSTEM_ALERT_WINDOW permission not granted"); return }
        val gravityStr = if (config.hasKey("gravity")) config.getString("gravity") ?: "top-right" else "top-right"
        val initialAction = if (config.hasKey("action")) config.getString("action") ?: "" else ""
        val initialStep = if (config.hasKey("stepCount")) config.getDouble("stepCount").toInt() else 0
        mainHandler.post { try { val wm = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager; val density = context.resources.displayMetrics.density; val windowType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE; val params = WindowManager.LayoutParams(WindowManager.LayoutParams.WRAP_CONTENT, WindowManager.LayoutParams.WRAP_CONTENT, windowType, WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN, PixelFormat.TRANSLUCENT).apply { gravity = parseGravity(gravityStr); x = (8 * density).toInt(); y = (56 * density).toInt() }; val layout = buildLayout(context, initialAction, initialStep); removeExisting(wm); wm.addView(layout, params); rootLayout = layout; windowManager = wm; onResult(null) } catch (e: Exception) { onResult(e.message ?: "showOverlay failed") } }
    }
    fun update(action: String, step: Int, onResult: (error: String?) -> Unit) { mainHandler.post { try { actionLabel?.text = action.ifEmpty { "Working..." }; stepLabel?.text = if (step > 0) "Step $step" else ""; onResult(null) } catch (e: Exception) { onResult(e.message ?: "updateOverlay failed") } } }
    fun hide(onResult: (error: String?) -> Unit) { mainHandler.post { try { removeExisting(windowManager); onResult(null) } catch (e: Exception) { onResult(e.message ?: "hideOverlay failed") } } }
    private fun buildLayout(context: Context, action: String, step: Int): LinearLayout { val density = context.resources.displayMetrics.density; val root = LinearLayout(context).apply { orientation = LinearLayout.VERTICAL; setPadding((10 * density).toInt(), (8 * density).toInt(), (10 * density).toInt(), (8 * density).toInt()); setBackgroundColor(0xE6161616.toInt()); minimumWidth = (180 * density).toInt() }; val topRow = LinearLayout(context).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }; val actionTv = TextView(context).apply { text = action.ifEmpty { "Working..." }; textSize = 12f; setTextColor(0xFFE5E5E5.toInt()); maxLines = 1; layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f) }; val stopBtn = Button(context).apply { text = "\u25A0"; textSize = 14f; setTextColor(0xFFFF6B6B.toInt()); setTypeface(null, Typeface.BOLD); minWidth = (32 * density).toInt(); minimumWidth = (32 * density).toInt(); minHeight = (24 * density).toInt(); minimumHeight = (24 * density).toInt(); setPadding((6 * density).toInt(), 0, (6 * density).toInt(), 0); setBackgroundColor(Color.TRANSPARENT); setOnClickListener { onStopRequested?.invoke() } }; topRow.addView(actionTv); topRow.addView(stopBtn); root.addView(topRow); val stepTv = TextView(context).apply { text = if (step > 0) "Step $step" else ""; textSize = 10f; setTextColor(0xFF888888.toInt()) }; root.addView(stepTv); actionLabel = actionTv; stepLabel = stepTv; return root }
    private fun removeExisting(wm: WindowManager?) { val view = rootLayout ?: return; try { (wm ?: windowManager)?.removeView(view) } catch (_: Exception) {}; rootLayout = null; actionLabel = null; stepLabel = null; windowManager = null }
    private fun parseGravity(gravity: String): Int = when (gravity.lowercase()) { "top-left" -> Gravity.TOP or Gravity.START; "top-right" -> Gravity.TOP or Gravity.END; "top-center" -> Gravity.TOP or Gravity.CENTER_HORIZONTAL; "bottom-left" -> Gravity.BOTTOM or Gravity.START; "bottom-right" -> Gravity.BOTTOM or Gravity.END; "bottom-center" -> Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL; "center" -> Gravity.CENTER; else -> Gravity.TOP or Gravity.END }
}
