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
