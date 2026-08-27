import { requireNativeModule } from 'expo'
import { Platform } from 'react-native'

export const HANDS_MAX_TREE_NODES = 200
export const HANDS_MAX_TEXT_LENGTH = 4096

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
}

const Native = Platform.OS === 'android'
  ? requireNativeModule<NativeAccessibilityAgent>('AccessibilityAgent')
  : null

export async function isAccessibilityEnabled(): Promise<boolean> {
  if (!Native) return false
  return Native.isEnabled()
}
