import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SaveFirstGateStep } from './SaveFirstGateStep'

const originalGeolocation = navigator.geolocation

afterEach(() => {
  Object.defineProperty(navigator, 'geolocation', {
    value: originalGeolocation,
    configurable: true,
  })
})

function stubDeniedGeolocation() {
  Object.defineProperty(navigator, 'geolocation', {
    value: {
      getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) =>
        error({ code: 1 } as GeolocationPositionError),
    },
    configurable: true,
  })
}

describe('SaveFirstGateStep', () => {
  it('calls onSave with the entered name and code', async () => {
    stubDeniedGeolocation()
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(<SaveFirstGateStep onSave={onSave} onSkip={vi.fn()} />)

    await user.type(screen.getByLabelText('Gate name'), 'Oakwood Estates')
    await user.type(screen.getByLabelText('Code'), '0451#')
    await user.click(screen.getByRole('button', { name: 'Save gate' }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Oakwood Estates', code: '0451#' }),
    )
  })

  it('calls onSkip without requiring any fields', async () => {
    const onSkip = vi.fn()
    const user = userEvent.setup()
    render(<SaveFirstGateStep onSave={vi.fn()} onSkip={onSkip} />)

    await user.click(screen.getByRole('button', { name: 'Skip this step' }))

    expect(onSkip).toHaveBeenCalledOnce()
  })

  it('shows the step 2 of 3 label', () => {
    render(<SaveFirstGateStep onSave={vi.fn()} onSkip={vi.fn()} />)
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument()
  })
})
