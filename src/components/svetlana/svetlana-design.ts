export const SVETLANA_DESIGN = {
  version: "2026-08-28-approved",
  primaryFace: "realistic-photo",
  assetPath: "assets/images/svetlana-approved.jpg",
  assetSha256: "b55dd099a0fdea48810986f2a1fec2db557b0430d6906dea8dce263864b3dc63",
  defaultTheme: "light",
  themes: ["light", "dark"],
  fullSize: 180,
  compactSize: 80,
  orbStates: ["idle", "listening", "thinking", "speaking", "warning", "joy"],
  mouthLayerId: "svetlanaMouth",
  lipSync: "viseme",
} as const;

export type SvetlanaOrbState = (typeof SVETLANA_DESIGN.orbStates)[number];
