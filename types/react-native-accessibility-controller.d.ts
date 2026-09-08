declare module "react-native-accessibility-controller" {
  export type AccessibilityNode = {
    nodeId: string;
    className: string | null;
    text: string | null;
    contentDescription: string | null;
    bounds: { left: number; top: number; right: number; bottom: number };
    isClickable: boolean;
    isScrollable: boolean;
    isEditable: boolean;
    isFocused: boolean;
    isChecked?: boolean;
    isEnabled?: boolean;
    children: AccessibilityNode[];
  };

  export function isServiceEnabled(): Promise<boolean>;
  export function requestServiceEnable(): Promise<void>;
  export function getAccessibilityTree(): Promise<AccessibilityNode[]>;
  export function findNode(query: Record<string, unknown>): Promise<AccessibilityNode | null>;
  export function waitForNode(query: Record<string, unknown>, options?: { timeoutMs?: number; pollIntervalMs?: number }): Promise<AccessibilityNode>;
  export function onAccessibilityEvent(callback: (event: unknown) => void): { remove(): void };
  export function onWindowChange(callback: (window: unknown) => void): { remove(): void };
  export function tapNode(nodeId: string): Promise<boolean>;
  export function longPressNode(nodeId: string): Promise<boolean>;
  export function setNodeText(nodeId: string, text: string): Promise<boolean>;
  export function scrollNode(nodeId: string, direction: "up" | "down" | "left" | "right"): Promise<boolean>;
  export function tap(x: number, y: number): Promise<boolean>;
  export function longPress(x: number, y: number): Promise<boolean>;
  export function swipe(x: number, y: number, x2: number, y2: number, durationMs?: number): Promise<boolean>;
  export function globalAction(action: string): Promise<boolean>;
  export function openApp(packageName: string): Promise<boolean>;
}
