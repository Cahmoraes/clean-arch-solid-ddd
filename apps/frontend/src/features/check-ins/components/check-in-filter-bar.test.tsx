import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CheckInFilterStatus } from '../hooks/use-check-in-filters.js'
import { CheckInFilterBar } from './check-in-filter-bar.js'

describe('CheckInFilterBar', () => {
  it('renders all 4 filter pills', () => {
    render(<CheckInFilterBar status={undefined} onStatusChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pendentes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aprovados' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rejeitados' })).toBeInTheDocument()
  })

  it('marks "Todos" as active (aria-pressed=true) when status is undefined', () => {
    render(<CheckInFilterBar status={undefined} onStatusChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Pendentes' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('marks the matching status pill as active', () => {
    render(<CheckInFilterBar status="pending" onStatusChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Pendentes' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Aprovados' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onStatusChange with "pending" when Pendentes is clicked', async () => {
    const user = userEvent.setup()
    const onStatusChange = vi.fn()
    render(<CheckInFilterBar status={undefined} onStatusChange={onStatusChange} />)
    await user.click(screen.getByRole('button', { name: 'Pendentes' }))
    expect(onStatusChange).toHaveBeenCalledWith('pending')
  })

  it('calls onStatusChange with undefined when Todos is clicked', async () => {
    const user = userEvent.setup()
    const onStatusChange = vi.fn()
    render(<CheckInFilterBar status="pending" onStatusChange={onStatusChange} />)
    await user.click(screen.getByRole('button', { name: 'Todos' }))
    expect(onStatusChange).toHaveBeenCalledWith(undefined)
  })

  it('calls onStatusChange with "validated" when Aprovados is clicked', async () => {
    const user = userEvent.setup()
    const onStatusChange = vi.fn()
    render(<CheckInFilterBar status={undefined} onStatusChange={onStatusChange} />)
    await user.click(screen.getByRole('button', { name: 'Aprovados' }))
    expect(onStatusChange).toHaveBeenCalledWith('validated')
  })

  it('calls onStatusChange with "rejected" when Rejeitados is clicked', async () => {
    const user = userEvent.setup()
    const onStatusChange = vi.fn()
    render(<CheckInFilterBar status={undefined} onStatusChange={onStatusChange} />)
    await user.click(screen.getByRole('button', { name: 'Rejeitados' }))
    expect(onStatusChange).toHaveBeenCalledWith('rejected')
  })
})
