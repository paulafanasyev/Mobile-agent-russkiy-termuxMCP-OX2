import { describe, expect, it } from 'vitest';
import { HandsWorkerRegistry } from './worker-registry';

describe('HandsWorkerRegistry', () => {
  it('does not select a worker before a fresh heartbeat', () => {
    const registry = new HandsWorkerRegistry();
    registry.register({
      workerId: 'android-1',
      platform: 'android',
      capabilities: ['tap'],
      state: 'unknown',
      lastHeartbeatMs: null,
    });

    expect(registry.select('tap')).toBeUndefined();
  });

  it('selects only an online worker with the requested capability', () => {
    const registry = new HandsWorkerRegistry();
    registry.register({
      workerId: 'termux',
      platform: 'termux',
      capabilities: ['tap'],
      state: 'unknown',
      lastHeartbeatMs: null,
      cost: 0,
    });
    registry.register({
      workerId: 'android',
      platform: 'android',
      capabilities: ['tap', 'screenshot'],
      state: 'unknown',
      lastHeartbeatMs: null,
      cost: 1,
    });

    registry.heartbeat({ workerId: 'android', atMs: 1000 });
    registry.refresh({ nowMs: 1500, heartbeatTtlMs: 1000 });

    expect(registry.select('tap')?.workerId).toBe('android');
    expect(registry.select('type_text')).toBeUndefined();
  });

  it('marks a worker stale when its heartbeat expires', () => {
    const registry = new HandsWorkerRegistry();
    registry.register({
      workerId: 'android',
      platform: 'android',
      capabilities: ['tap'],
      state: 'unknown',
      lastHeartbeatMs: null,
    });

    registry.heartbeat({ workerId: 'android', atMs: 1000 });
    registry.refresh({ nowMs: 3001, heartbeatTtlMs: 2000 });

    expect(registry.get('android')?.state).toBe('stale');
    expect(registry.select('tap')).toBeUndefined();
  });

  it('rejects heartbeats from unknown workers', () => {
    const registry = new HandsWorkerRegistry();
    expect(() => registry.heartbeat({ workerId: 'missing', atMs: 1 })).toThrow('Unknown worker');
  });
});
