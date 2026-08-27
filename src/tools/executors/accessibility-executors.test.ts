import { beforeEach, describe, expect, it, vi } from 'vitest'

const native = {
  getTree: vi.fn(),
  isEnabled: vi.fn(),
  perform: vi.fn(),
}

vi.mock('expo', () => ({
  requireNativeModule: () => native,
}))

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
}))

const node = (id: string, text: string | null, packageName: string) => ({
  id,
  text,
  contentDescription: null,
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
      waitMs: 100,
      expectedText: 'OK',
    })

    expect(result.verified).toBe(false)
    expect(result.status).toBe('executed_unverified')
  })

  it('accepts text verification only when the expected text appears after the action', async () => {
    native.getTree
      .mockResolvedValueOnce([node('0', null, 'com.example.app')])
      .mockResolvedValueOnce([node('0', 'Done', 'com.example.app')])

    const { executeUiAction } = await import('./accessibility-executors')
    const result = await executeUiAction({
      action: { type: 'tap', x: 10, y: 10 },
      waitMs: 100,
      expectedText: 'Done',
    })

    expect(result.verified).toBe(true)
    expect(result.status).toBe('verified')
  })

  it('accepts package verification only when the foreground package transitions', async () => {
    native.getTree
      .mockResolvedValueOnce([node('0', null, 'com.example.old')])
      .mockResolvedValueOnce([node('0', null, 'com.example.target')])

    const { executeUiAction } = await import('./accessibility-executors')
    const result = await executeUiAction({
      action: { type: 'tap', x: 10, y: 10 },
      waitMs: 100,
      expectedPackage: 'com.example.target',
    })

    expect(result.verified).toBe(true)
    expect(result.status).toBe('verified')
  })
})
