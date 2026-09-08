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

function appendBeforeFinalBrace(source, insertion, label) {
  if (source.includes(insertion)) return source;
  const index = source.lastIndexOf("}");
  if (index === -1) throw new Error(`[startup-instrumentation] Missing final class brace: ${label}`);
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
      const classMatch = out.match(/class MainActivity[^\{]*\{/);
      if (!classMatch) throw new Error("[startup-instrumentation] Missing Kotlin MainActivity class body");
      out = injectOnce(out, classMatch[0], `\n  private var ox2FirstFrameLogged = false\n`, "Kotlin MainActivity class body", classMatch[0].length);
      const onCreate = "override fun onCreate(savedInstanceState: Bundle?) {";
      out = injectOnce(out, onCreate, `\n    android.util.Log.i("${TAG}", "ANDROID_ON_CREATE elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis())\n`, "onCreate", onCreate.length);
      const onResume = "override fun onResume() {";
      out = injectOnce(out, onResume, `\n    android.util.Log.i("${TAG}", "ANDROID_ON_RESUME elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis())\n    if (!ox2FirstFrameLogged) {\n      ox2FirstFrameLogged = true\n      android.view.Choreographer.getInstance().postFrameCallback { frameTimeNanos ->\n        android.util.Log.i("${TAG}", "ANDROID_FIRST_FRAME frameTimeNanos=" + frameTimeNanos + " elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis())\n      }\n    }\n`, "onResume", onResume.length);
      out = appendBeforeFinalBrace(out, `\n  override fun reportFullyDrawn() {\n    super.reportFullyDrawn()\n    android.util.Log.i("${TAG}", "ANDROID_REPORT_FULLY_DRAWN elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis())\n  }\n`, "Kotlin reportFullyDrawn");
      mod.modResults.contents = out;
      return mod;
    }

    let out = source;
    const classMatch = out.match(/public class MainActivity[^\{]*\{/);
    if (!classMatch) throw new Error("[startup-instrumentation] Missing Java MainActivity class body");
    out = injectOnce(out, classMatch[0], `\n    private boolean ox2FirstFrameLogged = false;\n`, "Java MainActivity class body", classMatch[0].length);
    const onCreate = "protected void onCreate(Bundle savedInstanceState) {";
    out = injectOnce(out, onCreate, `\n        android.util.Log.i("${TAG}", "ANDROID_ON_CREATE elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis());\n`, "onCreate", onCreate.length);
    const onResume = "protected void onResume() {";
    out = injectOnce(out, onResume, `\n        android.util.Log.i("${TAG}", "ANDROID_ON_RESUME elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis());\n        if (!ox2FirstFrameLogged) {\n            ox2FirstFrameLogged = true;\n            android.view.Choreographer.getInstance().postFrameCallback(frameTimeNanos -> android.util.Log.i("${TAG}", "ANDROID_FIRST_FRAME frameTimeNanos=" + frameTimeNanos + " elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis()));\n        }\n`, "onResume", onResume.length);
    out = appendBeforeFinalBrace(out, `\n    @Override\n    public void reportFullyDrawn() {\n        super.reportFullyDrawn();\n        android.util.Log.i("${TAG}", "ANDROID_REPORT_FULLY_DRAWN elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis());\n    }\n`, "Java reportFullyDrawn");
    mod.modResults.contents = out;
    return mod;
  });
}

module.exports = withStartupInstrumentation;
