import { createHash } from 'crypto'
import { HANDS_MAX_TREE_NODES, isAccessibilityEnabled, type AccessibilityNode } from '../../../modules/accessibility-agent'
import { nativeFindAccessibilityNodes, nativeGetAccessibilityTree, nativePerformAccessibilityAction } from '../../../modules/accessibility-agent/native'
import { actionSchema, findQuerySchema, type AccessibilityAction } from '../accessibility-tools'

type AccessibilityExecutionResult = { status: string; action: string }
async function getAccessibilityTree(maxNodes = HANDS_MAX_TREE_NODES): Promise<AccessibilityNode[]> { return nativeGetAccessibilityTree(Math.max(1, Math.min(maxNodes, HANDS_MAX_TREE_NODES))) }
async function performAccessibilityAction(action: AccessibilityAction): Promise<AccessibilityExecutionResult> { return nativePerformAccessibilityAction(action) }

export async function executeUiObserve(maxNodes: number) {
  const enabled = await isAccessibilityEnabled()
  if (!enabled) return { status: 'accessibility_disabled', nodes: [] as AccessibilityNode[] }
  return { status: 'observed', nodes: await getAccessibilityTree(maxNodes) }
}

function rootPackage(nodes: AccessibilityNode[]): string | null { return nodes.find(n => n.id === '0')?.packageName ?? nodes[0]?.packageName ?? null }
function stableNode(node: AccessibilityNode) { return { id: node.id, text: node.text ?? null, contentDescription: node.contentDescription ?? null, resourceId: node.resourceId ?? null, packageName: node.packageName ?? null, bounds: node.bounds ?? null, clickable: node.clickable, editable: node.editable, enabled: node.enabled } }
export function computeFingerprint(nodes: AccessibilityNode[]): string { return createHash('sha256').update(JSON.stringify(nodes.map(stableNode))).digest('hex') }
export function verifyByFingerprintChange(before: AccessibilityNode[], after: AccessibilityNode[]): boolean { return computeFingerprint(before) !== computeFingerprint(after) }
function containsExpectedText(nodes: AccessibilityNode[], expected?: string): boolean { if (!expected?.trim()) return false; const e=expected.trim(); return nodes.some(n => (n.text ?? '').trim() === e || (n.contentDescription ?? '').trim() === e) }
function treeMatchesCausally(before: AccessibilityNode[], after: AccessibilityNode[], expectedText?: string, expectedPackage?: string, verifyStrategy: 'ui_tree_change'|'ui_target_state' = 'ui_target_state'): boolean {
  if (expectedPackage && rootPackage(after) !== expectedPackage) return false
  if (expectedText && !containsExpectedText(after, expectedText)) return false
  if (expectedText && containsExpectedText(before, expectedText) && !expectedPackage) return verifyStrategy === 'ui_tree_change' ? verifyByFingerprintChange(before, after) : false
  if (expectedPackage && rootPackage(before) === expectedPackage && !expectedText) return verifyStrategy === 'ui_tree_change' ? verifyByFingerprintChange(before, after) : false
  if (!expectedText && !expectedPackage) return verifyByFingerprintChange(before, after)
  return true
}

export async function executeUiAction(input: { action: unknown; waitMs: number; expectedText?: string; expectedPackage?: string; verifyStrategy?: 'ui_tree_change'|'ui_target_state' }) {
  const action = actionSchema.parse(input.action)
  const enabled = await isAccessibilityEnabled()
  if (!enabled) return { status: 'accessibility_disabled', action: action.type, verified: false }
  const before = await getAccessibilityTree(HANDS_MAX_TREE_NODES)
  const result = await performAccessibilityAction(action)
  if (result.status !== 'executed') return { ...result, verified: false, before, after: before }
  await new Promise(resolve => setTimeout(resolve, input.waitMs))
  const after = await getAccessibilityTree(HANDS_MAX_TREE_NODES)
  const verified = treeMatchesCausally(before, after, input.expectedText, input.expectedPackage, input.verifyStrategy ?? 'ui_target_state')
  return { status: verified ? 'verified' : 'executed_unverified', action: action.type, verified, before, after, beforeFingerprint: computeFingerprint(before), afterFingerprint: computeFingerprint(after) }
}

export async function executeFindNodes(query: unknown) {
  const parsed = findQuerySchema.parse(query)
  const enabled = await isAccessibilityEnabled()
  if (!enabled) return { status: 'accessibility_disabled', results: [] }
  const results = await nativeFindAccessibilityNodes(parsed)
  return { status: 'found', results }
}
