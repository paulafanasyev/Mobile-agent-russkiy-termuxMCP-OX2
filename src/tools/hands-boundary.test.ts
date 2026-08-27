import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function source(relativePath: string) {
  return readFileSync(resolve(root, relativePath), 'utf8')
}

describe('Hands native boundary', () => {
  it('does not publicly export native UI observation or action executors', () => {
    const moduleSource = source('modules/accessibility-agent/index.ts')
    expect(moduleSource).not.toMatch(/export\s+(async\s+)?function\s+getAccessibilityTree\b/)
    expect(moduleSource).not.toMatch(/export\s+(async\s+)?function\s+performAccessibilityAction\b/)
    expect(moduleSource).not.toMatch(/runApprovedAccessibilityAction|observeAccessibilityTree/)
  })

  it('requires approval before device.ui.observe execution', () => {
    const bridge = source('src/tools/bridge.ts')
    const toolStart = bridge.indexOf("'device.ui.observe': tool({")
    const toolBody = toolStart >= 0 ? bridge.slice(toolStart) : ''
    const approvalStart = toolBody.indexOf("requestDeviceToolApproval('device.ui.observe', parsed)")
    const executeStart = toolBody.indexOf('executeUiObserve(')

    expect(toolStart).toBeGreaterThanOrEqual(0)
    expect(approvalStart).toBeGreaterThanOrEqual(0)
    expect(executeStart).toBeGreaterThan(approvalStart)
  })
})
