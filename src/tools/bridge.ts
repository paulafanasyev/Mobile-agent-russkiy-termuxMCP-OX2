/**
 * Device-tool bridge for the existing AI SDK ToolSet path.
 *
 * Proven Hands pattern adopted here: one atomic UI action, then observation.
 * OpenDroid/MobileAgent-style planning remains above this layer; this bridge
 * never invents an action or claims verification on its own.
 */
import { tool, type ToolSet } from 'ai'

import {
  DEVICE_TOOLS,
  getSessionApprovedPackages,
  isAppApprovedForSession,
  approveAppForSession,
} from './device-tools'
import { ACCESSIBILITY_TOOLS } from './accessibility-tools'
import {
  executeFileRead,
  executeListApps,
  executeOpenApp,
  openAppSchema,
  readFileSchema,
} from './executors/device-executors'
import {
  executeUiAction,
  executeUiObserve,
} from './executors/accessibility-executors'
import { requestDeviceToolApproval } from '@/modules/runtime/tool-approval'

function getContract(id: string) {
  const contract = [...DEVICE_TOOLS, ...ACCESSIBILITY_TOOLS].find((item) => item.id === id)
  if (!contract) throw new Error(`Missing device tool contract: ${id}`)
  return contract
}

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
        const parsed = openAppSchema.parse(args)
        if (!isAppApprovedForSession(parsed.packageName)) {
          const decision = await requestDeviceToolApproval('device.open_app', parsed)
          if (decision === 'abort') throw new Error('Request aborted.')
          if (decision !== 'approve') return { status: 'needs_approval', packageName: parsed.packageName }
          approveAppForSession(parsed.packageName)
        }
        return executeOpenApp(parsed)
      },
    }),
    'device.files.read': tool({
      description: getContract('device.files.read').description,
      inputSchema: getContract('device.files.read').inputSchema,
      execute: async (args) => executeFileRead(readFileSchema.parse(args)),
    }),
    'device.ui.observe': tool({
      description: getContract('device.ui.observe').description,
      inputSchema: getContract('device.ui.observe').inputSchema,
      execute: async (args) => executeUiObserve(args.maxNodes),
    }),
    'device.ui.act': tool({
      description: getContract('device.ui.act').description,
      inputSchema: getContract('device.ui.act').inputSchema,
      execute: async (args) => {
        const decision = await requestDeviceToolApproval('device.ui.act', args)
        if (decision === 'abort') throw new Error('Request aborted.')
        if (decision !== 'approve') return { status: 'needs_approval', verified: false }
        return executeUiAction(args)
      },
    }),
  }
}

export function getDeviceSessionApprovals(): string[] {
  return getSessionApprovedPackages()
}

export function isDeviceAppApproved(packageName: string): boolean {
  return isAppApprovedForSession(packageName)
}
