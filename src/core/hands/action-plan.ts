/** Universal Hands action model. Planning is data-only; execution stays in Android adapters. */
export type HandsActionRisk = 'low' | 'medium' | 'high' | 'critical';

export type HandsAction =
  | { type: 'open_app'; packageName: string }
  | { type: 'open_url'; url: string }
  | { type: 'tap'; x: number; y: number }
  | { type: 'long_press'; x: number; y: number; durationMs?: number }
  | { type: 'swipe'; fromX: number; fromY: number; toX: number; toY: number; durationMs?: number }
  | { type: 'type_text'; text: string; replace?: boolean }
  | { type: 'key'; key: 'BACK' | 'HOME' | 'RECENTS' | 'ENTER' | 'ESCAPE' }
  | { type: 'clipboard_set'; text: string }
  | { type: 'clipboard_get' }
  | { type: 'wait'; durationMs: number }
  | { type: 'screenshot' };

export interface PlannedHandsAction {
  id: string;
  action: HandsAction;
  risk: HandsActionRisk;
  requiresConfirmation: boolean;
  reason: string;
}

export interface HandsPlan {
  version: '1.0';
  goal: string;
  actions: PlannedHandsAction[];
}

export const HANDS_ACTION_LIMITS = {
  maxActions: 40,
  maxTextLength: 10_000,
  maxWaitMs: 30_000,
} as const;

export function actionRisk(action: HandsAction): HandsActionRisk {
  switch (action.type) {
    case 'type_text':
    case 'clipboard_set':
      return 'medium';
    case 'open_app':
    case 'open_url':
    case 'tap':
    case 'long_press':
    case 'swipe':
    case 'key':
    case 'clipboard_get':
    case 'wait':
    case 'screenshot':
      return 'low';
  }
}

export function requiresConfirmation(action: HandsAction): boolean {
  return action.type === 'type_text' || action.type === 'clipboard_set';
}

export function validateAction(action: HandsAction): void {
  if (action.type === 'open_app' && !/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i.test(action.packageName)) {
    throw new Error('Invalid Android package name.');
  }
  if (action.type === 'open_url') {
    const url = new URL(action.url);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Only HTTP(S) URLs are allowed.');
  }
  if (action.type === 'type_text' && action.text.length > HANDS_ACTION_LIMITS.maxTextLength) {
    throw new Error('Text input exceeds the Hands limit.');
  }
  if (action.type === 'wait' && (!Number.isInteger(action.durationMs) || action.durationMs < 0 || action.durationMs > HANDS_ACTION_LIMITS.maxWaitMs)) {
    throw new Error('Invalid wait duration.');
  }
}

export function validatePlan(plan: HandsPlan): void {
  if (plan.version !== '1.0') throw new Error('Unsupported Hands plan version.');
  if (!plan.goal.trim()) throw new Error('Hands plan goal is required.');
  if (plan.actions.length === 0 || plan.actions.length > HANDS_ACTION_LIMITS.maxActions) {
    throw new Error('Invalid Hands action count.');
  }
  for (const item of plan.actions) {
    validateAction(item.action);
    if (item.requiresConfirmation !== requiresConfirmation(item.action)) {
      throw new Error(`Confirmation policy mismatch for ${item.id}.`);
    }
  }
}
