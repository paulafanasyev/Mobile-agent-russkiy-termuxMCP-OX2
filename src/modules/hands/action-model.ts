/** Universal Hands action vocabulary. Pure TypeScript: no Android dependency. */
export const HANDS_ACTIONS = [
  'launch_app','open_url','tap','double_tap','long_press','swipe','drag','type_text',
  'clear_text','select_text','copy','paste','scroll','back','home','recents','wait',
  'read_screen','screenshot','find_text','find_element','press_key','set_volume',
  'set_brightness','toggle_flashlight','open_settings','set_alarm','create_calendar_event',
  'call','send_sms','send_message','share','file_read','file_write','file_move',
  'file_delete','file_rename','camera','play_media','pause_media','next_media','custom_tool',
] as const;

export type HandsActionType = (typeof HANDS_ACTIONS)[number];
export type HandsRisk = 'low' | 'medium' | 'high' | 'critical';
export type HandsExecutionMode = 'assist' | 'autonomous' | 'full_task';

export interface HandsTarget {
  text?: string;
  contentDescription?: string;
  resourceId?: string;
  packageName?: string;
  x?: number;
  y?: number;
}

export interface HandsAction {
  id: string;
  type: HandsActionType;
  args: Record<string, unknown>;
  target?: HandsTarget;
  risk: HandsRisk;
  requiresApproval: boolean;
  timeoutMs: number;
  preconditions?: string[];
  /** Success evidence is mandatory. An empty/omitted list is never proof of completion. */
  postconditions?: string[];
  retryable: boolean;
}

export interface HandsObservation {
  timestampIso: string;
  packageName?: string;
  activityName?: string;
  visibleText: string[];
  accessibilityAvailable: boolean;
  screenshotAvailable: boolean;
  focusedText?: string;
  /** Stable evidence for comparing UI state before/after an action. */
  fingerprint?: string;
}

export interface HandsStepResult {
  actionId: string;
  status: 'success' | 'failed' | 'needs_approval' | 'unavailable';
  observation?: HandsObservation;
  error?: string;
}

export interface HandsTaskPlan {
  taskId: string;
  goal: string;
  mode: HandsExecutionMode;
  actions: HandsAction[];
  createdAtIso: string;
}

/**
 * Universal capability metadata. This does not reduce the vocabulary: it tells
 * the runtime which operations are destructive/external and therefore require
 * stronger policy and verification.
 */
export const HANDS_ACTION_POLICY: Record<HandsActionType, { risk: HandsRisk; requiresApproval: boolean }> = {
  launch_app: { risk: 'low', requiresApproval: false }, open_url: { risk: 'low', requiresApproval: false },
  tap: { risk: 'low', requiresApproval: false }, double_tap: { risk: 'low', requiresApproval: false },
  long_press: { risk: 'low', requiresApproval: false }, swipe: { risk: 'low', requiresApproval: false },
  drag: { risk: 'medium', requiresApproval: false }, type_text: { risk: 'medium', requiresApproval: true },
  clear_text: { risk: 'medium', requiresApproval: true }, select_text: { risk: 'low', requiresApproval: false },
  copy: { risk: 'medium', requiresApproval: false }, paste: { risk: 'medium', requiresApproval: true },
  scroll: { risk: 'low', requiresApproval: false }, back: { risk: 'low', requiresApproval: false },
  home: { risk: 'low', requiresApproval: false }, recents: { risk: 'low', requiresApproval: false }, wait: { risk: 'low', requiresApproval: false },
  read_screen: { risk: 'low', requiresApproval: false }, screenshot: { risk: 'low', requiresApproval: false },
  find_text: { risk: 'low', requiresApproval: false }, find_element: { risk: 'low', requiresApproval: false },
  press_key: { risk: 'medium', requiresApproval: false }, set_volume: { risk: 'medium', requiresApproval: false },
  set_brightness: { risk: 'medium', requiresApproval: false }, toggle_flashlight: { risk: 'medium', requiresApproval: false },
  open_settings: { risk: 'medium', requiresApproval: false }, set_alarm: { risk: 'high', requiresApproval: true },
  create_calendar_event: { risk: 'high', requiresApproval: true }, call: { risk: 'critical', requiresApproval: true },
  send_sms: { risk: 'critical', requiresApproval: true }, send_message: { risk: 'critical', requiresApproval: true },
  share: { risk: 'high', requiresApproval: true }, file_read: { risk: 'medium', requiresApproval: false },
  file_write: { risk: 'high', requiresApproval: true }, file_move: { risk: 'high', requiresApproval: true },
  file_delete: { risk: 'critical', requiresApproval: true }, file_rename: { risk: 'high', requiresApproval: true },
  camera: { risk: 'medium', requiresApproval: true }, play_media: { risk: 'low', requiresApproval: false },
  pause_media: { risk: 'low', requiresApproval: false }, next_media: { risk: 'low', requiresApproval: false }, custom_tool: { risk: 'critical', requiresApproval: true },
};

export function actionPolicy(type: HandsActionType) { return HANDS_ACTION_POLICY[type]; }
