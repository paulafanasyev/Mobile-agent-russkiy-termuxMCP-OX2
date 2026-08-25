/**
 * Capability layer — P0 Step 1. FAIL-CLOSED.
 *
 * SHIZUKU_AVAILABLE / ROOT_AVAILABLE появляются ТОЛЬКО из реально проверенного
 * состояния рантайма. Пока нативные мосты не интегрированы, детектор возвращает
 * исключительно NO_PRIVILEGE. Выбрать уровень строкой невозможно.
 */
import type { CapabilityLevel } from './types';

const snapshotBrand: unique symbol = Symbol('snapshotBrand');

export type CapabilitySnapshot = {
  readonly [snapshotBrand]: true;
  readonly level: CapabilityLevel;
  readonly probedAtIso: string;
  readonly validUntilEpochMs: number;
  readonly source: 'fail-closed-default';
};

const ORDER: Readonly<Record<CapabilityLevel, number>> = {
  NO_PRIVILEGE: 0,
  SHIZUKU_AVAILABLE: 1,
  ROOT_AVAILABLE: 2,
};

export function satisfies(
  snapshot: CapabilitySnapshot,
  required: CapabilityLevel,
): boolean {
  return ORDER[snapshot.level] >= ORDER[required];
}

export function isFresh(
  snapshot: CapabilitySnapshot,
  nowEpochMs: number = Date.now(),
): boolean {
  return nowEpochMs <= snapshot.validUntilEpochMs;
}

export interface CapabilityProbeResult {
  readonly level: CapabilityLevel;
  readonly probedAtIso: string;
  readonly validUntilEpochMs: number;
  readonly source: 'fail-closed-default';
}

export interface CapabilityDetector {
  probe(): Promise<CapabilityProbeResult>;
}

const DEFAULT_TTL_MS = 30_000;

function brand(r: CapabilityProbeResult): CapabilitySnapshot {
  return { [snapshotBrand]: true, ...r };
}

/**
 * Детектор v1 — FAIL-CLOSED. Всегда NO_PRIVILEGE.
 * TODO(P0-integration): составной детектор shizukuBinderPing() | rootSuProbe().
 */
export function createFailClosedDetector(ttlMs: number = DEFAULT_TTL_MS): {
  probe(): Promise<CapabilitySnapshot>;
} {
  return {
    async probe(): Promise<CapabilitySnapshot> {
      const now = Date.now();
      return brand({
        level: 'NO_PRIVILEGE',
        probedAtIso: new Date(now).toISOString(),
        validUntilEpochMs: now + ttlMs,
        source: 'fail-closed-default',
      });
    },
  };
}
