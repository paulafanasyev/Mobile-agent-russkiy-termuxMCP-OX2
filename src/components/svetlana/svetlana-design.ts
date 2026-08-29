export const SVETLANA_DESIGN = {
  version: "2026-08-29-orb-v1",
  primaryFace: "animated-orb",
  defaultTheme: "light",
  themes: ["light", "dark"],
  fullSize: 180,
  compactSize: 80,
  orbStates: ["idle", "listening", "thinking", "speaking", "error"],
  mouthLayerId: "svetlanaMouth",
  lipSync: "viseme",
} as const;

export type SvetlanaOrbState = (typeof SVETLANA_DESIGN.orbStates)[number];
