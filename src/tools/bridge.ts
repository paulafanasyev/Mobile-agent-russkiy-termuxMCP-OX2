import { tool, type ToolSet } from 'ai'

import { DEVICE_TOOLS } from './device-tools'
import { ACCESSIBILITY_TOOLS, uiActSchema, uiObserveSchema } from './accessibility-tools'
import {
  executeFileRead,
  executeListApps,
  executeOpenApp,
  openAppSchema,
  readFileSchema,
} from './executors/device-executors'
import { executeUiAction, executeUiObserve } from './executors/accessibility-executors'
import {
  getToolApproval,
  requestDeviceToolApproval,
  setToolApproval,
} from '@/modules/runtime/tool-approval'

export { getToolApproval, setToolApproval } from '@/modules/runtime/tool-approval'

function getContract(id: string) {
  const contract = [...DEVICE_TOOLS, ...ACCESSIBILITY_TOOLS].find((item) => item.id === id)
  if (!contract) throw new Error(`Missing device tool contract: ${id}`)
  return contract
}

async function requireDeviceApproval(toolName: string, input: unknown) {
  const decision = await requestDeviceToolApproval(toolName, input)
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
        if (!(await requireDeviceApproval('device.open_app', parsed))) {
          return { status: 'needs_approval', packageName: parsed.packageName }
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
        if (!(await requireDeviceApproval('device.ui.observe', parsed))) {
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
        if (!(await requireDeviceApproval('device.ui.act', parsed))) {
          return { status: 'needs_approval', verified: false }
        }
        return executeUiAction(parsed)
      },
    }),
  }
}
