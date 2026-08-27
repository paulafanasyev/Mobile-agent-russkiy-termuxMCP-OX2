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
import { requestDeviceToolApproval } from '@/modules/runtime/tool-approval'
import { initHandsExecutors } from '@/modules/hands/runtime-init'
import { resolveHandsExecutor } from '@/modules/hands/hands-executor-map'
import type { HandsActionType } from '@/modules/hands/action-model'

function getContract(id: string) {
  const contract = [...DEVICE_TOOLS, ...ACCESSIBILITY_TOOLS].find((item) => item.id === id)
  if (!contract) throw new Error(`Missing device tool contract: ${id}`)
  return contract
}

function resolveAccessibilityActionType(type: string): HandsActionType {
  if (type === 'type') return 'type_text'
  if (type === 'long_press') return 'long_press'
  if (type === 'press_key') return 'press_key'
  if (type === 'tap' || type === 'double_tap' || type === 'swipe' || type === 'scroll' || type === 'drag' || type === 'clear_text' || type === 'select_text' || type === 'copy' || type === 'paste' || type === 'back' || type === 'home' || type === 'recents') return type
  throw new Error(`Unsupported Hands accessibility action: ${type}`)
}

export function createDeviceToolSet(): ToolSet {
  initHandsExecutors()
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
      inputSchema: uiObserveSchema,
      execute: async (args) => {
        const parsed = uiObserveSchema.parse(args)
        const decision = await requestDeviceToolApproval('device.ui.observe', parsed)
        if (decision === 'abort') throw new Error('Request aborted.')
        if (decision !== 'approve') return { status: 'needs_approval', nodes: [] }
        const { executor } = resolveHandsExecutor('read_screen')
        return executor({ maxNodes: parsed.maxNodes }, { actionId: `observe-${Date.now()}` })
      },
    }),
    'device.ui.act': tool({
      description: getContract('device.ui.act').description,
      inputSchema: uiActSchema,
      execute: async (args) => {
        const parsed = uiActSchema.parse(args)
        const decision = await requestDeviceToolApproval('device.ui.act', parsed)
        if (decision === 'abort') throw new Error('Request aborted.')
        if (decision !== 'approve') return { status: 'needs_approval', verified: false }
        initHandsExecutors()
        const actionType = resolveAccessibilityActionType(parsed.action.type)
        const { capability, executor } = resolveHandsExecutor(actionType)
        if (capability.availabilityStatus !== 'implemented') {
          return { status: 'unavailable', verified: false, error: `Hands capability ${actionType} is ${capability.availabilityStatus}` }
        }
        return executor(parsed as unknown as Record<string, unknown>, { actionId: `ui-${Date.now()}` })
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
