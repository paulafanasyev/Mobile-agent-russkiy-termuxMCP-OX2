export interface AccessibilityNode { nodeId: string; className: string; text: string | null; contentDescription: string | null; bounds: { left: number; top: number; right: number; bottom: number }; isClickable: boolean; isScrollable: boolean; isEditable: boolean; isFocused: boolean; isChecked: boolean; isEnabled: boolean; children: AccessibilityNode[]; availableActions: NodeAction[]; }
export type NodeAction = 'click' | 'longClick' | 'scrollForward' | 'scrollBackward' | 'setText' | 'clearFocus' | 'select' | 'clearText' | 'imeEnter';
export type GlobalAction = 'home' | 'back' | 'recents' | 'notifications' | 'quickSettings' | 'powerDialog';
export type ScrollDirection = 'up' | 'down' | 'left' | 'right';
export interface OverlayConfig { width?: number; height?: number; gravity?: string; touchable?: boolean; backgroundColor?: string; action?: string; stepCount?: number; }
export interface OverlayUpdateConfig { action: string; stepCount: number; }
export interface A11yEvent { eventType: string; packageName: string; className: string; text: string | null; timestamp: number; }
export interface WindowInfo { packageName: string; className: string; title: string | null; isActive: boolean; }
export interface Subscription { remove(): void; }
export interface InstalledApp { packageName: string; label: string; }
export interface FindNodeQuery { text?: string; contentDescription?: string; className?: string; isChecked?: boolean; isEnabled?: boolean; }
export interface WaitForNodeOptions { timeoutMs?: number; pollIntervalMs?: number; }
