export type HandsVerificationStatus = 'verified' | 'retryable' | 'failed';

export interface HandsObservation {
  packageName?: string;
  foregroundApp?: string;
  screenHash?: string;
  text?: string;
  timestampMs: number;
}

export type HandsPostcondition =
  | { type: 'foreground_app'; packageName: string }
  | { type: 'contains_text'; text: string }
  | { type: 'screen_changed'; fromHash: string };

export interface HandsVerificationResult {
  status: HandsVerificationStatus;
  reason: string;
}

export function verifyPostcondition(
  condition: HandsPostcondition,
  observation: HandsObservation,
): HandsVerificationResult {
  switch (condition.type) {
    case 'foreground_app':
      return observation.foregroundApp === condition.packageName
        ? { status: 'verified', reason: 'Foreground application matches.' }
        : { status: 'retryable', reason: 'Foreground application did not match.' };
    case 'contains_text':
      return observation.text?.includes(condition.text)
        ? { status: 'verified', reason: 'Expected text was observed.' }
        : { status: 'retryable', reason: 'Expected text was not observed.' };
    case 'screen_changed':
      return observation.screenHash && observation.screenHash !== condition.fromHash
        ? { status: 'verified', reason: 'Screen changed.' }
        : { status: 'retryable', reason: 'Screen did not change.' };
  }
}
