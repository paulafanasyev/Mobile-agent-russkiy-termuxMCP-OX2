import * as IntentLauncher from 'expo-intent-launcher'
import { Platform } from 'react-native'
import { z } from 'zod'

export const alarmHandsSchema = z.object({
  hour: z.number().int().min(0).max(23),
  minutes: z.number().int().min(0).max(59),
  message: z.string().max(500).optional(),
})

export const calendarHandsSchema = z.object({
  title: z.string().min(1).max(500),
  startMs: z.number().finite(),
  endMs: z.number().finite().optional(),
  location: z.string().max(500).optional(),
})

export const callHandsSchema = z.object({ phone: z.string().regex(/^\+?[0-9][0-9 .()\-]{2,30}$/) })
export const smsHandsSchema = z.object({ phone: z.string().regex(/^\+?[0-9][0-9 .()\-]{2,30}$/), message: z.string().max(4096) })
export const messageHandsSchema = smsHandsSchema

const unsupported = (status: string) => ({ status, verified: false })

export async function executeSetAlarm(args: z.infer<typeof alarmHandsSchema>) {
  if (Platform.OS !== 'android') return unsupported('unsupported_platform')
  const parsed = alarmHandsSchema.parse(args)
  await IntentLauncher.startActivityAsync('android.intent.action.SET_ALARM', {
    extra: {
      'android.intent.extra.alarm.HOUR': parsed.hour,
      'android.intent.extra.alarm.MINUTES': parsed.minutes,
      ...(parsed.message ? { 'android.intent.extra.alarm.MESSAGE': parsed.message } : {}),
    },
  })
  return { status: 'intent_launched', verified: true, hour: parsed.hour, minutes: parsed.minutes }
}

export async function executeCreateCalendarEvent(args: z.infer<typeof calendarHandsSchema>) {
  if (Platform.OS !== 'android') return unsupported('unsupported_platform')
  const parsed = calendarHandsSchema.parse(args)
  const endMs = parsed.endMs ?? parsed.startMs + 3600000
  await IntentLauncher.startActivityAsync('android.intent.action.INSERT', {
    data: 'content://com.android.calendar/events',
    extra: {
      'title': parsed.title,
      'beginTime': parsed.startMs,
      'endTime': endMs,
      ...(parsed.location ? { 'eventLocation': parsed.location } : {}),
    },
  })
  return { status: 'intent_launched', verified: true, title: parsed.title }
}

export async function executeCall(args: z.infer<typeof callHandsSchema>) {
  if (Platform.OS !== 'android') return unsupported('unsupported_platform')
  const parsed = callHandsSchema.parse(args)
  await IntentLauncher.startActivityAsync('android.intent.action.DIAL', { data: `tel:${parsed.phone.replace(/[^+0-9]/g, '')}` })
  return { status: 'intent_launched', verified: true, phone: parsed.phone }
}

export async function executeSendSms(args: z.infer<typeof smsHandsSchema>) {
  if (Platform.OS !== 'android') return unsupported('unsupported_platform')
  const parsed = smsHandsSchema.parse(args)
  await IntentLauncher.startActivityAsync('android.intent.action.SENDTO', {
    data: `smsto:${parsed.phone.replace(/[^+0-9]/g, '')}`,
    extra: { sms_body: parsed.message },
  })
  return { status: 'intent_launched', verified: true, phone: parsed.phone }
}

export async function executeSendMessage(args: z.infer<typeof messageHandsSchema>) {
  return executeSendSms(args)
}
