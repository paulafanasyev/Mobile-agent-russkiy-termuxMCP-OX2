/**
 * Runtime-bound identity — P0 Step 1.
 *
 * ИНВАРИАНТЫ:
 * 1. Здесь НЕТ параметров привилегий. Identity отвечает «КТО», а разрешение
 *    измеряет capability.ts отдельным слоем.
 * 2. Бренды делают типы неподделываемыми структурно.
 * 3. Call-sites фабрик контролируются статическим стражем (шаг 6 проекта):
 *    разрешены только bootstrap/auth-флоу приложения.
 */

const identityBrand: unique symbol = Symbol('identityBrand');
export type RuntimeIdentity = {
  readonly [identityBrand]: true;
  readonly kind: SessionKind;
  readonly sessionId: string;
  readonly startedAtIso: string;
};

export type SessionKind = 'device-owner' | 'guest';

const contextBrand: unique symbol = Symbol('contextBrand');
export type AuthenticatedRuntimeContext = {
  readonly [contextBrand]: true;
  readonly identity: RuntimeIdentity;
};

let seq = 0;
function mintId(prefix: string): string {
  seq = (seq + 1) % Number.MAX_SAFE_INTEGER;
  return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function make(kind: SessionKind): RuntimeIdentity {
  return {
    [identityBrand]: true,
    kind,
    sessionId: mintId(kind),
    startedAtIso: new Date().toISOString(),
  };
}

export function createOwnerSession(): AuthenticatedRuntimeContext {
  return { [contextBrand]: true, identity: make('device-owner') };
}

export function createGuestSession(): AuthenticatedRuntimeContext {
  return { [contextBrand]: true, identity: make('guest') };
}

export function identityOf(ctx: AuthenticatedRuntimeContext): RuntimeIdentity {
  return ctx.identity;
}
