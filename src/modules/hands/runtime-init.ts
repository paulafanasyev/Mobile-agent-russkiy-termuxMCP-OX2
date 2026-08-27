import {
  executeUiAction,
  executeUiObserve,
  executeFindNodes,
} from '../../tools/executors/accessibility-executors'
import { executeOpenApp, openAppSchema } from '../../tools/executors/device-executors'
import {
  assertHandsExecutorsComplete,
  hasHandsExecutor,
  registerHandsExecutor,
} from './hands-executor-map'

let initialized = false

export function initHandsExecutors(): void {
  if (initialized) return

  const register = (id: string, executor: Parameters<typeof registerHandsExecutor>[1]) => {
    if (!hasHandsExecutor(id)) registerHandsExecutor(id, executor)
  }

  register('accessibility.tap', async (args, context) =>
    executeUiAction({ action: { type: 'tap', ...args }, waitMs: 500, expectedText: typeof args.expectedText === 'string' ? args.expectedText : undefined, expectedPackage: typeof args.expectedPackage === 'string' ? args.expectedPackage : undefined, verifyStrategy: 'ui_target_state' }),
  )
  register('accessibility.double_tap', async (args) =>
    executeUiAction({ action: { type: 'double_tap', ...args }, waitMs: 500, verifyStrategy: 'ui_tree_change' }),
  )
  register('accessibility.long_press', async (args) =>
    executeUiAction({ action: { type: 'long_press', ...args }, waitMs: 500, verifyStrategy: 'ui_target_state' }),
  )
  register('accessibility.swipe', async (args) =>
    executeUiAction({ action: { type: 'swipe', ...args }, waitMs: 700, verifyStrategy: 'ui_tree_change' }),
  )
  register('accessibility.type_text', async (args) =>
    executeUiAction({ action: { type: 'type_text', ...args }, waitMs: 500, verifyStrategy: 'ui_target_state' }),
  )
  register('accessibility.back', async () =>
    executeUiAction({ action: { type: 'back' }, waitMs: 500, verifyStrategy: 'ui_tree_change' }),
  )
  register('accessibility.home', async () =>
    executeUiAction({ action: { type: 'home' }, waitMs: 700, verifyStrategy: 'ui_tree_change' }),
  )
  register('accessibility.recents', async () =>
    executeUiAction({ action: { type: 'recents' }, waitMs: 700, verifyStrategy: 'ui_tree_change' }),
  )

  register('accessibility.observe', async (args) =>
    executeUiObserve(typeof args.maxNodes === 'number' ? args.maxNodes : undefined),
  )
  register('accessibility.find', async (args) => executeFindNodes(args))

  // Kept registered for the unified path, but launch_app remains a stub in the
  // authoritative registry until real device evidence promotes it.
  register('android.intent.launch_app', async (args) => {
    const parsed = openAppSchema.parse(args)
    return executeOpenApp(parsed)
  })

  assertHandsExecutorsComplete()
  initialized = true
}
