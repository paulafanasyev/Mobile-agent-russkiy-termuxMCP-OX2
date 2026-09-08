import { describe, expect, it } from 'vitest'
import { describeNode, resolveNodeRef } from './aster-refs'
import type { AccessibilityNode } from './index'

const node = (overrides: Partial<AccessibilityNode> = {}): AccessibilityNode => ({
  id: '0.1',
  text: 'Продолжить',
  contentDescription: null,
  className: 'android.widget.Button',
  packageName: 'com.example',
  clickable: true,
  scrollable: false,
  editable: false,
  focused: false,
  checked: false,
  enabled: true,
  bounds: { left: 10, top: 20, right: 210, bottom: 80 },
  ...overrides,
})

describe('Aster-style Hands node refs', () => {
  it('resolves the same semantic node after its live id changes', () => {
    const original = node({ id: '0.1' })
    const fresh = node({ id: '0.7' })

    expect(resolveNodeRef([fresh], describeNode(original))?.id).toBe('0.7')
  })

  it('fails closed when the best descriptor is ambiguous', () => {
    const original = node()
    const first = node({ id: '0.2' })
    const second = node({ id: '0.3' })

    expect(resolveNodeRef([first, second], describeNode(original))).toBeNull()
  })

  it('fails closed when no sufficiently specific match exists', () => {
    const original = node()
    const unrelated = node({ text: 'Отмена', bounds: { left: 400, top: 700, right: 500, bottom: 760 } })

    expect(resolveNodeRef([unrelated], describeNode(original))).toBeNull()
  })
})
