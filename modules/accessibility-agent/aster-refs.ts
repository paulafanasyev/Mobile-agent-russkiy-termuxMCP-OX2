import type { AccessibilityNode } from './index'

/** Aster-inspired durable UI descriptor; live node ids are never durable refs. */
export type HandsNodeRef = {
  text: string | null
  contentDescription: string | null
  className: string | null
  clickable: boolean
  editable: boolean
  enabled: boolean
  bounds: AccessibilityNode['bounds']
}

export function describeNode(node: AccessibilityNode): HandsNodeRef {
  return { text: node.text, contentDescription: node.contentDescription, className: node.className, clickable: node.clickable, editable: node.editable, enabled: node.enabled, bounds: node.bounds }
}

function sameLabel(a: string | null, b: string | null): boolean {
  const left = (a ?? '').trim()
  const right = (b ?? '').trim()
  return left.length > 0 && left === right
}

function sameBounds(a: AccessibilityNode['bounds'], b: AccessibilityNode['bounds']): boolean {
  return a.left === b.left && a.top === b.top && a.right === b.right && a.bottom === b.bottom
}

function score(node: AccessibilityNode, ref: HandsNodeRef): number {
  let value = 0
  if (sameLabel(node.text, ref.text)) value += 4
  if (sameLabel(node.contentDescription, ref.contentDescription)) value += 4
  if (node.className === ref.className) value += 2
  if (node.clickable === ref.clickable) value += 1
  if (node.editable === ref.editable) value += 1
  if (node.enabled === ref.enabled) value += 1
  if (sameBounds(node.bounds, ref.bounds)) value += 3
  return value
}

/** Resolve a prior descriptor against a fresh tree; ambiguity/staleness fails closed. */
export function resolveNodeRef(nodes: AccessibilityNode[], ref: HandsNodeRef): AccessibilityNode | null {
  const ranked = nodes.map((node) => ({ node, score: score(node, ref) })).sort((a, b) => b.score - a.score)
  if (ranked.length === 0 || ranked[0].score < 10) return null
  if (ranked.length > 1 && ranked[0].score === ranked[1].score) return null
  return ranked[0].node
}
