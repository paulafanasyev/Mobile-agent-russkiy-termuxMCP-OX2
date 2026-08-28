import type { HandsActionType } from './action-model';

export type HandsCapabilityAvailability = 'implemented' | 'planned' | 'unavailable';

export interface HandsCapability {
  type: HandsActionType;
  executorId: string;
  availabilityStatus: HandsCapabilityAvailability;
}

/**
 * Authoritative capability registry. Empty executorId means the action has no
 * registered runtime executor yet; such actions are never treated as implemented.
 */
export const HANDS_CAPABILITIES: HandsCapability[] = [];

export function getHandsCapability(type: HandsActionType): HandsCapability {
  const capability = HANDS_CAPABILITIES.find((item) => item.type === type);
  if (!capability) {
    return { type, executorId: '', availabilityStatus: 'unavailable' };
  }
  return capability;
}
