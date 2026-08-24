/**
 * Tool Contract primitives — P0 Step 1.
 * Аддитивный модуль: не импортирует существующий production-код.
 */
import { z } from 'zod';
import type { RuntimeIdentity } from './identity';
import type { CapabilitySnapshot } from './capability';

export const CAPABILITY_LEVELS = [
  'NO_PRIVILEGE',
  'SHIZUKU_AVAILABLE',
  'ROOT_AVAILABLE',
] as const;

export type CapabilityLevel = (typeof CAPABILITY_LEVELS)[number];

export const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export type AuditPolicy = 'always' | 'on-error';

export interface ExecutionContext {
  readonly identity: RuntimeIdentity;
  readonly capability: CapabilitySnapshot;
  /** Корреляционный ID для audit-цепочки; генерируется executor'ом. */
  readonly requestId: string;
  readonly startedAtIso: string;
}

/**
 * Публичное ОПИСАНИЕ инструмента. Намеренно НЕ содержит execute():
 * исполнение живёт только внутри Registry/Executor (шаги 2–3),
 * чтобы прямой вызов .execute() вне единого пути был невозможен.
 */
export interface ToolContractSpec<TInput, TOutput> {
  readonly id: string;
  readonly version: string;
  readonly description: string;
  readonly inputSchema: z.ZodType<TInput>;
  readonly outputSchema: z.ZodType<TOutput>;
  readonly requiredCapability: CapabilityLevel;
  readonly risk: RiskLevel;
  readonly requiresConfirmation: boolean;
  readonly auditPolicy: AuditPolicy;
  readonly timeoutMs: number;
  readonly availability: () => Promise<boolean>;
}

/** Внутренняя форма для registry.register(); наружу отдаётся spec без execute. */
export interface ToolImplementation<TInput, TOutput>
  extends ToolContractSpec<TInput, TOutput> {
  readonly execute: (input: TInput, ctx: ExecutionContext) => Promise<TOutput>;
}

export const nonEmptyString = z.string().min(1);
export const positiveInt = z.number().int().positive();

export const toolIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9._-]{2,63}$/, 'tool id: lowercase, dots/dashes allowed');
export const semVerSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, 'semver x.y.z');
