export type VisemeShape = {
  width: number;
  scaleX: number;
  scaleY: number;
  radius: number;
};

// Compact, deterministic viseme geometry used by the avatar mouth overlay.
// IDs are intentionally numeric so the TTS/viseme bridge can pass them directly.
const VISeme_SHAPES: Record<number, VisemeShape> = {
  0: { width: 13, scaleX: 1, scaleY: 0.35, radius: 8 },
  1: { width: 12, scaleX: 0.75, scaleY: 0.55, radius: 6 },
  2: { width: 14, scaleX: 0.9, scaleY: 0.75, radius: 7 },
  3: { width: 16, scaleX: 0.8, scaleY: 1, radius: 8 },
  4: { width: 11, scaleX: 0.65, scaleY: 1.15, radius: 6 },
  5: { width: 18, scaleX: 0.85, scaleY: 0.65, radius: 9 },
  6: { width: 20, scaleX: 1, scaleY: 0.9, radius: 10 },
  7: { width: 15, scaleX: 0.7, scaleY: 0.45, radius: 8 },
};

const DEFAULT_VISEME: VisemeShape = VISeme_SHAPES[0];

export function shapeForViseme(visemeId: number): VisemeShape {
  return VISeme_SHAPES[visemeId] ?? DEFAULT_VISEME;
}
