import {
  getAccessibilityTree as beddaGetAccessibilityTree,
  isServiceEnabled,
  requestServiceEnable,
  tapNode,
  longPressNode,
  setNodeText,
  scrollNode,
  tap,
  longPress,
  swipe,
  globalAction,
  openApp,
} from 'react-native-accessibility-controller'

export const HANDS_MAX_TREE_NODES = 200
export const HANDS_MAX_TEXT_LENGTH = 4096

export type AccessibilityNode = {
  id: string
  text: string | null
  contentDescription: string | null
  className: string | null
  packageName: string | null
  clickable: boolean
  editable: boolean
  enabled: boolean
  bounds: { left: number; top: number; right: number; bottom: number }
}

function flatten(nodes: any[], out: AccessibilityNode[] = []): AccessibilityNode[] {
  for (const node of nodes) {
    out.push({
      id: node.nodeId,
      text: node.text ?? null,
      contentDescription: node.contentDescription ?? null,
      className: node.className ?? null,
      packageName: node.packageName ?? null,
      clickable: node.isClickable === true,
      editable: node.isEditable === true,
      enabled: node.isEnabled !== false,
      bounds: node.bounds ?? { left: 0, top: 0, right: 0, bottom: 0 },
    })
    if (Array.isArray(node.children)) flatten(node.children, out)
    if (out.length >= HANDS_MAX_TREE_NODES) break
  }
  return out.slice(0, HANDS_MAX_TREE_NODES)
}

export async function isAccessibilityEnabled(): Promise<boolean> {
  return isServiceEnabled()
}

export async function getAccessibilityTree(maxNodes = HANDS_MAX_TREE_NODES): Promise<AccessibilityNode[]> {
  const tree = await beddaGetAccessibilityTree()
  return flatten(tree).slice(0, Math.max(1, Math.min(maxNodes, HANDS_MAX_TREE_NODES)))
}

export async function openAccessibilitySettings(): Promise<boolean> {
  await requestServiceEnable()
  return true
}

export async function performAccessibilityAction(action: any): Promise<{ status: string; action: string }> {
  try {
    switch (action.type) {
      case 'back': await globalAction('back'); break
      case 'home': await globalAction('home'); break
      case 'recents': await globalAction('recents'); break
      case 'tap':
        if (action.nodeId) await tapNode(action.nodeId)
        else await tap(action.x, action.y)
        break
      case 'long_press':
        if (action.nodeId) await longPressNode(action.nodeId)
        else await longPress(action.x, action.y)
        break
      case 'swipe': await swipe(action.x, action.y, action.x2, action.y2, action.durationMs ?? 300); break
      case 'type': await setNodeText(action.nodeId, String(action.text ?? '')); break
      case 'scroll': await scrollNode(action.nodeId, action.direction ?? 'down'); break
      case 'open_app': await openApp(action.packageName); break
      default: return { status: 'unsupported', action: String(action.type ?? 'unknown') }
    }
    return { status: 'verified', action: String(action.type) }
  } catch {
    return { status: 'failed', action: String(action.type ?? 'unknown') }
  }
}
