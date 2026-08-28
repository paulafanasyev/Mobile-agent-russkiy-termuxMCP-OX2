export const SVETLANA_DESIGN = {
  version: "2026-08-28-approved",
  primaryFace: "realistic-svg",
  defaultTheme: "light",
  themes: ["light", "dark"],
  fullSize: 180,
  compactSize: 80,
  orbStates: ["idle", "listening", "thinking", "speaking", "warning", "joy"],
  mouthLayerId: "svetlanaMouth",
  lipSync: "viseme",
} as const;

export type SvetlanaOrbState = (typeof SVETLANA_DESIGN.orbStates)[number];
