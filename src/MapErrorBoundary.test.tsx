import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MapErrorBoundary } from './MapErrorBoundary'

function Bomb(): never {
  throw new Error('boom')
}

describe('MapErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <MapErrorBoundary>
        <p>Map content</p>
      </MapErrorBoundary>,
    )

    expect(screen.getByText('Map content')).toBeInTheDocument()
  })

  it('renders a fallback instead of crashing when a child throws', () => {
    const originalError = console.error
    console.error = () => {}

    render(
      <MapErrorBoundary>
        <Bomb />
      </MapErrorBoundary>,
    )

    expect(screen.getByText('Map unavailable.')).toBeInTheDocument()

    console.error = originalError
  })
})
