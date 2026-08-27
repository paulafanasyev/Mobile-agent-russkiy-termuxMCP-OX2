import type { HandsAction, HandsExecutionMode, HandsTaskPlan } from './action-model';
import { evaluateAction } from './policy';

export interface HandsPlanner {
  plan(goal: string, mode: HandsExecutionMode, actions: HandsAction[]): HandsTaskPlan;
}

/**
 * Planner boundary. LLMs may produce candidate actions, but the engine owns
 * validation, IDs, defaults and policy metadata before execution.
 */
export function createHandsPlanner(): HandsPlanner {
  return {
    plan(goal, mode, actions) {
      const taskId = `hands:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
      const normalized = actions.map((action, index) => {
        const decision = evaluateAction(action, mode);
        return {
          ...action,
          id: action.id || `${taskId}:${index + 1}`,
          risk: decision.risk,
          requiresApproval: decision.requiresApproval,
          timeoutMs: Math.max(250, action.timeoutMs || 10_000),
          retryable: action.retryable !== false,
        };
      });
      return { taskId, goal, mode, actions: normalized, createdAtIso: new Date().toISOString() };
    },
  };
}
