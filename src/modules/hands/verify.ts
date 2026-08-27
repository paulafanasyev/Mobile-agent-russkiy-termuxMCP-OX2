import type { HandsAction, HandsObservation, HandsStepResult } from './action-model';

export interface HandsVerifier {
  verify(action: HandsAction, observation: HandsObservation): HandsStepResult;
}

function normalize(value: string): string { return value.trim().toLocaleLowerCase(); }

export function createHandsVerifier(): HandsVerifier {
  return {
    verify(action, observation) {
      const expected = action.postconditions ?? [];
      if (expected.length === 0) {
        return { actionId: action.id, status: 'failed', observation, error: 'Действие нельзя подтвердить: отсутствуют postconditions.' };
      }
      const haystack = observation.visibleText.map(normalize);
      const missing = expected.filter((condition) => {
        const needle = normalize(condition);
        return needle.length === 0 || !haystack.some((text) => text.includes(needle));
      });
      if (missing.length === 0) return { actionId: action.id, status: 'success', observation };
      return { actionId: action.id, status: 'failed', observation, error: `Не подтверждено состояние после действия: ${missing.join(', ')}` };
    },
  };
}

/** Strict boundary used by executors: unverified native execution can never become success. */
export function normalizeExecutionResult(action: HandsAction, result: HandsStepResult): HandsStepResult {
  if (result.status !== 'success') return result;
  if (!(action.postconditions?.length)) {
    return { ...result, status: 'failed', error: 'Нельзя объявить Hands-действие успешным без postcondition.' };
  }
  return result;
}

export function shouldReplan(result: HandsStepResult, action: HandsAction, attempt: number): boolean {
  return result.status === 'failed' && action.retryable && attempt < 2;
}
