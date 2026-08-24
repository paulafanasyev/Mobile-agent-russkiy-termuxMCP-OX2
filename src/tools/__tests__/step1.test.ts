import { describe, expect, it } from 'vitest';
import {
  CAPABILITY_LEVELS,
  RISK_LEVELS,
  nonEmptyString,
  positiveInt,
  toolIdSchema,
} from '../types';
import {
  createGuestSession,
  createOwnerSession,
  identityOf,
} from '../identity';
import { createFailClosedDetector, isFresh, satisfies } from '../capability';

describe('types: enums', () => {
  it('fixes capability order', () => {
    expect([...CAPABILITY_LEVELS]).toEqual([
      'NO_PRIVILEGE',
      'SHIZUKU_AVAILABLE',
      'ROOT_AVAILABLE',
    ]);
  });
  it('exposes risk levels', () => {
    expect(RISK_LEVELS).toContain('critical');
  });
});

describe('identity: brands + factories', () => {
  it('owner session carries device-owner kind', () => {
    const ctx = createOwnerSession();
    expect(identityOf(ctx).kind).toBe('device-owner');
    expect(identityOf(ctx).sessionId.length).toBeGreaterThan(0);
  });
  it('guest session distinct from owner', () => {
    expect(identityOf(createGuestSession()).kind).toBe('guest');
  });
  it('session ids are unique', () => {
    const a = identityOf(createOwnerSession()).sessionId;
    const b = identityOf(createOwnerSession()).sessionId;
    expect(a).not.toBe(b);
  });
});

describe('capability: fail-closed semantics', () => {
  it('default detector yields NO_PRIVILEGE only', async () => {
    const snap = await createFailClosedDetector().probe();
    expect(snap.level).toBe('NO_PRIVILEGE');
    expect(snap.source).toBe('fail-closed-default');
  });
  it('NO_PRIVILEGE satisfies nothing above itself', async () => {
    const snap = await createFailClosedDetector().probe();
    expect(satisfies(snap, 'NO_PRIVILEGE')).toBe(true);
    expect(satisfies(snap, 'SHIZUKU_AVAILABLE')).toBe(false);
    expect(satisfies(snap, 'ROOT_AVAILABLE')).toBe(false);
  });
  it('snapshot freshness respects TTL', async () => {
    const snap = await createFailClosedDetector(1000).probe();
    expect(isFresh(snap, Date.now())).toBe(true);
    expect(isFresh(snap, Date.now() + 60_000)).toBe(false);
  });
});

describe('schema helpers', () => {
  it('validates tool ids', () => {
    expect(toolIdSchema.safeParse('ai.chat').success).toBe(true);
    expect(toolIdSchema.safeParse('Bad Id!').success).toBe(false);
  });
  it('nonEmptyString rejects empty', () => {
    expect(nonEmptyString.safeParse('').success).toBe(false);
    expect(positiveInt.safeParse(0).success).toBe(false);
  });
});
