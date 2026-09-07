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
  if (Platform.OS !== 'android') return { status: 'unsupported_platform', action: action.type }

  try {
    const controller = await import('react-native-accessibility-controller')
    const type = String(action.type)
    let ok = false

    switch (type) {
      case 'back': ok = await controller.globalAction('back'); break
      case 'home': ok = await controller.globalAction('home'); break
      case 'recents': ok = await controller.globalAction('recents'); break
      case 'notifications': ok = await controller.globalAction('notifications'); break
      case 'quick_settings': ok = await controller.globalAction('quickSettings'); break
      case 'power_dialog': ok = await controller.globalAction('powerDialog'); break
      case 'tap':
        ok = 'nodeId' in action && action.nodeId
          ? await controller.tapNode(action.nodeId)
          : await controller.tap(action.x, action.y)
        break
      case 'long_press':
        ok = 'nodeId' in action && action.nodeId
          ? await controller.longPressNode(action.nodeId)
          : await controller.longPress(action.x, action.y)
        break
      case 'swipe':
        ok = await controller.swipe(action.x, action.y, action.x2, action.y2, action.durationMs ?? 300)
        break
      case 'type':
        ok = await controller.setNodeText(action.nodeId, String(action.text ?? '').slice(0, MAX_TEXT_LENGTH))
        break
      case 'scroll':
        ok = await controller.scrollNode(action.nodeId, action.direction ?? 'down')
        break
      case 'open_app':
        ok = await controller.openApp(action.packageName)
        break
      default:
        return { status: 'unsupported', action: type }
    }

    return { status: ok === true ? 'verified' : 'failed', action: type }
  } catch {
    return { status: 'failed', action: type }
  }
}
