import { beforeEach, describe, expect, it, vi } from 'vitest'

const native = {
  getTree: vi.fn(),
}

const openApplication = vi.fn()

vi.mock('expo', () => ({
  requireNativeModule: () => native,
}))

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
}))

vi.mock('expo-intent-launcher', () => ({
  openApplication,
}))

vi.mock('expo-file-system', () => ({
  readAsStringAsync: vi.fn(),
  EncodingType: { UTF8: 'utf8' },
}))

vi.mock('../device-tools', () => ({
  isAppApprovedForSession: vi.fn(() => true),
  getSessionApprovedPackages: vi.fn(() => []),
}))

describe('device.open_app foreground verification', () => {
  beforeEach(() => {
    native.getTree.mockReset()
    openApplication.mockReset()
    openApplication.mockResolvedValue(undefined)
  })

  it('returns verified only after the target package becomes the foreground root', async () => {
    native.getTree
      .mockResolvedValueOnce([{ id: '0', packageName: 'com.example.launcher' }])
      .mockResolvedValueOnce([{ id: '0', packageName: 'com.example.target' }])

    const { executeOpenApp } = await import('./device-executors')
    const result = await executeOpenApp({ packageName: 'com.example.target' })

    expect(openApplication).toHaveBeenCalledWith('com.example.target')
    expect(result).toEqual({
      status: 'launched_verified',
      packageName: 'com.example.target',
      verified: true,
    })
    expect(native.getTree).toHaveBeenCalledTimes(2)
  })

  it('never verifies when the target package is already foreground before launch', async () => {
    native.getTree
      .mockResolvedValueOnce([{ id: '0', packageName: 'com.example.target' }])
      .mockResolvedValueOnce([{ id: '0', packageName: 'com.example.target' }])

    const { executeOpenApp } = await import('./device-executors')
    const result = await executeOpenApp({ packageName: 'com.example.target' })

    expect(result.status).toBe('launched_unverified')
    expect(result.verified).toBe(false)
  })

  it('never verifies another foreground package', async () => {
    native.getTree
      .mockResolvedValueOnce([{ id: '0', packageName: 'com.example.launcher' }])
      .mockResolvedValueOnce([{ id: '0', packageName: 'com.example.other' }])

    const { executeOpenApp } = await import('./device-executors')
    const result = await executeOpenApp({ packageName: 'com.example.target' })

    expect(result.status).toBe('launched_unverified')
    expect(result.verified).toBe(false)
  })

  it('returns launch_failed when the launcher rejects', async () => {
    openApplication.mockRejectedValueOnce(new Error('not installed'))

    const { executeOpenApp } = await import('./device-executors')
    const result = await executeOpenApp({ packageName: 'com.example.target' })

    expect(result).toEqual({
      status: 'launch_failed',
      packageName: 'com.example.target',
      verified: false,
    })
    expect(native.getTree).not.toHaveBeenCalled()
  })
})
