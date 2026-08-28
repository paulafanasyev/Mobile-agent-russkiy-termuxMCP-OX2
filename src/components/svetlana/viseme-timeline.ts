export type VisemeEvent = {
  visemeId: number;
  audioOffsetMs: number;
};

export type LipShape = {
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  radius: number;
};

// Azure exposes 22 standard viseme IDs. The phoneme table is not treated as a
// Russian-letter mapping here; the device PoC supplies the real IDs/timestamps.
export const AZURE_LIP_SHAPES: Record<number, LipShape> = {
  0: { width: 13, height: 3, scaleX: 1, scaleY: 1, radius: 6 },
  1: { width: 16, height: 8, scaleX: 1, scaleY: 1.15, radius: 8 },
  2: { width: 18, height: 10, scaleX: 1, scaleY: 1.25, radius: 9 },
  3: { width: 17, height: 11, scaleX: 1.02, scaleY: 1.3, radius: 9 },
  4: { width: 15, height: 7, scaleX: 1, scaleY: 1.1, radius: 8 },
  5: { width: 14, height: 7, scaleX: 1, scaleY: 1.05, radius: 7 },
  6: { width: 14, height: 4, scaleX: 1.1, scaleY: 1, radius: 6 },
  7: { width: 11, height: 9, scaleX: 0.9, scaleY: 1.2, radius: 7 },
  8: { width: 15, height: 9, scaleX: 0.92, scaleY: 1.25, radius: 8 },
  9: { width: 18, height: 9, scaleX: 1.05, scaleY: 1.2, radius: 8 },
  10: { width: 17, height: 8, scaleX: 1, scaleY: 1.15, radius: 8 },
  11: { width: 16, height: 7, scaleX: 1.05, scaleY: 1.1, radius: 8 },
  12: { width: 13, height: 5, scaleX: 1, scaleY: 1.05, radius: 7 },
  13: { width: 14, height: 5, scaleX: 1.05, scaleY: 1, radius: 7 },
  14: { width: 13, height: 5, scaleX: 1.08, scaleY: 1, radius: 7 },
  15: { width: 14, height: 4, scaleX: 1.1, scaleY: 0.9, radius: 7 },
  16: { width: 15, height: 5, scaleX: 1.05, scaleY: 1, radius: 7 },
  17: { width: 14, height: 6, scaleX: 1, scaleY: 1.05, radius: 7 },
  18: { width: 14, height: 7, scaleX: 0.95, scaleY: 1.1, radius: 7 },
  19: { width: 13, height: 4, scaleX: 1, scaleY: 0.95, radius: 6 },
  20: { width: 13, height: 5, scaleX: 1, scaleY: 1, radius: 6 },
  21: { width: 13, height: 3, scaleX: 0.95, scaleY: 0.85, radius: 6 },
};

const SILENCE: LipShape = AZURE_LIP_SHAPES[0];

export function shapeForViseme(visemeId: number): LipShape {
  return AZURE_LIP_SHAPES[visemeId] ?? SILENCE;
}

export function sortVisemes(events: VisemeEvent[]): VisemeEvent[] {
  return [...events].sort((a, b) => a.audioOffsetMs - b.audioOffsetMs);
}

export function findVisemeIndex(events: VisemeEvent[], elapsedMs: number): number {
  let lo = 0;
  let hi = events.length - 1;
  let answer = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (events[mid].audioOffsetMs <= elapsedMs) {
      answer = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return answer;
}

export function interpolateLipShape(
  current: LipShape,
  next: LipShape,
  progress: number,
): LipShape {
  const t = Math.max(0, Math.min(1, progress));
  const mix = (a: number, b: number) => a + (b - a) * t;
  return {
    width: mix(current.width, next.width),
    height: mix(current.height, next.height),
    scaleX: mix(current.scaleX, next.scaleX),
    scaleY: mix(current.scaleY, next.scaleY),
    radius: mix(current.radius, next.radius),
  };
}
