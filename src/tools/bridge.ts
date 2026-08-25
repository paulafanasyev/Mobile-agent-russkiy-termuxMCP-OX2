/**
 * P1-3: Device-tool bridge for the app's existing AI SDK ToolSet path.
 *
 * The current runtime does not expose a provider callback. It passes a ToolSet
 * to the AI SDK, which executes each tool's `execute` function itself.
 * Therefore this bridge intentionally does NOT invent sendMessage/onToolCall.
 *
 * Flow:
 *   device contract -> AI SDK tool() -> existing runtime ToolSet -> executor
 *
 * Registry remains the contract catalogue; this adapter is the execution
 * boundary consumed by the runtime. Approval state remains in device-tools.ts.
 */
import { tool, type ToolSet } from 'ai';
import { z } from 'zod';

import {
  DEVICE_TOOLS,
  registerDeviceTools,
  getSessionApprovedPackages,
  isAppApprovedForSession,
} from './device-tools';
import {
  executeFileRead,
  executeListApps,
  executeOpenApp,
  openAppSchema,
  readFileSchema,
} from './executors/device-executors';
import { has } from './registry';

function ensureDeviceContractsRegistered(): void {
  for (const spec of DEVICE_TOOLS) {
    if (!has(spec.id)) {
      registerDeviceTools();
      return;
    }
  }
}

/** Build the AI SDK ToolSet consumed by the existing runtime. */
export function createDeviceToolSet(): ToolSet {
  ensureDeviceContractsRegistered();

  return {
    'device.apps.list': tool({
      description: DEVICE_TOOLS.find((item) => item.id === 'device.apps.list')!.description,
      inputSchema: z.object({}),
      execute: async () => executeListApps(),
    }),
    'device.open_app': tool({
      description: DEVICE_TOOLS.find((item) => item.id === 'device.open_app')!.description,
      inputSchema: openAppSchema,
      execute: async (args) => executeOpenApp(args),
    }),
    'device.files.read': tool({
      description: DEVICE_TOOLS.find((item) => item.id === 'device.files.read')!.description,
      inputSchema: readFileSchema,
      execute: async (args) => executeFileRead(args),
    }),
  };
}

/** Public inspection helpers for the UI/session approval flow. */
export function getDeviceSessionApprovals(): string[] {
  return getSessionApprovedPackages();
}

export function isDeviceAppApproved(packageName: string): boolean {
  return isAppApprovedForSession(packageName);
}
