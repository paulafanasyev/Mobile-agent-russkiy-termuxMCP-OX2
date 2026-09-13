/**
 * Fail-closed worker registry inspired by PROJECT-NAS BOB.
 *
 * This is deliberately a control-plane primitive: it describes workers and
 * their capabilities, but it never executes commands or grants permissions.
 * A worker is selectable only while its heartbeat is fresh and the requested
 * capability is explicitly declared.
 */

export type HandsWorkerState = 'unknown' | 'online' | 'stale' | 'offline';

export interface HandsWorker {
  workerId: string;
  platform: 'android' | 'termux' | 'pc' | 'web' | 'unknown';
  capabilities: readonly string[];
  cost?: number;
  state: HandsWorkerState;
  lastHeartbeatMs: number | null;
  metadata?: Readonly<Record<string, string>>;
}

export interface WorkerHeartbeat {
  workerId: string;
  atMs: number;
}

export interface WorkerSelectionPolicy {
  nowMs: number;
  heartbeatTtlMs: number;
}

export class HandsWorkerRegistry {
  private readonly workers = new Map<string, HandsWorker>();

  register(worker: HandsWorker): void {
    if (!worker.workerId.trim()) throw new Error('workerId must not be empty.');
    if (!Number.isFinite(worker.cost ?? 0) || (worker.cost ?? 0) < 0) {
      throw new Error('Worker cost must be a non-negative finite number.');
    }
    if (!Number.isInteger(worker.lastHeartbeatMs) && worker.lastHeartbeatMs !== null) {
      throw new Error('lastHeartbeatMs must be an integer or null.');
    }
    this.workers.set(worker.workerId, {
      ...worker,
      capabilities: [...new Set(worker.capabilities.map((value) => value.trim()).filter(Boolean))],
      cost: worker.cost ?? 0,
    });
  }

  heartbeat(heartbeat: WorkerHeartbeat): void {
    const worker = this.workers.get(heartbeat.workerId);
    if (!worker) throw new Error('Unknown worker cannot heartbeat.');
    if (!Number.isInteger(heartbeat.atMs)) throw new Error('Heartbeat timestamp must be an integer.');
    this.workers.set(heartbeat.workerId, {
      ...worker,
      state: 'online',
      lastHeartbeatMs: heartbeat.atMs,
    });
  }

  get(workerId: string): HandsWorker | undefined {
    return this.workers.get(workerId);
  }

  /**
   * Refreshes derived liveness without ever upgrading an unknown/stale worker
   * merely because it advertises a capability.
   */
  refresh(policy: WorkerSelectionPolicy): void {
    if (!Number.isInteger(policy.nowMs) || !Number.isInteger(policy.heartbeatTtlMs) || policy.heartbeatTtlMs <= 0) {
      throw new Error('Invalid worker liveness policy.');
    }

    for (const [workerId, worker] of this.workers) {
      const fresh = worker.lastHeartbeatMs !== null &&
        policy.nowMs - worker.lastHeartbeatMs >= 0 &&
        policy.nowMs - worker.lastHeartbeatMs <= policy.heartbeatTtlMs;
      this.workers.set(workerId, {
        ...worker,
        state: fresh ? 'online' : worker.lastHeartbeatMs === null ? 'unknown' : 'stale',
      });
    }
  }

  /**
   * Selection is deterministic and fail-closed: only online workers with an
   * explicit capability are returned. Authorization remains outside this
   * registry and must be enforced before execution.
   */
  select(capability: string): HandsWorker | undefined {
    const normalized = capability.trim();
    if (!normalized) return undefined;

    return [...this.workers.values()]
      .filter((worker) => worker.state === 'online' && worker.capabilities.includes(normalized))
      .sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0) || a.workerId.localeCompare(b.workerId))[0];
  }

  list(): readonly HandsWorker[] {
    return [...this.workers.values()];
  }
}
