import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useRoleGate } from './useRoleGate'

describe('useRoleGate', () => {
  it('職種が選ばれていれば、その場で実行する', () => {
    const open = vi.fn()
    const run = vi.fn()
    const { result } = renderHook(() => useRoleGate('pgy1', open))

    act(() => result.current.guard(run))

    expect(run).toHaveBeenCalledTimes(1)
    expect(open).not.toHaveBeenCalled()
  })

  it('職種が未選択なら実行せず、職種選択を開く', () => {
    const open = vi.fn()
    const run = vi.fn()
    const { result } = renderHook(() => useRoleGate('', open))

    act(() => result.current.guard(run))

    expect(run).not.toHaveBeenCalled()
    expect(open).toHaveBeenCalledTimes(1)
  })

  it('resume で保留していた操作を続行する', () => {
    const run = vi.fn()
    const { result } = renderHook(() => useRoleGate('', vi.fn()))

    act(() => result.current.guard(run))
    act(() => result.current.resume())

    expect(run).toHaveBeenCalledTimes(1)
  })

  it('resume は一度きり。二度目は何も起こさない', () => {
    const run = vi.fn()
    const { result } = renderHook(() => useRoleGate('', vi.fn()))

    act(() => result.current.guard(run))
    act(() => result.current.resume())
    act(() => result.current.resume())

    expect(run).toHaveBeenCalledTimes(1)
  })

  it('cancel すると保留は捨てられる', () => {
    const run = vi.fn()
    const { result } = renderHook(() => useRoleGate('', vi.fn()))

    act(() => result.current.guard(run))
    act(() => result.current.cancel())
    act(() => result.current.resume())

    expect(run).not.toHaveBeenCalled()
  })
})
