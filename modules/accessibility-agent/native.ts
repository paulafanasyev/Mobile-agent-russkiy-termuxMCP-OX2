import { Platform } from 'react-native'
import type { AccessibilityAction } from '../../src/tools/accessibility-tools'
import type { AccessibilityNode } from './index'

export type NativeAccessibilityResult = {
  status: string
  action: string
}

const MAX_TEXT_LENGTH = 4096

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
  const type = action.type
  if (Platform.OS !== 'android') return { status: 'unsupported_platform', action: type }

  try {
    const controller = await import('react-native-accessibility-controller')
    let ok = false

    switch (action.type) {
      case 'back':
        ok = await controller.globalAction('back')
        break
      case 'home':
        ok = await controller.globalAction('home')
        break
      case 'recents':
        ok = await controller.globalAction('recents')
        break
      case 'tap':
        if (action.nodeId) {
          ok = await controller.tapNode(action.nodeId)
        } else if (action.x !== undefined && action.y !== undefined) {
          ok = await controller.tap(action.x, action.y)
        } else {
          return { status: 'invalid_action', action: type }
        }
        break
      case 'long_press':
        if (action.nodeId) {
          ok = await controller.longPressNode(action.nodeId)
        } else if (action.x !== undefined && action.y !== undefined) {
          ok = await controller.longPress(action.x, action.y)
        } else {
          return { status: 'invalid_action', action: type }
        }
        break
      case 'swipe':
        ok = await controller.swipe(
          action.x,
          action.y,
          action.x2,
          action.y2,
          action.durationMs ?? 300,
        )
        break
      case 'type':
        if (!action.nodeId) return { status: 'invalid_action', action: type }
        ok = await controller.setNodeText(
          action.nodeId,
          action.text.slice(0, MAX_TEXT_LENGTH),
        )
        break
      default:
        return { status: 'unsupported', action: type }
    }

    return { status: ok === true ? 'verified' : 'failed', action: type }
  } catch {
    return { status: 'failed', action: type }
  }
}
