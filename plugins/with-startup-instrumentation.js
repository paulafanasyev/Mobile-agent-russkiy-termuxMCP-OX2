const { withMainActivity } = require("expo/config-plugins");

const TAG = "OX2_STARTUP";

function injectOnce(source, needle, insertion, label, offset = 0) {
  if (source.includes(insertion)) return source;
  const index = source.indexOf(needle);
  if (index === -1) {
    throw new Error(`[startup-instrumentation] Missing MainActivity anchor: ${label}`);
  }
  const at = index + offset;
  return source.slice(0, at) + insertion + source.slice(at);
}

function withStartupInstrumentation(config) {
  return withMainActivity(config, (mod) => {
    const source = mod.modResults.contents;
    const isKotlin = mod.modResults.language === "kt" || mod.modResults.path.endsWith("MainActivity.kt");
    const isJava = mod.modResults.language === "java" || mod.modResults.path.endsWith("MainActivity.java");

    if (!isKotlin && !isJava) {
      throw new Error(`[startup-instrumentation] Unsupported MainActivity language: ${mod.modResults.path}`);
    }

    if (isKotlin) {
      let out = source;
      const classMatch = out.match(/class MainActivity[^\{]*\{/);
      if (!classMatch) throw new Error("[startup-instrumentation] Missing Kotlin MainActivity class body");
      out = injectOnce(
        out,
        classMatch[0],
        `\n  private var ox2FirstFrameLogged = false\n`,
        "Kotlin MainActivity class body",
        classMatch[0].length,
      );
      out = injectOnce(
        out,
        "override fun onCreate(savedInstanceState: Bundle?) {",
        `\n    android.util.Log.i("${TAG}", "ANDROID_ON_CREATE elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis())\n`,
        "onCreate",
        "override fun onCreate(savedInstanceState: Bundle?) {".length,
      );
      out = injectOnce(
        out,
        "override fun onResume() {",
        `\n    android.util.Log.i("${TAG}", "ANDROID_ON_RESUME elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis())\n    if (!ox2FirstFrameLogged) {\n      ox2FirstFrameLogged = true\n      android.view.Choreographer.getInstance().postFrameCallback { frameTimeNanos ->\n        android.util.Log.i("${TAG}", "ANDROID_FIRST_FRAME frameTimeNanos=" + frameTimeNanos + " elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis())\n      }\n    }\n`,
        "onResume",
        "override fun onResume() {".length,
      );
      out = injectOnce(
        out,
        "override fun reportFullyDrawn()",
        `\n    android.util.Log.i("${TAG}", "ANDROID_REPORT_FULLY_DRAWN elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis())\n`,
        "reportFullyDrawn",
        0,
      );
      if (!out.includes("ANDROID_REPORT_FULLY_DRAWN")) {
        const resumeClose = out.indexOf("override fun onResume() {");
        if (resumeClose === -1) throw new Error("[startup-instrumentation] Missing onResume for reportFullyDrawn fallback");
        const bodyStart = out.indexOf("\n", resumeClose) + 1;
        out = out.slice(0, bodyStart) + `    android.util.Log.i("${TAG}", "ANDROID_REPORT_FULLY_DRAWN elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis())\n` + out.slice(bodyStart);
      }
      mod.modResults.contents = out;
      return mod;
    }

    let out = source;
    const classMatch = out.match(/public class MainActivity[^\{]*\{/);
    if (!classMatch) throw new Error("[startup-instrumentation] Missing Java MainActivity class body");
    out = injectOnce(out, classMatch[0], `\n    private boolean ox2FirstFrameLogged = false;\n`, "Java MainActivity class body", classMatch[0].length);
    out = injectOnce(out, "protected void onCreate(Bundle savedInstanceState) {", `\n        android.util.Log.i("${TAG}", "ANDROID_ON_CREATE elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis());\n`, "onCreate", "protected void onCreate(Bundle savedInstanceState) {".length);
    out = injectOnce(out, "protected void onResume() {", `\n        android.util.Log.i("${TAG}", "ANDROID_ON_RESUME elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis());\n        if (!ox2FirstFrameLogged) {\n            ox2FirstFrameLogged = true;\n            android.view.Choreographer.getInstance().postFrameCallback(frameTimeNanos -> android.util.Log.i("${TAG}", "ANDROID_FIRST_FRAME frameTimeNanos=" + frameTimeNanos + " elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis()));\n        }\n`, "onResume", "protected void onResume() {".length);
    if (!out.includes("ANDROID_REPORT_FULLY_DRAWN")) {
      out = injectOnce(out, "protected void onResume() {", `\n        android.util.Log.i("${TAG}", "ANDROID_REPORT_FULLY_DRAWN elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis());\n`, "reportFullyDrawn marker", "protected void onResume() {".length);
    }
    mod.modResults.contents = out;
    return mod;
  });
}

module.exports = withStartupInstrumentation;
