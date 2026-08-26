/**
 * P1-3: Device-tool bridge for the app's existing AI SDK ToolSet path.
 *
 * Device tools are injected by the Android runtime after the normal ToolSet
 * has been assembled. Mutating device actions therefore use the same runtime
 * approval handler as ordinary tools instead of creating a second, unreachable
 * approval path.
 *
 * Flow:
 *   device contract -> AI SDK tool() -> approval bridge -> executor
 */
import { tool, type ToolSet } from 'ai';

import {
  DEVICE_TOOLS,
  getSessionApprovedPackages,
  isAppApprovedForSession,
  approveAppForSession,
} from './device-tools';
import {
  executeFileRead,
  executeListApps,
  executeOpenApp,
  openAppSchema,
  readFileSchema,
} from './executors/device-executors';
import { requestDeviceToolApproval } from '@/modules/runtime/tool-approval';

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
      execute: async (args) => {
        const parsed = openAppSchema.parse(args);

        if (!isAppApprovedForSession(parsed.packageName)) {
          const decision = await requestDeviceToolApproval(
            'device.open_app',
            parsed,
          );

          if (decision === 'abort') {
            throw new Error('Request aborted.');
          }

          if (decision !== 'approve') {
            return {
              status: 'needs_approval',
              packageName: parsed.packageName,
            };
          }

          approveAppForSession(parsed.packageName);
        }

        return executeOpenApp(parsed);
      },
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
