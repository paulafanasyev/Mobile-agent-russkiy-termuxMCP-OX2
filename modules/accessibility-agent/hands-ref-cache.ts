import type { AccessibilityNode } from './index'
import { describeNode, resolveNodeRef, type HandsNodeRef } from './aster-refs'

const MAX_REFS = 200
let sequence = 0

const cache = new Map<string, HandsNodeRef>()

function trimCache() {
  while (cache.size > MAX_REFS) {
    const oldest = cache.keys().next().value
    if (typeof oldest !== 'string') break
    cache.delete(oldest)
  }
}

export function rememberNode(node: AccessibilityNode): string {
  sequence = (sequence + 1) % 0x7fffffff
  const ref = `hands:${sequence.toString(36)}`
  cache.set(ref, describeNode(node))
  trimCache()
  return ref
}

export function resolveRef(ref: string, freshNodes: AccessibilityNode[]): AccessibilityNode | null {
  const descriptor = cache.get(ref)
  if (!descriptor) return null
  return resolveNodeRef(freshNodes, descriptor)
}

export function decorateObservedNodes(nodes: AccessibilityNode[]): Array<AccessibilityNode & { ref: string }> {
  return nodes.map((node) => ({ ...node, ref: rememberNode(node) }))
}

export function clearRefs() {
  cache.clear()
}
