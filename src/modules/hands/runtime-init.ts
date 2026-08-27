import {
  executeUiAction,
  executeUiObserve,
  executeFindNodes,
} from '../../tools/executors/accessibility-executors'
import { executeOpenApp, openAppSchema } from '../../tools/executors/device-executors'
import {
  executeOpenUrl,
  executeOpenSettings,
  executeHandsWait,
  executeHandsShare,
  openUrlHandsSchema,
  openSettingsHandsSchema,
  waitHandsSchema,
  shareHandsSchema,
} from '../../tools/executors/system-hands-executors'
import {
  executeSetVolume,
  executeSetBrightness,
  executeToggleFlashlight,
  setVolumeHandsSchema,
  setBrightnessHandsSchema,
  toggleFlashlightHandsSchema,
} from '../../tools/executors/system-device-executors'
import {
  assertHandsExecutorsComplete,
  hasHandsExecutor,
  registerHandsExecutor,
} from './hands-executor-map'

let initialized = false

type UiActInput = {
  action: unknown
  waitMs?: number
  expectedText?: string
  expectedPackage?: string
  verifyStrategy?: 'ui_tree_change' | 'ui_target_state' | 'system_state_change'
}

function uiExecutor(type: string, defaults: Pick<UiActInput, 'waitMs' | 'verifyStrategy'>) {
  return async (args: Record<string, unknown>) => {
    const input = args as unknown as UiActInput
    return executeUiAction({
      action: { ...(input.action as Record<string, unknown>), type },
      waitMs: typeof input.waitMs === 'number' ? input.waitMs : defaults.waitMs ?? 500,
      expectedText: typeof input.expectedText === 'string' ? input.expectedText : undefined,
      expectedPackage: typeof input.expectedPackage === 'string' ? input.expectedPackage : undefined,
      verifyStrategy: input.verifyStrategy ?? defaults.verifyStrategy,
    })
  }
}

export function initHandsExecutors(): void {
  if (initialized) return

  const register = (id: string, executor: Parameters<typeof registerHandsExecutor>[1]) => {
    if (!hasHandsExecutor(id)) registerHandsExecutor(id, executor)
  }

  register('accessibility.tap', uiExecutor('tap', { waitMs: 500, verifyStrategy: 'ui_target_state' }))
  register('accessibility.double_tap', uiExecutor('double_tap', { waitMs: 500, verifyStrategy: 'ui_tree_change' }))
  register('accessibility.long_press', uiExecutor('long_press', { waitMs: 500, verifyStrategy: 'ui_target_state' }))
  register('accessibility.swipe', uiExecutor('swipe', { waitMs: 700, verifyStrategy: 'ui_tree_change' }))
  register('accessibility.scroll', uiExecutor('scroll', { waitMs: 800, verifyStrategy: 'ui_tree_change' }))
  register('accessibility.drag', uiExecutor('drag', { waitMs: 1000, verifyStrategy: 'ui_tree_change' }))
  register('accessibility.type_text', uiExecutor('type_text', { waitMs: 500, verifyStrategy: 'ui_target_state' }))
  register('accessibility.clear_text', uiExecutor('clear_text', { waitMs: 800, verifyStrategy: 'ui_target_state' }))
  register('accessibility.select_text', uiExecutor('select_text', { waitMs: 800, verifyStrategy: 'ui_target_state' }))
  register('accessibility.copy', uiExecutor('copy', { waitMs: 500, verifyStrategy: 'system_state_change' }))
  register('accessibility.paste', uiExecutor('paste', { waitMs: 500, verifyStrategy: 'ui_target_state' }))
  register('accessibility.back', uiExecutor('back', { waitMs: 500, verifyStrategy: 'ui_tree_change' }))
  register('accessibility.home', uiExecutor('home', { waitMs: 700, verifyStrategy: 'ui_tree_change' }))
  register('accessibility.recents', uiExecutor('recents', { waitMs: 700, verifyStrategy: 'ui_tree_change' }))

  register('accessibility.observe', async (args) => executeUiObserve(typeof args.maxNodes === 'number' ? args.maxNodes : undefined))
  register('accessibility.read_screen', async (args) => executeUiObserve(typeof args.maxNodes === 'number' ? args.maxNodes : undefined))
  register('accessibility.find', async (args) => executeFindNodes(args))
  register('accessibility.find_text', async (args) => executeFindNodes({ text: args.text }))
  register('accessibility.find_element', async (args) => executeFindNodes(args))

  register('android.intent.launch_app', async (args) => executeOpenApp(openAppSchema.parse(args)))
  register('android.intent.open_url', async (args) => executeOpenUrl(openUrlHandsSchema.parse(args)))
  register('android.intent.settings', async (args) => executeOpenSettings(openSettingsHandsSchema.parse(args)))
  register('runtime.wait', async (args) => executeHandsWait(waitHandsSchema.parse(args)))
  register('android.intent.share', async (args) => executeHandsShare(shareHandsSchema.parse(args)))
  register('android.audio.volume', async (args) => executeSetVolume(setVolumeHandsSchema.parse(args)))
  register('android.display.brightness', async (args) => executeSetBrightness(setBrightnessHandsSchema.parse(args)))
  register('android.camera.flashlight', async (args) => executeToggleFlashlight(toggleFlashlightHandsSchema.parse(args)))

  assertHandsExecutorsComplete()
  initialized = true
}
