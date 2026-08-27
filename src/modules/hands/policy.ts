import type { HandsAction, HandsExecutionMode, HandsRisk } from './action-model';
import { actionPolicy } from './action-model';

export function classifyRisk(action: HandsAction): HandsRisk {
  return actionPolicy(action.type).risk;
}

export function requiresApproval(action: HandsAction, mode: HandsExecutionMode): boolean {
  const policy = actionPolicy(action.type);
  if (policy.requiresApproval) return true;
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
  if (action.type === 'custom_tool') {
    return { allowed: false, requiresApproval: true, risk, reason: 'Неизвестный инструмент заблокирован до явной регистрации реального executor.' };
  }
  return { allowed: true, requiresApproval: requiresApproval(action, mode), risk };
}
