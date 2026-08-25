import { z } from 'zod';
import type { ToolContractSpec } from './types';
import { register } from './registry';

// ── Schemas ───────────────────────────────────────────────────────────────────
const openAppArgs = z.object({
  packageName: z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i),
});

const listAppsArgs = z.object({});

const readFileArgs = z.object({
  uri: z.string().startsWith('content://'),
});

// ── Contracts (spec-only, matching the existing P0 ToolContractSpec) ────────
export const DEVICE_TOOLS: ToolContractSpec<unknown, unknown>[] = [
  {
    id: 'device.apps.list',
    version: '1.0.0',
    description: 'Показывает установленные приложения с launcher-иконками',
    inputSchema: listAppsArgs,
    outputSchema: z.any(),
    requiredCapability: 'NO_PRIVILEGE',
    risk: 'low',
    requiresConfirmation: false,
    auditPolicy: 'on-error',
    timeoutMs: 3000,
    availability: async () => true,
  },
  {
    id: 'device.open_app',
    version: '1.0.0',
    description: 'Открывает приложение по packageName (только из разрешённого списка)',
    inputSchema: openAppArgs,
    outputSchema: z.any(),
    requiredCapability: 'NO_PRIVILEGE',
    risk: 'low',
    requiresConfirmation: false,
    auditPolicy: 'always',
    timeoutMs: 5000,
    availability: async () => true,
  },
  {
    id: 'device.files.read',
    version: '1.0.0',
    description: 'Читает текстовый файл через SAF content:// URI',
    inputSchema: readFileArgs,
    outputSchema: z.any(),
    requiredCapability: 'NO_PRIVILEGE',
    risk: 'medium',
    requiresConfirmation: false,
    auditPolicy: 'always',
    timeoutMs: 10000,
    availability: async () => true,
  },
];

// ── Registration ─────────────────────────────────────────────────────────────
export function registerDeviceTools(): void {
  DEVICE_TOOLS.forEach(register);
}

// ── Session-level permission for open_app ────────────────────────────────────
// Discovery is not authorization: approval must be explicit and session-scoped.
const sessionApproved = new Set<string>();

export function approveAppForSession(packageName: string): void {
  sessionApproved.add(packageName);
}

export function isAppApprovedForSession(packageName: string): boolean {
  return sessionApproved.has(packageName);
}

export function getSessionApprovedPackages(): string[] {
  return [...sessionApproved];
}

export function clearSessionApprovals(): void {
  sessionApproved.clear();
}
