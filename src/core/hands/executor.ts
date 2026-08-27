import type { HandsAction } from './action-plan';

export interface HandsExecutionContext {
  requestId: string;
  approved: boolean;
}

export interface HandsExecutionResult {
  status: 'executed' | 'needs_approval' | 'unsupported';
  actionType: HandsAction['type'];
  message: string;
}

/**
 * Deliberately platform-neutral. Android implementations must register an
 * adapter; the default never pretends an action was executed.
 */
export interface HandsAdapter {
  supports(action: HandsAction): boolean;
  execute(action: HandsAction, context: HandsExecutionContext): Promise<HandsExecutionResult>;
}

export class FailClosedHandsExecutor {
  constructor(private readonly adapters: readonly HandsAdapter[] = []) {}

  async execute(action: HandsAction, context: HandsExecutionContext): Promise<HandsExecutionResult> {
    const adapter = this.adapters.find((candidate) => candidate.supports(action));
    if (!adapter) {
      return {
        status: 'unsupported',
        actionType: action.type,
        message: `No Android adapter registered for ${action.type}.`,
      };
    }
    if (!context.approved) {
      return {
        status: 'needs_approval',
        actionType: action.type,
        message: `Approval required for ${action.type}.`,
      };
    }
    return adapter.execute(action, context);
  }
}
