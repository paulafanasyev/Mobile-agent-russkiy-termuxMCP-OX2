import * as SecureStore from "expo-secure-store";

const HANDS_ALWAYS_ALLOW_KEY = "ox2.hands.alwaysAllow";

/**
 * App-level approval for Hands/device UI actions.
 * This does NOT bypass Android's AccessibilityService consent. Android still
 * requires the user to enable the service in system settings once.
 */
export async function isHandsAlwaysAllowed(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(HANDS_ALWAYS_ALLOW_KEY)) === "1";
  } catch {
    return false;
  }
}

export async function setHandsAlwaysAllowed(enabled: boolean): Promise<void> {
  if (enabled) {
    await SecureStore.setItemAsync(HANDS_ALWAYS_ALLOW_KEY, "1");
  } else {
    await SecureStore.deleteItemAsync(HANDS_ALWAYS_ALLOW_KEY);
  }
}
