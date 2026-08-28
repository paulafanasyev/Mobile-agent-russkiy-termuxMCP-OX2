export type VisemeShape = {
  width: number;
  scaleX: number;
  scaleY: number;
  radius: number;
};

export type VisemeKeyframe = {
  timeMs: number;
  visemeId: number;
  shape: VisemeShape;
};

const VISEME_SHAPES: Record<number, VisemeShape> = {
  0: { width: 13, scaleX: 1, scaleY: 0.35, radius: 8 },
  1: { width: 12, scaleX: 0.75, scaleY: 0.55, radius: 6 },
  2: { width: 14, scaleX: 0.9, scaleY: 0.75, radius: 7 },
  3: { width: 16, scaleX: 0.8, scaleY: 1, radius: 8 },
  4: { width: 11, scaleX: 0.65, scaleY: 1.15, radius: 6 },
  5: { width: 18, scaleX: 0.85, scaleY: 0.65, radius: 9 },
  6: { width: 20, scaleX: 1, scaleY: 0.9, radius: 10 },
  7: { width: 15, scaleX: 0.7, scaleY: 0.45, radius: 8 },
};

const DEFAULT_VISEME: VisemeShape = VISEME_SHAPES[0];

export function shapeForViseme(visemeId: number): VisemeShape {
  return VISEME_SHAPES[visemeId] ?? DEFAULT_VISEME;
}

export function createVisemeKeyframe(timeMs: number, visemeId: number): VisemeKeyframe {
  return { timeMs: Math.max(0, timeMs), visemeId, shape: shapeForViseme(visemeId) };
}

export function sortVisemeTimeline(events: VisemeKeyframe[]): VisemeKeyframe[] {
  return [...events].sort((a, b) => a.timeMs - b.timeMs);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateShape(a: VisemeShape, b: VisemeShape, t: number): VisemeShape {
  return {
    width: lerp(a.width, b.width, t),
    scaleX: lerp(a.scaleX, b.scaleX, t),
    scaleY: lerp(a.scaleY, b.scaleY, t),
    radius: lerp(a.radius, b.radius, t),
  };
}

/** Resolve the mouth pose at an audio-relative timestamp using binary search + interpolation. */
export function shapeAtTime(events: VisemeKeyframe[], timeMs: number): VisemeShape {
  if (events.length === 0) return DEFAULT_VISEME;
  const timeline = sortVisemeTimeline(events);
  const time = Math.max(0, timeMs);
  if (time <= timeline[0].timeMs) return timeline[0].shape;
  const last = timeline[timeline.length - 1];
  if (time >= last.timeMs) return last.shape;

  let lo = 0;
  let hi = timeline.length - 1;
  while (lo + 1 < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (timeline[mid].timeMs <= time) lo = mid;
    else hi = mid;
  }

  const left = timeline[lo];
  const right = timeline[hi];
  const span = right.timeMs - left.timeMs;
  const t = span <= 0 ? 0 : (time - left.timeMs) / span;
  return interpolateShape(left.shape, right.shape, t);
}
