export type { AccessibilityNode, NodeAction, GlobalAction, ScrollDirection, A11yEvent, WindowInfo, Subscription, FindNodeQuery, WaitForNodeOptions, InstalledApp } from './types';
import type { AccessibilityNode, NodeAction, GlobalAction, ScrollDirection, A11yEvent, WindowInfo, Subscription, FindNodeQuery, WaitForNodeOptions, InstalledApp } from './types';
import { NativeEventEmitter, Platform } from 'react-native';
import NativeAccessibilityController from './NativeAccessibilityController';
const emitter = Platform.OS === 'android' ? new NativeEventEmitter(NativeAccessibilityController) : null;
export async function getAccessibilityTree(): Promise<AccessibilityNode[]> { return NativeAccessibilityController.getAccessibilityTree() as Promise<AccessibilityNode[]>; }
export async function findNode(query: FindNodeQuery): Promise<AccessibilityNode | null> { const tree = await getAccessibilityTree(); return findInTree(tree, query); }
export async function waitForNode(query: FindNodeQuery, options: WaitForNodeOptions = {}): Promise<AccessibilityNode> { const { timeoutMs = 10000, pollIntervalMs = 500 } = options; const deadline = Date.now() + timeoutMs; while (Date.now() < deadline) { const found = findInTree(await getAccessibilityTree(), query); if (found) return found; await new Promise<void>(resolve => setTimeout(resolve, Math.min(pollIntervalMs, Math.max(0, deadline - Date.now())))); } throw Object.assign(new Error(`waitForNode: node not found within ${timeoutMs}ms`), { name: 'TimeoutError' }); }
function nodeMatches(node: AccessibilityNode, query: FindNodeQuery): boolean { const stringMatch = (query.text !== undefined && node.text?.includes(query.text)) || (query.contentDescription !== undefined && node.contentDescription?.includes(query.contentDescription)) || (query.className !== undefined && node.className === query.className); const hasString = query.text !== undefined || query.contentDescription !== undefined || query.className !== undefined; if (hasString && !stringMatch) return false; if (!hasString && query.isChecked === undefined && query.isEnabled === undefined) return false; if (query.isChecked !== undefined && node.isChecked !== query.isChecked) return false; if (query.isEnabled !== undefined && node.isEnabled !== query.isEnabled) return false; return true; }
function findInTree(nodes: AccessibilityNode[], query: FindNodeQuery): AccessibilityNode | null { for (const node of nodes) { if (nodeMatches(node, query)) return node; const found = findInTree(node.children, query); if (found) return found; } return null; }
export async function getScreenText(): Promise<string> { return NativeAccessibilityController.getScreenText(); }
export async function takeScreenshot(): Promise<string> { return NativeAccessibilityController.takeScreenshot(); }
export async function performAction(nodeId: string, action: NodeAction): Promise<boolean> { return NativeAccessibilityController.performAction(nodeId, action); }
export async function tapNode(nodeId: string): Promise<boolean> { return NativeAccessibilityController.tapNode(nodeId); }
export async function longPressNode(nodeId: string): Promise<boolean> { return NativeAccessibilityController.longPressNode(nodeId); }
export async function setNodeText(nodeId: string, text: string): Promise<boolean> { return NativeAccessibilityController.setNodeText(nodeId, text); }
export async function scrollNode(nodeId: string, direction: ScrollDirection): Promise<boolean> { return NativeAccessibilityController.scrollNode(nodeId, direction); }
export async function tap(x: number, y: number): Promise<boolean> { return NativeAccessibilityController.tap(x, y); }
export async function longPress(x: number, y: number): Promise<boolean> { return NativeAccessibilityController.longPress(x, y); }
export async function swipe(startX: number, startY: number, endX: number, endY: number, durationMs = 300): Promise<boolean> { return NativeAccessibilityController.swipe(startX, startY, endX, endY, durationMs); }
export async function globalAction(action: GlobalAction): Promise<boolean> { return NativeAccessibilityController.globalAction(action); }
export async function openApp(packageName: string): Promise<boolean> { return NativeAccessibilityController.openApp(packageName); }
export async function getInstalledApps(): Promise<InstalledApp[]> { return NativeAccessibilityController.getInstalledApps() as Promise<InstalledApp[]>; }
export function onAccessibilityEvent(callback: (event: A11yEvent) => void): Subscription { if (!emitter) return { remove: () => {} }; const sub = emitter.addListener('onAccessibilityEvent', callback); return { remove: () => sub.remove() }; }
export function onWindowChange(callback: (window: WindowInfo) => void): Subscription { if (!emitter) return { remove: () => {} }; const sub = emitter.addListener('onWindowChange', callback); return { remove: () => sub.remove() }; }
export async function requestMediaProjection(): Promise<boolean> { return NativeAccessibilityController.requestMediaProjection(); }
export async function captureWithMediaProjection(): Promise<string> { return NativeAccessibilityController.captureWithMediaProjection(); }
export async function releaseMediaProjection(): Promise<void> { return NativeAccessibilityController.releaseMediaProjection(); }
export async function isServiceEnabled(): Promise<boolean> { return NativeAccessibilityController.isServiceEnabled(); }
export async function requestServiceEnable(): Promise<void> { return NativeAccessibilityController.requestServiceEnable(); }
export async function canDrawOverlays(): Promise<boolean> { return Platform.OS !== 'android' ? true : NativeAccessibilityController.canDrawOverlays(); }
export async function requestOverlayPermission(): Promise<void> { if (Platform.OS === 'android') return NativeAccessibilityController.requestOverlayPermission(); }
