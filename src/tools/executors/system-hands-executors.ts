import * as Linking from 'expo-linking'
import * as IntentLauncher from 'expo-intent-launcher'
import { Share, Platform } from 'react-native'
import { z } from 'zod'

// Hands may open external web resources, but executable URI schemes are not
// accepted. This prevents javascript:/file:/intent: payloads from crossing
// the Hands boundary.
const safeWebUrl = z.string().url().max(4096).refine((value) => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol) } catch { return false }
}, 'Only http:// and https:// URLs are allowed')

export const openUrlHandsSchema = z.object({ url: safeWebUrl })

export const openSettingsHandsSchema = z.object({
  action: z.string().regex(/^android\.settings\.[A-Z0-9_]+$/).optional(),
})

export const waitHandsSchema = z.object({
  durationMs: z.number().int().min(0).max(30000),
})

export const shareHandsSchema = z.object({
  message: z.string().max(10000).optional(),
  url: safeWebUrl.optional(),
  title: z.string().max(500).optional(),
}).refine(v => v.message !== undefined || v.url !== undefined, 'share requires message or url')

export async function executeOpenUrl(args: z.infer<typeof openUrlHandsSchema>) {
  const parsed = openUrlHandsSchema.parse(args)
  const supported = await Linking.canOpenURL(parsed.url)
  if (!supported) return { status: 'unsupported_url', url: parsed.url, verified: false }
  await Linking.openURL(parsed.url)
  return { status: 'intent_launched', url: parsed.url, verified: false }
}

export async function executeOpenSettings(args: z.infer<typeof openSettingsHandsSchema>) {
  if (Platform.OS !== 'android') return { status: 'unsupported_platform', verified: false }
  const action = args.action ?? 'android.settings.SETTINGS'
  await IntentLauncher.startActivityAsync(action)
  return { status: 'intent_launched', action, verified: false }
}

export async function executeHandsWait(args: z.infer<typeof waitHandsSchema>) {
  const parsed = waitHandsSchema.parse(args)
  await new Promise<void>(resolve => setTimeout(resolve, parsed.durationMs))
  return { status: 'waited', durationMs: parsed.durationMs, verified: true }
}

export async function executeHandsShare(args: z.infer<typeof shareHandsSchema>) {
  const parsed = shareHandsSchema.parse(args)
  const result = await Share.share({ message: parsed.message ?? parsed.url ?? '', title: parsed.title, url: parsed.url })
  return { status: result.action === Share.sharedAction ? 'shared' : 'dismissed', action: result.action, verified: result.action === Share.sharedAction }
}
