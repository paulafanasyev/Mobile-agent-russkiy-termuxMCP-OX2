import {
  HANDS_MAX_TREE_NODES,
  isAccessibilityEnabled,
  type AccessibilityNode,
} from '../../../modules/accessibility-agent'
import {
  nativeGetAccessibilityTree,
  nativePerformAccessibilityAction,
} from '../../../modules/accessibility-agent/native'
import { actionSchema, type AccessibilityAction } from '../accessibility-tools'

type AccessibilityExecutionResult = {
  status: string
  action: string
}

async function getAccessibilityTree(maxNodes = HANDS_MAX_TREE_NODES): Promise<AccessibilityNode[]> {
  return nativeGetAccessibilityTree(Math.max(1, Math.min(maxNodes, HANDS_MAX_TREE_NODES)))
}

async function performAccessibilityAction(
  action: AccessibilityAction,
): Promise<AccessibilityExecutionResult> {
  return nativePerformAccessibilityAction(action)
}

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

function rootPackage(nodes: AccessibilityNode[]): string | null {
  return nodes.find((node) => node.id === '0')?.packageName ?? nodes[0]?.packageName ?? null
}

function treeSatisfies(nodes: AccessibilityNode[], expectedText?: string, expectedPackage?: string): boolean {
  if (nodes.length === 0) return false

  if (expectedPackage && rootPackage(nodes) !== expectedPackage) return false
  if (!expectedText) return Boolean(expectedPackage)

  const expected = expectedText.trim()
  if (!expected) return false

  return nodes.some((node) => {
    const text = node.text?.trim() ?? ''
    const contentDescription = node.contentDescription?.trim() ?? ''
    return text === expected || contentDescription === expected
  })
}

function treeMatchesCausally(
  before: AccessibilityNode[],
  after: AccessibilityNode[],
  expectedText?: string,
  expectedPackage?: string,
): boolean {
  if (!expectedText && !expectedPackage) return false
  if (!treeSatisfies(after, expectedText, expectedPackage)) return false

  const textTransitioned = !expectedText || !treeSatisfies(before, expectedText)
  const packageTransitioned = !expectedPackage || rootPackage(before) !== expectedPackage

  return textTransitioned && packageTransitioned
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

  const before = await getAccessibilityTree(HANDS_MAX_TREE_NODES)
  const result = await performAccessibilityAction(action)
  if (result.status !== 'executed') {
    return { ...result, verified: false, before, after: before }
  }

  await new Promise((resolve) => setTimeout(resolve, input.waitMs))
  const after = await getAccessibilityTree(HANDS_MAX_TREE_NODES)
  const hasExpectation = Boolean(input.expectedText || input.expectedPackage)
  const verified = hasExpectation
    ? treeMatchesCausally(before, after, input.expectedText, input.expectedPackage)
    : false

  return {
    status: verified ? 'verified' : 'executed_unverified',
    action: action.type,
    verified,
    before,
    after,
  }
}
