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

  it('keeps runtime approval before device.ui.observe execution', () => {
    const bridge = source('src/tools/bridge.ts')
    const toolStart = bridge.indexOf("'device.ui.observe': tool({")
    const toolBody = toolStart >= 0 ? bridge.slice(toolStart) : ''
    const helperStart = bridge.indexOf('async function approveHandsTool(')
    const helperBody = helperStart >= 0 ? bridge.slice(helperStart, toolStart >= 0 ? toolStart : bridge.length) : ''

    const approvalStart = helperBody.indexOf('requestDeviceToolApproval(toolName, toolInput)')
    const executeStart = toolBody.indexOf('executeUiObserve(')
    const guardStart = toolBody.indexOf('approveHandsTool(\'device.ui.observe\', parsed)')

    expect(toolStart).toBeGreaterThanOrEqual(0)
    expect(helperStart).toBeGreaterThanOrEqual(0)
    expect(approvalStart).toBeGreaterThanOrEqual(0)
    expect(guardStart).toBeGreaterThanOrEqual(0)
    expect(executeStart).toBeGreaterThan(guardStart)
  })
})
