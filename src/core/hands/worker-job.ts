/**
 * Bounded worker-job control plane inspired by the audited J.A.R.V.I.S mesh
 * and PROJECT-NAS worker orchestration.
 *
 * This module is intentionally execution-agnostic: it leases work to a
 * selected worker but never executes commands or grants permissions.
 */

export type WorkerJobState = 'queued' | 'leased' | 'completed' | 'failed' | 'deferred';

export interface WorkerJob {
  jobId: string;
  capability: string;
  state: WorkerJobState;
  attempts: number;
  maxAttempts: number;
  workerId: string | null;
  leaseUntilMs: number | null;
  lastError?: string;
}

export interface WorkerJobPolicy {
  nowMs: number;
  leaseTtlMs: number;
  maxAttempts: number;
}

export class HandsWorkerJobQueue {
  private readonly jobs = new Map<string, WorkerJob>();

  enqueue(jobId: string, capability: string, maxAttempts = 3): WorkerJob {
    const normalizedJobId = jobId.trim();
    const normalizedCapability = capability.trim();
    if (!normalizedJobId) throw new Error('jobId must not be empty.');
    if (!normalizedCapability) throw new Error('capability must not be empty.');
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
      throw new Error('maxAttempts must be an integer from 1 to 10.');
    }
    if (this.jobs.has(normalizedJobId)) throw new Error('Job already exists.');

    const job: WorkerJob = {
      jobId: normalizedJobId,
      capability: normalizedCapability,
      state: 'queued',
      attempts: 0,
      maxAttempts,
      workerId: null,
      leaseUntilMs: null,
    };
    this.jobs.set(normalizedJobId, job);
    return job;
  }

  get(jobId: string): WorkerJob | undefined {
    return this.jobs.get(jobId);
  }

  claim(jobId: string, workerId: string, policy: WorkerJobPolicy): WorkerJob {
    const job = this.require(jobId);
    if (!workerId.trim()) throw new Error('workerId must not be empty.');
    this.validatePolicy(policy);
    if (job.state !== 'queued' && job.state !== 'deferred') {
      throw new Error(`Job ${job.jobId} is not claimable from ${job.state}.`);
    }
    if (job.attempts >= Math.min(job.maxAttempts, policy.maxAttempts)) {
      throw new Error(`Job ${job.jobId} exhausted its retry budget.`);
    }

    const updated: WorkerJob = {
      ...job,
      state: 'leased',
      attempts: job.attempts + 1,
      workerId: workerId.trim(),
      leaseUntilMs: policy.nowMs + policy.leaseTtlMs,
      lastError: undefined,
    };
    this.jobs.set(job.jobId, updated);
    return updated;
  }

  complete(jobId: string, workerId: string): WorkerJob {
    const job = this.require(jobId);
    if (job.state !== 'leased' || job.workerId !== workerId) {
      throw new Error('Only the current lease holder can complete a job.');
    }
    const updated = { ...job, state: 'completed' as const, leaseUntilMs: null };
    this.jobs.set(job.jobId, updated);
    return updated;
  }

  fail(jobId: string, workerId: string, error: string): WorkerJob {
    const job = this.require(jobId);
    if (job.state !== 'leased' || job.workerId !== workerId) {
      throw new Error('Only the current lease holder can fail a job.');
    }
    const exhausted = job.attempts >= job.maxAttempts;
    const updated: WorkerJob = {
      ...job,
      state: exhausted ? 'failed' : 'deferred',
      workerId: null,
      leaseUntilMs: null,
      lastError: error.trim().slice(0, 1000),
    };
    this.jobs.set(job.jobId, updated);
    return updated;
  }

  recoverExpired(nowMs: number): WorkerJob[] {
    if (!Number.isInteger(nowMs)) throw new Error('nowMs must be an integer.');
    const recovered: WorkerJob[] = [];
    for (const job of this.jobs.values()) {
      if (job.state !== 'leased' || job.leaseUntilMs === null || job.leaseUntilMs > nowMs) continue;
      const exhausted = job.attempts >= job.maxAttempts;
      const updated: WorkerJob = {
        ...job,
        state: exhausted ? 'failed' : 'deferred',
        workerId: null,
        leaseUntilMs: null,
        lastError: 'Worker lease expired.',
      };
      this.jobs.set(job.jobId, updated);
      recovered.push(updated);
    }
    return recovered;
  }

  list(): readonly WorkerJob[] {
    return [...this.jobs.values()];
  }

  private require(jobId: string): WorkerJob {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Unknown job: ${jobId}.`);
    return job;
  }

  private validatePolicy(policy: WorkerJobPolicy): void {
    if (!Number.isInteger(policy.nowMs) || !Number.isInteger(policy.leaseTtlMs) || policy.leaseTtlMs <= 0) {
      throw new Error('Invalid worker job lease policy.');
    }
    if (!Number.isInteger(policy.maxAttempts) || policy.maxAttempts < 1 || policy.maxAttempts > 10) {
      throw new Error('Invalid worker job retry policy.');
    }
  }
}
