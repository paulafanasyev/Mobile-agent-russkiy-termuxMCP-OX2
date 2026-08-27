import type { HandsAction, HandsExecutionMode, HandsTaskPlan } from './action-model';
import { evaluateAction } from './policy';
import { HANDS_CAPABILITY_COUNT, getHandsCapability } from './capability-registry';

export interface HandsPlanner { plan(goal: string, mode: HandsExecutionMode, actions: HandsAction[]): HandsTaskPlan; }

function validatePostconditions(action: HandsAction): void {
  const conditions = action.postconditions ?? [];
  if (conditions.length === 0 || conditions.some((value) => !value.trim())) throw new Error(`Hands action ${action.id || action.type} has no valid postconditions; unverifiable actions are rejected.`);
}

export function createHandsPlanner(): HandsPlanner {
  return {
    plan(goal, mode, actions) {
      if (!goal.trim()) throw new Error('Hands goal is required.');
      if (actions.length === 0 || actions.length > HANDS_CAPABILITY_COUNT) throw new Error(`Invalid Hands action count: max ${HANDS_CAPABILITY_COUNT}.`);
      const taskId = `hands:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
      const normalized = actions.map((action, index) => {
        const id = action.id || `${taskId}:${index + 1}`;
        const candidate = { ...action, id };
        const capability = getHandsCapability(candidate.type);
        if (capability.availabilityStatus !== 'implemented') throw new Error(`Hands capability ${candidate.type} is ${capability.availabilityStatus}; no executable path is declared.`);
        const decision = evaluateAction(candidate, mode);
        if (!decision.allowed) throw new Error(decision.reason ?? `Hands action ${id} is not allowed.`);
        validatePostconditions(candidate);
        return { ...candidate, risk: decision.risk, requiresApproval: decision.requiresApproval, timeoutMs: Math.max(250, Math.min(action.timeoutMs || capability.timeoutMs, capability.timeoutMs)), retryable: action.retryable !== false };
      });
      return { taskId, goal, mode, actions: normalized, createdAtIso: new Date().toISOString() };
    },
  };
}
