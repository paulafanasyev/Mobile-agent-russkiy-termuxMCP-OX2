import { tool, type ToolSet } from 'ai'

import {
  DEVICE_TOOLS,
  getSessionApprovedPackages,
  isAppApprovedForSession,
  approveAppForSession,
} from './device-tools'
import { ACCESSIBILITY_TOOLS, uiActSchema, uiObserveSchema } from './accessibility-tools'
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
import { isHandsAlwaysAllowed } from '@/modules/runtime/hands-permission'

function getContract(id: string) {
  const contract = [...DEVICE_TOOLS, ...ACCESSIBILITY_TOOLS].find((item) => item.id === id)
  if (!contract) throw new Error(`Missing device tool contract: ${id}`)
  return contract
}

async function approveHandsTool(toolName: string, toolInput: unknown): Promise<boolean> {
  if (await isHandsAlwaysAllowed()) return true

  const decision = await requestDeviceToolApproval(toolName, toolInput)
  if (decision === 'abort') throw new Error('Request aborted.')
  return decision === 'approve'
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
          if (await isHandsAlwaysAllowed()) {
            approveAppForSession(parsed.packageName)
          } else {
            const decision = await requestDeviceToolApproval('device.open_app', parsed)
            if (decision === 'abort') throw new Error('Request aborted.')
            if (decision !== 'approve') return { status: 'needs_approval', packageName: parsed.packageName }
            approveAppForSession(parsed.packageName)
          }
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
      inputSchema: uiObserveSchema,
      execute: async (args) => {
        const parsed = uiObserveSchema.parse(args)
        if (!(await approveHandsTool('device.ui.observe', parsed))) {
          return { status: 'needs_approval', nodes: [] }
        }
        return executeUiObserve(parsed.maxNodes)
      },
    }),
    'device.ui.act': tool({
      description: getContract('device.ui.act').description,
      inputSchema: uiActSchema,
      execute: async (args) => {
        const parsed = uiActSchema.parse(args)
        if (!(await approveHandsTool('device.ui.act', parsed))) {
          return { status: 'needs_approval', verified: false }
        }
        return executeUiAction(parsed)
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
