import { describe, expect, it } from 'vitest';
import { HandsWorkerJobQueue } from './worker-job';

describe('HandsWorkerJobQueue', () => {
  it('requires a current lease holder to complete', () => {
    const queue = new HandsWorkerJobQueue();
    queue.enqueue('job-1', 'screenshot');
    queue.claim('job-1', 'android-1', { nowMs: 1000, leaseTtlMs: 5000, maxAttempts: 3 });

    expect(() => queue.complete('job-1', 'android-2')).toThrow();
    expect(queue.complete('job-1', 'android-1').state).toBe('completed');
  });

  it('defers a failed job while retry budget remains', () => {
    const queue = new HandsWorkerJobQueue();
    queue.enqueue('job-1', 'tap', 2);
    queue.claim('job-1', 'android-1', { nowMs: 1000, leaseTtlMs: 5000, maxAttempts: 2 });

    const failed = queue.fail('job-1', 'android-1', 'temporary failure');
    expect(failed.state).toBe('deferred');
    expect(failed.attempts).toBe(1);

    const second = queue.claim('job-1', 'android-2', { nowMs: 2000, leaseTtlMs: 5000, maxAttempts: 2 });
    expect(second.attempts).toBe(2);
  });

  it('fails closed after retry exhaustion', () => {
    const queue = new HandsWorkerJobQueue();
    queue.enqueue('job-1', 'tap', 1);
    queue.claim('job-1', 'android-1', { nowMs: 1000, leaseTtlMs: 1000, maxAttempts: 1 });

    const failed = queue.fail('job-1', 'android-1', 'broken');
    expect(failed.state).toBe('failed');
    expect(() => queue.claim('job-1', 'android-2', { nowMs: 3000, leaseTtlMs: 1000, maxAttempts: 1 })).toThrow();
  });

  it('recovers an expired lease without executing anything', () => {
    const queue = new HandsWorkerJobQueue();
    queue.enqueue('job-1', 'screenshot', 2);
    queue.claim('job-1', 'android-1', { nowMs: 1000, leaseTtlMs: 1000, maxAttempts: 2 });

    const recovered = queue.recoverExpired(2001);
    expect(recovered[0]?.state).toBe('deferred');
    expect(recovered[0]?.workerId).toBeNull();
  });
});
