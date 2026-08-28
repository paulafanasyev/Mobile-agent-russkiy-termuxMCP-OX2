export const SVETLANA_DESIGN = {
  version: "2026-08-28-approved",
  primaryFace: "realistic-photo",
  assetPath: "assets/images/svetlana-approved.jpg",
  assetSha256: "fed3d8d1405d291c7faba43d523d37e94187cf72809fc9ea948ac9dd7cba2d52",
  defaultTheme: "light",
  themes: ["light", "dark"],
  fullSize: 180,
  compactSize: 80,
  orbStates: ["idle", "listening", "thinking", "speaking", "warning", "joy"],
  mouthLayerId: "svetlanaMouth",
  lipSync: "viseme",
} as const;

export type SvetlanaOrbState = (typeof SVETLANA_DESIGN.orbStates)[number];
