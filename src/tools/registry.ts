import type { ToolContractSpec } from './types';

const registry = new Map<string, ToolContractSpec<unknown, unknown>>();

export function register(spec: ToolContractSpec<unknown, unknown>): void {
  if (registry.has(spec.id)) {
    throw new Error(`Tool already registered: ${spec.id}`);
  }
  registry.set(spec.id, spec);
}

export function get(id: string): ToolContractSpec<unknown, unknown> | undefined {
  return registry.get(id);
}

export function list(): ToolContractSpec<unknown, unknown>[] {
  return [...registry.values()];
}

export function clear(): void {
  registry.clear();
}

export function has(id: string): boolean {
  return registry.has(id);
}
