import { Platform } from 'react-native'
import { requireNativeModule } from 'expo-modules-core'

export type SystemHandsNative = {
  setVolume(stream: number, level: number): Promise<{ status: string; stream: number; level?: number; max?: number }>
  getVolume(stream: number): Promise<{ level: number; max: number }>
  setBrightness(value: number): Promise<{ status: string; value?: number }>
  getBrightness(): Promise<{ value: number; raw: number }>
  toggleFlashlight(enabled: boolean): Promise<{ status: string; enabled: boolean }>
  captureCamera(): Promise<{ status: string; verified: boolean; uri?: string; sizeBytes?: number; minimumApi?: number; reason?: string }>
  sendMediaBroadcast(action: string, keyCode: number): Promise<{ status: string; verified: boolean; action?: string; keyCode?: number }>
  readContent(uri: string, maxBytes: number): Promise<{ status: string; verified: boolean; content?: string; sizeBytes?: number; reason?: string }>
  writeContent(uri: string, content: string, append: boolean): Promise<{ status: string; verified: boolean; sizeBytes?: number; reason?: string }>
  deleteContent(uri: string): Promise<{ status: string; verified: boolean }>
  renameContent(uri: string, displayName: string): Promise<{ status: string; verified: boolean; uri?: string }>
  moveContent(sourceUri: string, targetParentUri: string): Promise<{ status: string; verified: boolean; destinationUri?: string }>
}

const Native = Platform.OS === 'android' ? requireNativeModule<SystemHandsNative>('SystemHands') : null

export function getSystemHandsNative(): SystemHandsNative {
  if (!Native) throw new Error('SystemHands is available only on Android')
  return Native
}
