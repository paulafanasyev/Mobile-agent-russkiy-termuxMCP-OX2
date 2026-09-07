import type { AccessibilityNode } from './index'

/**
 * Aster-inspired durable description of a UI node.
 * The live AccessibilityNode id is deliberately excluded: Android node
 * instances/ids are not treated as durable references across observations.
 */
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
  return {
    text: node.text,
    contentDescription: node.contentDescription,
    className: node.className,
    clickable: node.clickable,
    editable: node.editable,
    enabled: node.enabled,
    bounds: node.bounds,
  }
}

function sameText(a: string | null, b: string | null): boolean {
  return (a ?? '').trim() === (b ?? '').trim()
}

function sameBounds(a: AccessibilityNode['bounds'], b: AccessibilityNode['bounds']): boolean {
  return a.left === b.left && a.top === b.top && a.right === b.right && a.bottom === b.bottom
}

function score(node: AccessibilityNode, ref: HandsNodeRef): number {
  let value = 0
  if (sameText(node.text, ref.text)) value += 4
  if (sameText(node.contentDescription, ref.contentDescription)) value += 4
  if (node.className === ref.className) value += 2
  if (node.clickable === ref.clickable) value += 1
  if (node.editable === ref.editable) value += 1
  if (node.enabled === ref.enabled) value += 1
  if (sameBounds(node.bounds, ref.bounds)) value += 3
  return value
}

/**
 * Resolve a previously observed descriptor against a fresh tree.
 * Returns null unless the best match is sufficiently specific and unique.
 */
export function resolveNodeRef(nodes: AccessibilityNode[], ref: HandsNodeRef): AccessibilityNode | null {
  const ranked = nodes
    .map((node) => ({ node, score: score(node, ref) }))
    .sort((a, b) => b.score - a.score)

  if (ranked.length === 0 || ranked[0].score < 8) return null
  if (ranked.length > 1 && ranked[0].score === ranked[1].score) return null
  return ranked[0].node
}
