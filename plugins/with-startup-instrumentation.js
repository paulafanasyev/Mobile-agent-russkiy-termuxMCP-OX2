const { withMainActivity } = require("expo/config-plugins");

const TAG = "OX2_STARTUP";

function injectOnce(source, needle, insertion, label) {
  if (source.includes(insertion)) return source;
  const index = source.indexOf(needle);
  if (index === -1) {
    throw new Error(`[startup-instrumentation] Missing MainActivity anchor: ${label}`);
  }
  return source.slice(0, index) + insertion + source.slice(index);
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
      out = injectOnce(
        out,
        "class MainActivity",
        `\n  private var ox2FirstFrameLogged = false\n`,
        "class MainActivity",
      );
      out = injectOnce(
        out,
        "override fun onCreate(savedInstanceState: Bundle?) {",
        `\n    android.util.Log.i("${TAG}", "ANDROID_ON_CREATE elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis())\n`,
        "onCreate",
      );
      out = injectOnce(
        out,
        "override fun onResume() {",
        `\n    android.util.Log.i("${TAG}", "ANDROID_ON_RESUME elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis())\n`,
        "onResume",
      );
      out = injectOnce(
        out,
        "override fun onResume() {",
        `\n    if (!ox2FirstFrameLogged) {\n      ox2FirstFrameLogged = true\n      android.view.Choreographer.getInstance().postFrameCallback { frameTimeNanos ->\n        android.util.Log.i("${TAG}", "ANDROID_FIRST_FRAME frameTimeNanos=" + frameTimeNanos + " elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis())\n      }\n    }\n`,
        "first-frame callback",
      );
      out = injectOnce(
        out,
        "override fun onResume() {",
        `\n    android.util.Log.i("${TAG}", "ANDROID_REPORT_FULLY_DRAWN elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis())\n`,
        "reportFullyDrawn marker",
      );
      mod.modResults.contents = out;
      return mod;
    }

    let out = source;
    out = injectOnce(
      out,
      "public class MainActivity",
      `\n    private boolean ox2FirstFrameLogged = false;\n`,
      "class MainActivity",
    );
    out = injectOnce(
      out,
      "protected void onCreate(Bundle savedInstanceState) {",
      `\n        android.util.Log.i("${TAG}", "ANDROID_ON_CREATE elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis());\n`,
      "onCreate",
    );
    out = injectOnce(
      out,
      "protected void onResume() {",
      `\n        android.util.Log.i("${TAG}", "ANDROID_ON_RESUME elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis());\n        if (!ox2FirstFrameLogged) {\n            ox2FirstFrameLogged = true;\n            android.view.Choreographer.getInstance().postFrameCallback(frameTimeNanos -> android.util.Log.i("${TAG}", "ANDROID_FIRST_FRAME frameTimeNanos=" + frameTimeNanos + " elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis()));\n        }\n        android.util.Log.i("${TAG}", "ANDROID_REPORT_FULLY_DRAWN elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis());\n`,
      "onResume",
    );
    mod.modResults.contents = out;
    return mod;
  });
}

module.exports = withStartupInstrumentation;
