import type { HandsActionType, HandsRisk } from './action-model'

export type HandsCapability = {
  type: HandsActionType
  risk: HandsRisk
  executorId: string | null
  availabilityStatus: 'implemented' | 'planned' | 'unavailable'
}

// Single source of truth for the action vocabulary. Capabilities without a
// registered native executor are deliberately not marked implemented.
export const HANDS_CAPABILITIES: readonly HandsCapability[] = [
  { type: 'launch_app', risk: 'medium', executorId: null, availabilityStatus: 'planned' },
  { type: 'open_url', risk: 'low', executorId: null, availabilityStatus: 'planned' },
  { type: 'tap', risk: 'medium', executorId: null, availabilityStatus: 'planned' },
  { type: 'double_tap', risk: 'medium', executorId: null, availabilityStatus: 'planned' },
  { type: 'long_press', risk: 'medium', executorId: null, availabilityStatus: 'planned' },
  { type: 'swipe', risk: 'low', executorId: null, availabilityStatus: 'planned' },
  { type: 'drag', risk: 'medium', executorId: null, availabilityStatus: 'planned' },
  { type: 'type_text', risk: 'medium', executorId: null, availabilityStatus: 'planned' },
  { type: 'clear_text', risk: 'medium', executorId: null, availabilityStatus: 'planned' },
  { type: 'select_text', risk: 'medium', executorId: null, availabilityStatus: 'planned' },
  { type: 'copy', risk: 'low', executorId: null, availabilityStatus: 'planned' },
  { type: 'paste', risk: 'medium', executorId: null, availabilityStatus: 'planned' },
  { type: 'scroll', risk: 'low', executorId: null, availabilityStatus: 'planned' },
  { type: 'back', risk: 'low', executorId: null, availabilityStatus: 'planned' },
  { type: 'home', risk: 'medium', executorId: null, availabilityStatus: 'planned' },
  { type: 'recents', risk: 'medium', executorId: null, availabilityStatus: 'planned' },
  { type: 'wait', risk: 'low', executorId: null, availabilityStatus: 'planned' },
  { type: 'read_screen', risk: 'low', executorId: null, availabilityStatus: 'planned' },
  { type: 'screenshot', risk: 'low', executorId: null, availabilityStatus: 'planned' },
  { type: 'find_text', risk: 'low', executorId: null, availabilityStatus: 'planned' },
  { type: 'find_element', risk: 'low', executorId: null, availabilityStatus: 'planned' },
  { type: 'press_key', risk: 'medium', executorId: null, availabilityStatus: 'planned' },
  { type: 'set_volume', risk: 'medium', executorId: null, availabilityStatus: 'planned' },
  { type: 'set_brightness', risk: 'medium', executorId: null, availabilityStatus: 'planned' },
  { type: 'toggle_flashlight', risk: 'medium', executorId: null, availabilityStatus: 'planned' },
  { type: 'open_settings', risk: 'medium', executorId: null, availabilityStatus: 'planned' },
  { type: 'set_alarm', risk: 'medium', executorId: null, availabilityStatus: 'planned' },
  { type: 'create_calendar_event', risk: 'medium', executorId: null, availabilityStatus: 'planned' },
  { type: 'call', risk: 'high', executorId: null, availabilityStatus: 'planned' },
  { type: 'send_sms', risk: 'high', executorId: null, availabilityStatus: 'planned' },
  { type: 'send_message', risk: 'high', executorId: null, availabilityStatus: 'planned' },
  { type: 'share', risk: 'medium', executorId: null, availabilityStatus: 'planned' },
  { type: 'file_read', risk: 'medium', executorId: null, availabilityStatus: 'planned' },
  { type: 'file_write', risk: 'high', executorId: null, availabilityStatus: 'planned' },
  { type: 'file_move', risk: 'high', executorId: null, availabilityStatus: 'planned' },
  { type: 'file_delete', risk: 'critical', executorId: null, availabilityStatus: 'planned' },
  { type: 'file_rename', risk: 'medium', executorId: null, availabilityStatus: 'planned' },
  { type: 'camera', risk: 'medium', executorId: null, availabilityStatus: 'planned' },
  { type: 'play_media', risk: 'low', executorId: null, availabilityStatus: 'planned' },
  { type: 'pause_media', risk: 'low', executorId: null, availabilityStatus: 'planned' },
  { type: 'next_media', risk: 'low', executorId: null, availabilityStatus: 'planned' },
  { type: 'custom_tool', risk: 'high', executorId: null, availabilityStatus: 'planned' },
]

const CAPABILITY_BY_TYPE = new Map(HANDS_CAPABILITIES.map((capability) => [capability.type, capability]))

export function getHandsCapability(type: HandsActionType): HandsCapability {
  const capability = CAPABILITY_BY_TYPE.get(type)
  if (!capability) throw new Error(`Unknown Hands capability: ${type}`)
  return capability
}
