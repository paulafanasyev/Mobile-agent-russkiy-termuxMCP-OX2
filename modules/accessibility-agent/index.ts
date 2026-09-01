import { nativeIsAccessibilityEnabled, nativeOpenAccessibilitySettings } from './native'

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

export async function isAccessibilityEnabled(): Promise<boolean> {
  return nativeIsAccessibilityEnabled()
}

export async function openAccessibilitySettings(): Promise<boolean> {
  return nativeOpenAccessibilitySettings()
}
