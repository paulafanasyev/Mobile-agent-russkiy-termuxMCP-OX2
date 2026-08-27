import { requireNativeModule } from 'expo'
import { Platform } from 'react-native'
import type { AccessibilityAction } from '../../src/tools/accessibility-tools'
import type { AccessibilityNode } from './index'

export type NativeAccessibilityResult = { status: string; action: string }
export type AccessibilityFindResult = { id: string; text: string | null; contentDescription: string | null; resourceId?: string | null; packageName: string | null; bounds?: { left: number; top: number; right: number; bottom: number } }

type NativeAccessibilityAgent = {
  isEnabled(): Promise<boolean>
  getTree(maxNodes: number): Promise<AccessibilityNode[]>
  find(queryJson: string): Promise<AccessibilityFindResult[]>
  perform(actionJson: string): Promise<NativeAccessibilityResult>
}

const Native = Platform.OS === 'android' ? requireNativeModule<NativeAccessibilityAgent>('AccessibilityAgent') : null
export async function nativeIsAccessibilityEnabled(): Promise<boolean> { if (!Native) return false; return Native.isEnabled() }
export async function nativeGetAccessibilityTree(maxNodes: number): Promise<AccessibilityNode[]> { if (!Native) return []; return Native.getTree(maxNodes) }
export async function nativeFindAccessibilityNodes(query: Record<string, unknown>): Promise<AccessibilityFindResult[]> { if (!Native) return []; return Native.find(JSON.stringify(query)) }
export async function nativePerformAccessibilityAction(action: AccessibilityAction): Promise<NativeAccessibilityResult> { if (!Native) return { status: 'unsupported_platform', action: action.type }; return Native.perform(JSON.stringify(action)) }
