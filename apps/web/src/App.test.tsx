import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the platform name', () => {
    render(<App />)
    expect(screen.getByText('مسار')).toBeInTheDocument()
  })
})
