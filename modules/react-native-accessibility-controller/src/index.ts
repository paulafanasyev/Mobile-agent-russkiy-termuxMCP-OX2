import { NativeModules, Platform } from 'react-native';

const Native = NativeModules.AccessibilityControllerLegacy;

function requireAndroid(): void {
  if (Platform.OS !== 'android') throw new Error('Accessibility controller is Android-only');
  if (!Native) throw new Error('AccessibilityControllerLegacy native module is unavailable');
}

export async function getAccessibilityTree(): Promise<any[]> {
  requireAndroid();
  return Native.getAccessibilityTree();
}

export async function tap(x: number, y: number): Promise<boolean> {
  requireAndroid();
  return Native.tap(x, y);
}

export async function isServiceEnabled(): Promise<boolean> {
  requireAndroid();
  return Native.isServiceEnabled();
}

export async function requestServiceEnable(): Promise<void> {
  requireAndroid();
  return Native.requestServiceEnable();
}

export async function globalAction(action: string): Promise<boolean> {
  requireAndroid();
  return Native.globalAction(action);
}

export async function openApp(packageName: string): Promise<boolean> {
  requireAndroid();
  return Native.openApp(packageName);
}

export async function tapNode(nodeId: string): Promise<boolean> {
  requireAndroid();
  return Native.tapNode(nodeId);
}

export async function waitForNode(query: { text?: string }, options: { timeoutMs?: number; pollIntervalMs?: number } = {}): Promise<any> {
  const timeoutMs = options.timeoutMs ?? 10000;
  const pollIntervalMs = options.pollIntervalMs ?? 250;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const tree = await getAccessibilityTree();
    const found = findInTree(tree, query);
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  throw new Error(`waitForNode: node not found within ${timeoutMs}ms`);
}

function findInTree(nodes: any[], query: { text?: string }): any | null {
  for (const node of nodes) {
    if (query.text !== undefined && typeof node.text === 'string' && node.text.includes(query.text)) return node;
    const found = findInTree(Array.isArray(node.children) ? node.children : [], query);
    if (found) return found;
  }
  return null;
}
