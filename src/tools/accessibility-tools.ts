import { z } from 'zod'
import type { ToolContractSpec } from './types'

const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('tap'), x: z.number().finite(), y: z.number().finite() }),
  z.object({ type: z.literal('long_press'), x: z.number().finite(), y: z.number().finite(), durationMs: z.number().int().min(400).max(3000).optional() }),
  z.object({ type: z.literal('swipe'), x: z.number().finite(), y: z.number().finite(), x2: z.number().finite(), y2: z.number().finite(), durationMs: z.number().int().min(50).max(2000).optional() }),
  z.object({ type: z.literal('type'), text: z.string().max(20_000), nodeId: z.string().optional() }),
  z.object({ type: z.literal('back') }),
  z.object({ type: z.literal('home') }),
  z.object({ type: z.literal('recents') }),
])

export const ACCESSIBILITY_TOOLS: ToolContractSpec<unknown, unknown>[] = [
  {
    id: 'device.ui.observe',
    version: '1.0.0',
    description: 'Читает доступное Android UI-дерево текущего экрана для точного выбора элементов.',
    inputSchema: z.object({ maxNodes: z.number().int().min(1).max(1000).default(250)),
    outputSchema: z.any(),
    requiredCapability: 'NO_PRIVILEGE',
    risk: 'low',
    requiresConfirmation: false,
    auditPolicy: 'always',
    timeoutMs: 3000,
    availability: async () => true,
  },
  {
    id: 'device.ui.act',
    version: '1.0.0',
    description: 'Выполняет одно атомарное действие Android UI и возвращает наблюдение после него.',
    inputSchema: z.object({
      action: actionSchema,
      waitMs: z.number().int().min(100).max(2000).default(400),
      expectedText: z.string().max(500).optional(),
      expectedPackage: z.string().max(255).optional(),
    }),
    outputSchema: z.any(),
    requiredCapability: 'NO_PRIVILEGE',
    risk: 'medium',
    requiresConfirmation: true,
    auditPolicy: 'always',
    timeoutMs: 8000,
    availability: async () => true,
  },
]

export { actionSchema }
