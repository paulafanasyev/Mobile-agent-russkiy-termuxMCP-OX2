import { Platform } from 'react-native'
import type { AccessibilityAction } from '../../src/tools/accessibility-tools'
import type { AccessibilityNode } from './index'
import { performAccessibilityAction } from './index'

export type NativeAccessibilityResult = {
  status: string
  action: string
}

export async function nativeIsAccessibilityEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  const { isServiceEnabled } = await import('react-native-accessibility-controller')
  return isServiceEnabled()
}

export async function nativeOpenAccessibilitySettings(): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  const { requestServiceEnable } = await import('react-native-accessibility-controller')
  await requestServiceEnable()
  return true
}

export async function nativeGetAccessibilityTree(maxNodes: number): Promise<AccessibilityNode[]> {
  if (Platform.OS !== 'android') return []
  const { getAccessibilityTree } = await import('./index')
  return getAccessibilityTree(maxNodes)
}

export async function nativePerformAccessibilityAction(
  action: AccessibilityAction,
): Promise<NativeAccessibilityResult> {
  if (Platform.OS !== 'android') return { status: 'unsupported_platform', action: action.type }
  return performAccessibilityAction(action)
}
