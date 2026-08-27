import {
  getAccessibilityTree,
  isAccessibilityEnabled,
  performAccessibilityAction,
  type AccessibilityNode,
} from '@/modules/accessibility-agent'
import { actionSchema } from '../accessibility-tools'

export async function executeUiObserve(maxNodes: number) {
  const enabled = await isAccessibilityEnabled()
  if (!enabled) {
    return { status: 'accessibility_disabled', nodes: [] as AccessibilityNode[] }
  }
  return {
    status: 'observed',
    nodes: await getAccessibilityTree(maxNodes),
  }
}

function treeMatches(nodes: AccessibilityNode[], expectedText?: string, expectedPackage?: string): boolean {
  return nodes.some((node) => {
    const text = `${node.text ?? ''} ${node.contentDescription ?? ''}`
    return (!expectedText || text.includes(expectedText)) &&
      (!expectedPackage || node.packageName === expectedPackage)
  })
}

export async function executeUiAction(input: {
  action: unknown
  waitMs: number
  expectedText?: string
  expectedPackage?: string
}) {
  const action = actionSchema.parse(input.action)
  const enabled = await isAccessibilityEnabled()
  if (!enabled) {
    return { status: 'accessibility_disabled', action: action.type, verified: false }
  }

  const before = await getAccessibilityTree(250)
  const result = await performAccessibilityAction(action)
  if (result.status !== 'executed') {
    return { ...result, verified: false, before, after: before }
  }

  await new Promise((resolve) => setTimeout(resolve, input.waitMs))
  const after = await getAccessibilityTree(250)
  const hasExpectation = Boolean(input.expectedText || input.expectedPackage)
  const verified = hasExpectation
    ? treeMatches(after, input.expectedText, input.expectedPackage)
    : false

  return {
    status: verified ? 'verified' : 'executed_unverified',
    action: action.type,
    verified,
    before,
    after,
  }
}
