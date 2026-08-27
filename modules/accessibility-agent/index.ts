import { requireNativeModule } from 'expo'
import { Platform } from 'react-native'

export type AccessibilityNode = {
  id: string
  text: string | null
  contentDescription: string | null
  className: string | null
  packageName: string | null
  clickable: boolean
  editable: boolean
  enabled: boolean
  bounds: { left: number; top: number; right: number; bottom: number }
}

type NativeAccessibilityAgent = {
  isEnabled(): Promise<boolean>
  getTree(maxNodes: number): Promise<AccessibilityNode[]>
  perform(actionJson: string): Promise<{ status: string; action: string }>
}

const Native = Platform.OS === 'android'
  ? requireNativeModule<NativeAccessibilityAgent>('AccessibilityAgent')
  : null

export async function isAccessibilityEnabled(): Promise<boolean> {
  if (!Native) return false
  return Native.isEnabled()
}

export async function getAccessibilityTree(maxNodes = 250): Promise<AccessibilityNode[]> {
  if (!Native) return []
  return Native.getTree(Math.max(1, Math.min(maxNodes, 1000)))
}

export async function performAccessibilityAction(action: {
  type: 'tap' | 'long_press' | 'swipe' | 'type' | 'back' | 'home' | 'recents'
  x?: number
  y?: number
  x2?: number
  y2?: number
  durationMs?: number
  text?: string
  nodeId?: string
}) {
  if (!Native) return { status: 'unsupported_platform', action: action.type }
  return Native.perform(JSON.stringify(action))
}
