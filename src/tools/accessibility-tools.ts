import { z } from 'zod'
import type { ToolContractSpec } from './types'

const isAccessibilityEnabled = async (): Promise<boolean> => { const module = await import('../../modules/accessibility-agent'); return module.isAccessibilityEnabled() }
const nodeId = z.string().regex(/^0(?:\.[0-9]+)+$/)
const point = z.number().finite()
const globalKey = z.enum(['back','home','recents','notifications','quick_settings','power_dialog','lock_screen','headset_hook','take_screenshot'])

export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('tap'), x: point, y: point }),
  z.object({ type: z.literal('double_tap'), x: point, y: point }),
  z.object({ type: z.literal('long_press'), x: point, y: point, durationMs: z.number().int().min(400).max(3000).optional() }),
  z.object({ type: z.literal('swipe'), x: point, y: point, x2: point, y2: point, durationMs: z.number().int().min(50).max(2000).optional() }),
  z.object({ type: z.literal('scroll'), x: point, y: point, x2: point, y2: point, durationMs: z.number().int().min(50).max(2000).optional() }),
  z.object({ type: z.literal('drag'), x: point, y: point, x2: point, y2: point, durationMs: z.number().int().min(100).max(2000).optional() }),
  z.object({ type: z.literal('type'), text: z.string().max(4096), nodeId }),
  z.object({ type: z.literal('clear_text'), nodeId }), z.object({ type: z.literal('select_text'), nodeId }),
  z.object({ type: z.literal('copy'), nodeId }), z.object({ type: z.literal('paste'), nodeId }),
  z.object({ type: z.literal('back') }), z.object({ type: z.literal('home') }), z.object({ type: z.literal('recents') }),
  z.object({ type: z.literal('press_key'), key: globalKey }),
])
export type AccessibilityAction = z.infer<typeof actionSchema>
export const findQuerySchema = z.object({ text: z.string().max(500).optional(), resourceId: z.string().max(500).optional(), packageName: z.string().max(255).optional() }).refine(v => Object.keys(v).length > 0, 'find requires at least one selector')
const accessibilityNodeSchema = z.object({ id: z.string(), text: z.string().nullable(), contentDescription: z.string().nullable(), resourceId: z.string().nullable().optional(), className: z.string().nullable(), packageName: z.string().nullable(), clickable: z.boolean(), editable: z.boolean(), enabled: z.boolean(), bounds: z.object({ left: z.number().int(), top: z.number().int(), right: z.number().int(), bottom: z.number().int() }) })
const uiObserveOutputSchema = z.object({ status: z.enum(['observed', 'accessibility_disabled']), nodes: z.array(accessibilityNodeSchema) })
const uiActOutputSchema = z.object({ status: z.enum(['verified', 'executed_unverified', 'accessibility_disabled', 'failed', 'invalid_action', 'unsupported', 'invalid_json', 'out_of_bounds', 'invalid_node_target', 'target_not_editable', 'target_disabled']), action: z.string(), verified: z.boolean(), before: z.array(accessibilityNodeSchema).optional(), after: z.array(accessibilityNodeSchema).optional() })
export const uiObserveSchema = z.object({ maxNodes: z.number().int().min(1).max(200).default(200) })
export const uiActSchema = z.object({ action: actionSchema, waitMs: z.number().int().min(100).max(2000).default(400), expectedText: z.string().max(500).optional(), expectedPackage: z.string().max(255).optional() })
export const ACCESSIBILITY_TOOLS: ToolContractSpec<unknown, unknown>[] = [
  { id:'device.ui.observe', version:'1.0.0', description:'Читает доступное Android UI-дерево текущего экрана для точного выбора элементов.', inputSchema:uiObserveSchema, outputSchema:uiObserveOutputSchema, requiredCapability:'NO_PRIVILEGE', risk:'low', requiresConfirmation:false, auditPolicy:'always', timeoutMs:3000, availability:isAccessibilityEnabled },
  { id:'device.ui.act', version:'1.0.0', description:'Выполняет атомарное действие Android UI и возвращает наблюдение после него.', inputSchema:uiActSchema, outputSchema:uiActOutputSchema, requiredCapability:'NO_PRIVILEGE', risk:'medium', requiresConfirmation:true, auditPolicy:'always', timeoutMs:8000, availability:isAccessibilityEnabled },
]
