import { z } from 'zod'
import { getSystemHandsNative } from '../../../modules/system-hands/src'

export const setVolumeHandsSchema = z.object({
  stream: z.number().int().min(0).max(5).default(3),
  level: z.number().int().min(0).max(100),
})

export const setBrightnessHandsSchema = z.object({ value: z.number().min(0).max(1) })
export const toggleFlashlightHandsSchema = z.object({ enabled: z.boolean() })

export async function executeSetVolume(args: z.infer<typeof setVolumeHandsSchema>) {
  const parsed = setVolumeHandsSchema.parse(args)
  const native = getSystemHandsNative()
  const current = await native.getVolume(parsed.stream)
  const level = Math.round((parsed.level / 100) * current.max)
  const result = await native.setVolume(parsed.stream, level)
  return { ...result, requestedPercent: parsed.level, verified: result.level === level }
}

export async function executeSetBrightness(args: z.infer<typeof setBrightnessHandsSchema>) {
  const parsed = setBrightnessHandsSchema.parse(args)
  const native = getSystemHandsNative()
  const result = await native.setBrightness(parsed.value)
  if (result.status !== 'changed') return { ...result, requestedValue: parsed.value, verified: false }
  const after = await native.getBrightness()
  return { ...result, requestedValue: parsed.value, observedValue: after.value, verified: Math.abs(after.value - parsed.value) <= 0.03 }
}

export async function executeToggleFlashlight(args: z.infer<typeof toggleFlashlightHandsSchema>) {
  const parsed = toggleFlashlightHandsSchema.parse(args)
  const result = await getSystemHandsNative().toggleFlashlight(parsed.enabled)
  return { ...result, verified: result.status === 'changed' && result.enabled === parsed.enabled }
}
