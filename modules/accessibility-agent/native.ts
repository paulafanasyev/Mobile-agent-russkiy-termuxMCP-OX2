import { requireNativeModule } from 'expo'
import { Platform } from 'react-native'
import type { AccessibilityAction } from '../../src/tools/accessibility-tools'
import type { AccessibilityNode } from './index'

export type NativeAccessibilityResult = {
  status: string
  action: string
}

type NativeAccessibilityAgent = {
  isEnabled(): Promise<boolean>
  openAccessibilitySettings(): Promise<boolean>
  getTree(maxNodes: number): Promise<AccessibilityNode[]>
  perform(actionJson: string): Promise<NativeAccessibilityResult>
}

const Native = Platform.OS === 'android'
  ? requireNativeModule<NativeAccessibilityAgent>('AccessibilityAgent')
  : null

export async function nativeIsAccessibilityEnabled(): Promise<boolean> {
  if (!Native) return false
  return Native.isEnabled()
}

export async function nativeOpenAccessibilitySettings(): Promise<boolean> {
  if (!Native) return false
  return Native.openAccessibilitySettings()
}

export async function nativeGetAccessibilityTree(maxNodes: number): Promise<AccessibilityNode[]> {
  if (!Native) return []
  return Native.getTree(maxNodes)
}

export async function nativePerformAccessibilityAction(
  action: AccessibilityAction,
): Promise<NativeAccessibilityResult> {
  if (!Native) return { status: 'unsupported_platform', action: action.type }
  return Native.perform(JSON.stringify(action))
}
