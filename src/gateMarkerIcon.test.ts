import { describe, expect, it } from 'vitest'
import { buildGateIcon } from './gateMarkerIcon'

describe('buildGateIcon', () => {
  it('uses the plain class when not flagged', () => {
    expect(buildGateIcon(false).className).toBe('gate-marker')
  })

  it('adds the flagged class when the gate is flagged', () => {
    expect(buildGateIcon(true).className).toBe('gate-marker gate-marker--flagged')
  })
})
