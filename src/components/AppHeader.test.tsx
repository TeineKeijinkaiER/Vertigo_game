import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { AppHeader } from './AppHeader'
import { ProfileProvider } from '../profile/ProfileContext'
import { loadProfile, STORAGE_KEY } from '../profile/storage'

function renderHeader(onOpen = vi.fn()) {
  render(
    <ProfileProvider>
      <AppHeader onOpen={onOpen} />
    </ProfileProvider>,
  )
  return onOpen
}

describe('AppHeader', () => {
  beforeEach(() => localStorage.clear())

  it('4つのボタンを出す', () => {
    renderHeader()
    expect(screen.getByRole('button', { name: 'つかいかた' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'きろく' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'りれき' })).toBeDefined()
    expect(screen.getByRole('button', { name: '♪ON' })).toBeDefined()
  })

  it('ボタンを押すと overlay を要求する', () => {
    const onOpen = renderHeader()
    fireEvent.click(screen.getByRole('button', { name: 'つかいかた' }))
    expect(onOpen).toHaveBeenCalledWith('howto')
    fireEvent.click(screen.getByRole('button', { name: 'きろく' }))
    expect(onOpen).toHaveBeenCalledWith('clears')
    fireEvent.click(screen.getByRole('button', { name: 'りれき' }))
    expect(onOpen).toHaveBeenCalledWith('history')
  })

  it('♪ を押すと表示が反転し、localStorage に残る', () => {
    renderHeader()
    fireEvent.click(screen.getByRole('button', { name: '♪ON' }))
    expect(screen.getByRole('button', { name: '♪OFF' })).toBeDefined()
    expect(loadProfile().muted).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
  })

  it('♪ は overlay を開かない', () => {
    const onOpen = renderHeader()
    fireEvent.click(screen.getByRole('button', { name: '♪ON' }))
    expect(onOpen).not.toHaveBeenCalled()
  })
})
