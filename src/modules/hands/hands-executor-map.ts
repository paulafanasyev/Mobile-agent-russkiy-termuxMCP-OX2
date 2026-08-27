import type { HandsActionType } from './action-model'
import { HANDS_CAPABILITIES, getHandsCapability } from './capability-registry'

export type HandsExecutorContext = { actionId: string; signal?: AbortSignal }
export type HandsExecutorFunction = (args: Record<string, unknown>, context: HandsExecutorContext) => Promise<unknown>
const executors = new Map<string, HandsExecutorFunction>()

export function registerHandsExecutor(id: string, executor: HandsExecutorFunction): void {
  if (!id.trim()) throw new Error('Hands executor id is required')
  if (executors.has(id)) throw new Error(`Hands executor already registered: ${id}`)
  executors.set(id, executor)
}
export function resolveHandsExecutor(type: HandsActionType): { capability: ReturnType<typeof getHandsCapability>; executor: HandsExecutorFunction } {
  const capability = getHandsCapability(type)
  if (!capability.executorId) throw new Error(`Hands capability ${type} has no executorId`)
  const executor = executors.get(capability.executorId)
  if (!executor) throw new Error(`Hands executor not registered: ${capability.executorId}`)
  return { capability, executor }
}
export function hasHandsExecutor(id: string): boolean { return executors.has(id) }
export function assertHandsExecutorsComplete(): void {
  const missing = HANDS_CAPABILITIES.filter(c => c.availabilityStatus === 'implemented' && (!c.executorId || !executors.has(c.executorId))).map(c => c.type)
  if (missing.length) throw new Error(`Hands implemented capabilities without runtime executors: ${missing.join(', ')}`)
}
