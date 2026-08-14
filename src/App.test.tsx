import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

beforeEach(() => {
  localStorage.clear()
})

describe('App', () => {
  it('adds a gate to the list on submit', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Gate name'), 'Oakwood Estates')
    await user.type(screen.getByLabelText('Code'), '0451#')
    await user.type(screen.getByLabelText('Notes'), 'call box on the right')
    await user.click(screen.getByRole('button', { name: 'Save gate' }))

    expect(
      screen.getByRole('heading', { name: 'Oakwood Estates' }),
    ).toBeInTheDocument()
    expect(screen.getByText('0451#')).toBeInTheDocument()
    expect(screen.getByText('call box on the right')).toBeInTheDocument()
  })

  it('clears the form after a successful submit', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Gate name'), 'Oakwood Estates')
    await user.type(screen.getByLabelText('Code'), '0451#')
    await user.click(screen.getByRole('button', { name: 'Save gate' }))

    expect(screen.getByLabelText('Gate name')).toHaveValue('')
    expect(screen.getByLabelText('Code')).toHaveValue('')
  })

  it('loads previously saved gates on mount', () => {
    localStorage.setItem(
      'sesame:gates',
      JSON.stringify([
        {
          id: '1',
          name: 'Riverbend',
          code: '7788',
          notes: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
        },
      ]),
    )

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Riverbend' })).toBeInTheDocument()
  })
})
