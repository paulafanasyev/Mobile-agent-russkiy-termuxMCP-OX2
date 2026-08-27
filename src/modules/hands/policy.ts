import type { HandsAction, HandsExecutionMode, HandsRisk } from './action-model';

const APPROVAL_REQUIRED: ReadonlySet<HandsAction['type']> = new Set([
  'call','send_sms','send_message','file_delete','file_write','file_move','file_rename',
  'share','set_volume','set_brightness','toggle_flashlight','set_alarm','create_calendar_event',
  'camera','custom_tool',
]);

const RISK_BY_ACTION: Partial<Record<HandsAction['type'], HandsRisk>> = {
  launch_app: 'low', open_url: 'low', tap: 'low', double_tap: 'low', long_press: 'medium',
  swipe: 'low', drag: 'medium', type_text: 'medium', clear_text: 'medium', select_text: 'low',
  copy: 'low', paste: 'medium', scroll: 'low', back: 'low', home: 'low', recents: 'low', wait: 'low',
  read_screen: 'low', screenshot: 'medium', find_text: 'low', find_element: 'low', press_key: 'medium',
  set_volume: 'medium', set_brightness: 'medium', toggle_flashlight: 'medium', open_settings: 'low',
  set_alarm: 'medium', create_calendar_event: 'medium', call: 'critical', send_sms: 'critical',
  send_message: 'high', share: 'high', file_read: 'medium', file_write: 'high', file_move: 'high',
  file_delete: 'critical', file_rename: 'medium', camera: 'high', play_media: 'low', pause_media: 'low',
  next_media: 'low', custom_tool: 'high',
};

export function classifyRisk(action: HandsAction): HandsRisk {
  return RISK_BY_ACTION[action.type] ?? action.risk;
}

export function requiresApproval(action: HandsAction, mode: HandsExecutionMode): boolean {
  if (APPROVAL_REQUIRED.has(action.type)) return true;
  if (classifyRisk(action) === 'critical') return true;
  return mode === 'assist' && classifyRisk(action) !== 'low';
}

export interface HandsPolicyDecision {
  allowed: boolean;
  requiresApproval: boolean;
  risk: HandsRisk;
  reason?: string;
}

export function evaluateAction(action: HandsAction, mode: HandsExecutionMode): HandsPolicyDecision {
  const risk = classifyRisk(action);
  if (risk === 'critical' && action.type === 'custom_tool') {
    return { allowed: false, requiresApproval: true, risk, reason: 'Неизвестный инструмент заблокирован до явного разрешения и регистрации.' };
  }
  return { allowed: true, requiresApproval: requiresApproval(action, mode), risk };
}
