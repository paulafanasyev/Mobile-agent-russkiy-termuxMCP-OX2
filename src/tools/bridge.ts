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
 * Registry remains the contract catalogue; the provider-facing schemas are the
 * same Zod schemas stored in device-tools.ts. Approval state remains there too.
 */
import { tool, type ToolSet } from 'ai';

import {
  DEVICE_TOOLS,
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

function getContract(id: string) {
  const contract = DEVICE_TOOLS.find((item) => item.id === id);
  if (!contract) {
    throw new Error(`Missing device tool contract: ${id}`);
  }
  return contract;
}

/** Build the AI SDK ToolSet consumed by the existing runtime. */
export function createDeviceToolSet(): ToolSet {
  return {
    'device.apps.list': tool({
      description: getContract('device.apps.list').description,
      inputSchema: getContract('device.apps.list').inputSchema,
      execute: async () => executeListApps(),
    }),
    'device.open_app': tool({
      description: getContract('device.open_app').description,
      inputSchema: getContract('device.open_app').inputSchema,
      execute: async (args) => executeOpenApp(openAppSchema.parse(args)),
    }),
    'device.files.read': tool({
      description: getContract('device.files.read').description,
      inputSchema: getContract('device.files.read').inputSchema,
      execute: async (args) => executeFileRead(readFileSchema.parse(args)),
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
