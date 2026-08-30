import * as SecureStore from "expo-secure-store";

const PREFIX = "OX2_TOOL_APPROVAL_";

function keyFor(toolName: string): string {
  const normalized = toolName.trim().replace(/[^A-Za-z0-9_.-]/g, "_");
  return `${PREFIX}${normalized}`;
}

export async function isToolAlwaysAllowed(toolName: string): Promise<boolean> {
  if (!toolName.trim()) return false;
  return (await SecureStore.getItemAsync(keyFor(toolName))) === "always";
}

export async function setToolAlwaysAllowed(toolName: string, allowed: boolean): Promise<void> {
  if (!toolName.trim()) return;
  const key = keyFor(toolName);
  if (allowed) {
    await SecureStore.setItemAsync(key, "always");
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}
