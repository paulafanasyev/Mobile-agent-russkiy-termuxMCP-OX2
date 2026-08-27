// Expo expects the React Native development flag to exist at runtime.
// Keep it explicit for Node/Vitest, where Metro normally provides it.
globalThis.__DEV__ = true;
