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

// Accept only Android Settings actions. A bounded allow-list of the action
// namespace prevents URI-like values, package extras, whitespace and arbitrary
// intent payloads from crossing the Hands boundary.
const androidSettingsAction = z.string().max(128).regex(/^android\.settings\.[A-Z0-9_]+$/)
export const openSettingsHandsSchema = z.object({
  action: androidSettingsAction.optional(),
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
  try {
    await Linking.openURL(parsed.url)
    return { status: 'intent_launched', url: parsed.url, verified: false }
  } catch {
    return { status: 'open_url_failed', url: parsed.url, verified: false }
  }
}

export async function executeOpenSettings(args: z.infer<typeof openSettingsHandsSchema>) {
  if (Platform.OS !== 'android') return { status: 'unsupported_platform', verified: false }
  const parsed = openSettingsHandsSchema.parse(args)
  const action = parsed.action ?? 'android.settings.SETTINGS'
  try {
    await IntentLauncher.startActivityAsync(action)
    return { status: 'intent_launched', action, verified: false }
  } catch {
    return { status: 'settings_launch_failed', action, verified: false }
  }
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
