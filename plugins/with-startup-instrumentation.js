const { withMainActivity } = require("expo/config-plugins");

const TAG = "OX2_STARTUP";

function findClassBodyEnd(source, classStart) {
  const open = source.indexOf("{", classStart);
  if (open < 0) throw new Error("[startup-instrumentation] Missing MainActivity class body");
  let depth = 0;
  let mode = "code";
  let quote = "";
  let escaped = false;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];

    if (mode === "lineComment") {
      if (ch === "\n" || ch === "\r") mode = "code";
      continue;
    }
    if (mode === "blockComment") {
      if (ch === "*" && next === "/") {
        mode = "code";
        i += 1;
      }
      continue;
    }
    if (mode === "string" || mode === "char") {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        mode = "code";
      }
      continue;
    }

    if (ch === "/" && next === "/") {
      mode = "lineComment";
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      mode = "blockComment";
      i += 1;
      continue;
    }
    if (ch === '"') {
      mode = "string";
      quote = '"';
      escaped = false;
      continue;
    }
    if (ch === "'") {
      mode = "char";
      quote = "'";
      escaped = false;
      continue;
    }

    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i;
      if (depth < 0) throw new Error("[startup-instrumentation] MainActivity brace depth underflow");
    }
  }
  throw new Error("[startup-instrumentation] Unbalanced MainActivity braces");
}

function injectOnce(source, needle, insertion, label, offset = 0) {
  if (source.includes(insertion)) return source;
  const index = source.indexOf(needle);
  if (index === -1) throw new Error(`[startup-instrumentation] Missing MainActivity anchor: ${label}`);
  const at = index + offset;
  return source.slice(0, at) + insertion + source.slice(at);
}

function appendBeforeClassBrace(source, insertion, classStart, label) {
  if (source.includes(insertion)) return source;
  const end = findClassBodyEnd(source, classStart);
  return source.slice(0, end) + insertion + source.slice(end);
}

function withStartupInstrumentation(config) {
  return withMainActivity(config, (mod) => {
    const source = mod.modResults.contents;
    const isKotlin = mod.modResults.language === "kt" || mod.modResults.path.endsWith("MainActivity.kt");
    const isJava = mod.modResults.language === "java" || mod.modResults.path.endsWith("MainActivity.java");
    if (!isKotlin && !isJava) {
      throw new Error(`[startup-instrumentation] Unsupported MainActivity language: ${mod.modResults.path}`);
    }

    const classRe = isKotlin ? /class MainActivity[^\{]*\{/ : /public class MainActivity[^\{]*\{/;
    const classMatch = source.match(classRe);
    if (!classMatch || classMatch.index == null) {
      throw new Error(`[startup-instrumentation] Missing ${isKotlin ? "Kotlin" : "Java"} MainActivity class body`);
    }
    const classStart = classMatch.index;

    if (isKotlin) {
      let out = source;
      out = injectOnce(out, classMatch[0], `\n  private var ox2FirstFrameLogged = false\n`, "Kotlin MainActivity class body", classMatch[0].length);
      const onCreate = "override fun onCreate(savedInstanceState: Bundle?) {";
      out = injectOnce(out, onCreate, `\n    android.util.Log.i("${TAG}", "ANDROID_ON_CREATE elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis())\n    if (!ox2FirstFrameLogged) {\n      ox2FirstFrameLogged = true\n      android.view.Choreographer.getInstance().postFrameCallback { frameTimeNanos ->\n        android.util.Log.i("${TAG}", "ANDROID_FIRST_FRAME frameTimeNanos=" + frameTimeNanos + " elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis())\n      }\n    }\n`, "onCreate", onCreate.length);
      out = appendBeforeClassBrace(out, `\n  override fun reportFullyDrawn() {\n    super.reportFullyDrawn()\n    android.util.Log.i("${TAG}", "ANDROID_REPORT_FULLY_DRAWN elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis())\n  }\n`, classStart, "Kotlin reportFullyDrawn");
      mod.modResults.contents = out;
      return mod;
    }

    let out = source;
    out = injectOnce(out, classMatch[0], `\n    private boolean ox2FirstFrameLogged = false;\n`, "Java MainActivity class body", classMatch[0].length);
    const onCreate = "protected void onCreate(Bundle savedInstanceState) {";
    out = injectOnce(out, onCreate, `\n        android.util.Log.i("${TAG}", "ANDROID_ON_CREATE elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis());\n        if (!ox2FirstFrameLogged) {\n            ox2FirstFrameLogged = true;\n            android.view.Choreographer.getInstance().postFrameCallback(frameTimeNanos -> android.util.Log.i("${TAG}", "ANDROID_FIRST_FRAME frameTimeNanos=" + frameTimeNanos + " elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis()));\n        }\n`, "onCreate", onCreate.length);
    out = appendBeforeClassBrace(out, `\n    @Override\n    public void reportFullyDrawn() {\n        super.reportFullyDrawn();\n        android.util.Log.i("${TAG}", "ANDROID_REPORT_FULLY_DRAWN elapsedRealtimeNanos=" + android.os.SystemClock.elapsedRealtimeNanos() + " epochMs=" + System.currentTimeMillis());\n    }\n`, classStart, "Java reportFullyDrawn");
    mod.modResults.contents = out;
    return mod;
  });
}

module.exports = withStartupInstrumentation;
