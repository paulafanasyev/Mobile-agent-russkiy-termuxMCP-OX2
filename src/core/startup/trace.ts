const TAG = "OX2_STARTUP";
const bootEpochMs = Date.now();
const bootMonoMs = globalThis.performance?.now?.() ?? 0;

export function startupMark(name: string): void {
  const nowMono = globalThis.performance?.now?.() ?? bootMonoMs;
  const deltaMs = nowMono - bootMonoMs;
  // Keep the tag stable so release logcat can be machine-parsed.
  console.log(
    `${TAG} ${name} mono_ms=${deltaMs.toFixed(1)} epoch_ms=${bootEpochMs + deltaMs}`,
  );
}

export function startupTraceMetadata(): {
  tag: string;
  bootEpochMs: number;
  bootMonoMs: number;
} {
  return { tag: TAG, bootEpochMs, bootMonoMs };
}
