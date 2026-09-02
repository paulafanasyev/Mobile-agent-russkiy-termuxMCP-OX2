import { NativeModules, Platform } from 'react-native';

const { AccessibilityControllerLegacy } = NativeModules;

function native() {
  if (Platform.OS !== 'android') throw new Error('Bedda legacy controller is Android-only');
  if (!AccessibilityControllerLegacy) throw new Error('AccessibilityControllerLegacy is unavailable');
  return AccessibilityControllerLegacy;
}

export async function beddaGetTree(): Promise<any[]> { return native().getAccessibilityTree(); }
export async function beddaTap(x: number, y: number): Promise<boolean> { return native().tap(x, y); }
export async function beddaTapNode(nodeId: string): Promise<boolean> { return native().tapNode(nodeId); }
export async function beddaIsEnabled(): Promise<boolean> { return native().isServiceEnabled(); }
export async function beddaRequestEnable(): Promise<void> { return native().requestServiceEnable(); }
export async function beddaOpenApp(packageName: string): Promise<boolean> { return native().openApp(packageName); }
export async function beddaGlobalAction(action: string): Promise<boolean> { return native().globalAction(action); }

export async function beddaWaitForNode(
  query: { text?: string },
  options: { timeoutMs?: number; pollIntervalMs?: number } = {},
): Promise<any> {
  const timeoutMs = options.timeoutMs ?? 10000;
  const pollIntervalMs = options.pollIntervalMs ?? 250;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const tree = await beddaGetTree();
    const found = findNode(tree, query.text);
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  throw new Error(`waitForNode: node not found within ${timeoutMs}ms`);
}

function findNode(nodes: any[], text?: string): any | null {
  for (const node of nodes) {
    if (text !== undefined && typeof node.text === 'string' && node.text.includes(text)) return node;
    if (Array.isArray(node.children)) {
      const found = findNode(node.children, text);
      if (found) return found;
    }
  }
  return null;
}
