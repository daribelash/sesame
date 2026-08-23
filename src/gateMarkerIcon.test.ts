import { describe, expect, it } from 'vitest'
import { buildGateIcon } from './gateMarkerIcon'

describe('buildGateIcon', () => {
  it('labels the pin with the address count', () => {
    expect(buildGateIcon(3, false).label).toBe('3')
    expect(buildGateIcon(0, false).label).toBe('0')
  })

  it('uses the plain class when not flagged', () => {
    expect(buildGateIcon(2, false).className).toBe('gate-marker')
  })

  it('adds the flagged class when the gate is flagged', () => {
    expect(buildGateIcon(2, true).className).toBe('gate-marker gate-marker--flagged')
  })
})
