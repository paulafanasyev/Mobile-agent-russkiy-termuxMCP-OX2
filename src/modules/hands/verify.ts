import type { HandsAction, HandsObservation, HandsStepResult } from './action-model';

export interface HandsVerifier {
  verify(action: HandsAction, observation: HandsObservation): HandsStepResult;
}

function normalize(value: string): string { return value.trim().toLocaleLowerCase(); }

export function createHandsVerifier(): HandsVerifier {
  return {
    verify(action, observation) {
      const expected = action.postconditions ?? [];
      if (expected.length === 0) return { actionId: action.id, status: 'success', observation };
      const haystack = observation.visibleText.map(normalize);
      const missing = expected.filter((condition) => {
        const needle = normalize(condition);
        return needle.length > 0 && !haystack.some((text) => text.includes(needle));
      });
      if (missing.length === 0) return { actionId: action.id, status: 'success', observation };
      return {
        actionId: action.id,
        status: 'failed',
        observation,
        error: `Не подтверждено состояние после действия: ${missing.join(', ')}`,
      };
    },
  };
}

export function shouldReplan(result: HandsStepResult, action: HandsAction, attempt: number): boolean {
  return result.status === 'failed' && action.retryable && attempt < 2;
}
