import { beforeEach, describe, expect, it, vi } from 'vitest'

const native = {
  getTree: vi.fn(),
  isEnabled: vi.fn(),
  perform: vi.fn(),
}

vi.mock('../../../modules/accessibility-agent', () => ({
  HANDS_MAX_TREE_NODES: 200,
  isAccessibilityEnabled: () => native.isEnabled(),
}))

vi.mock('../../../modules/accessibility-agent/native', () => ({
  nativeGetAccessibilityTree: (maxNodes: number) => native.getTree(maxNodes),
  nativePerformAccessibilityAction: (action: unknown) => native.perform(action),
}))

const node = (
  id: string,
  text: string | null,
  packageName: string,
  contentDescription: string | null = null,
) => ({
  id,
  text,
  contentDescription,
  className: 'android.view.View',
  packageName,
  clickable: true,
  editable: false,
  enabled: true,
  bounds: { left: 0, top: 0, right: 100, bottom: 100 },
})

describe('Hands causal UI verification', () => {
  beforeEach(() => {
    native.isEnabled.mockResolvedValue(true)
    native.perform.mockResolvedValue({ status: 'executed', action: 'tap' })
    native.getTree.mockReset()
  })

  it('rejects a pre-existing expected text as proof of the new action', async () => {
    native.getTree
      .mockResolvedValueOnce([node('0', 'OK', 'com.example.app')])
      .mockResolvedValueOnce([node('0', 'OK', 'com.example.app')])

    const { executeUiAction } = await import('./accessibility-executors')
    const result = await executeUiAction({
      action: { type: 'tap', x: 10, y: 10 },
      waitMs: 0,
      expectedText: 'OK',
    })

    expect(result.verified).toBe(false)
    expect(result.status).toBe('executed_unverified')
  })

  it('rejects a partial text match as proof of the expected text', async () => {
    native.getTree
      .mockResolvedValueOnce([node('0', 'Submit', 'com.example.app')])
      .mockResolvedValueOnce([node('0', 'Not OK', 'com.example.app')])

    const { executeUiAction } = await import('./accessibility-executors')
    const result = await executeUiAction({
      action: { type: 'tap', x: 10, y: 10 },
      waitMs: 0,
      expectedText: 'OK',
    })

    expect(result.verified).toBe(false)
    expect(result.status).toBe('executed_unverified')
  })

  it('uses trimmed exact text matching and remains case-sensitive', async () => {
    native.getTree
      .mockResolvedValueOnce([node('0', null, 'com.example.app')])
      .mockResolvedValueOnce([
        node('0', ' Done ', 'com.example.app'),
        node('0.1', 'done', 'com.example.app'),
      ])

    const { executeUiAction } = await import('./accessibility-executors')
    const result = await executeUiAction({
      action: { type: 'tap', x: 10, y: 10 },
      waitMs: 0,
      expectedText: 'Done',
    })

    expect(result.verified).toBe(true)
    expect(result.status).toBe('verified')
  })

  it('matches an exact content description without accepting surrounding text', async () => {
    native.getTree
      .mockResolvedValueOnce([node('0', null, 'com.example.app')])
      .mockResolvedValueOnce([
        node('0', 'Button', 'com.example.app', 'Done'),
        node('0.1', 'Not Done', 'com.example.app', null),
      ])

    const { executeUiAction } = await import('./accessibility-executors')
    const result = await executeUiAction({
      action: { type: 'tap', x: 10, y: 10 },
      waitMs: 0,
      expectedText: 'Done',
    })

    expect(result.verified).toBe(true)
    expect(result.status).toBe('verified')
  })

  it('rejects an empty or whitespace-only expected text', async () => {
    native.getTree
      .mockResolvedValueOnce([node('0', null, 'com.example.app')])
      .mockResolvedValueOnce([node('0', '', 'com.example.app')])

    const { executeUiAction } = await import('./accessibility-executors')
    const result = await executeUiAction({
      action: { type: 'tap', x: 10, y: 10 },
      waitMs: 0,
      expectedText: '   ',
    })

    expect(result.verified).toBe(false)
    expect(result.status).toBe('executed_unverified')
  })

  it('accepts package verification only when the foreground package transitions', async () => {
    native.getTree
      .mockResolvedValueOnce([node('0', null, 'com.example.old')])
      .mockResolvedValueOnce([node('0', null, 'com.example.target')])

    const { executeUiAction } = await import('./accessibility-executors')
    const result = await executeUiAction({
      action: { type: 'tap', x: 10, y: 10 },
      waitMs: 0,
      expectedPackage: 'com.example.target',
    })

    expect(result.verified).toBe(true)
    expect(result.status).toBe('verified')
  })

  it('requires both text and package transitions when both are requested', async () => {
    native.getTree
      .mockResolvedValueOnce([
        node('0', 'Done', 'com.example.old'),
      ])
      .mockResolvedValueOnce([
        node('0', 'Done', 'com.example.target'),
      ])

    const { executeUiAction } = await import('./accessibility-executors')
    const result = await executeUiAction({
      action: { type: 'tap', x: 10, y: 10 },
      waitMs: 0,
      expectedText: 'Done',
      expectedPackage: 'com.example.target',
    })

    expect(result.verified).toBe(false)
    expect(result.status).toBe('executed_unverified')
  })
})
