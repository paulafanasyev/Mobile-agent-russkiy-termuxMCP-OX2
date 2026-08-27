import { Platform } from 'react-native'
import { requireNativeModule } from 'expo-modules-core'

export type SystemHandsNative = {
  setVolume(stream: number, level: number): Promise<{ status: string; stream: number; level?: number; max?: number }>
  getVolume(stream: number): Promise<{ level: number; max: number }>
  setBrightness(value: number): Promise<{ status: string; value?: number }>
  getBrightness(): Promise<{ value: number; raw: number }>
  toggleFlashlight(enabled: boolean): Promise<{ status: string; enabled: boolean }>
}

const Native = Platform.OS === 'android' ? requireNativeModule<SystemHandsNative>('SystemHands') : null

export function getSystemHandsNative(): SystemHandsNative {
  if (!Native) throw new Error('SystemHands is available only on Android')
  return Native
}
