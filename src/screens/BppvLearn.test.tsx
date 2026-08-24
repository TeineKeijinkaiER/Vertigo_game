import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { BppvLearnScreen } from './BppvLearn'
import { ProfileProvider } from '../profile/ProfileContext'

vi.mock('../telemetry/send', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../telemetry/send')>()
  return {
    ...actual,
    sendBppvLearnView: vi.fn(),
  }
})

import { sendBppvLearnView } from '../telemetry/send'

function renderScreen() {
  render(
    <ProfileProvider>
      <BppvLearnScreen dispatch={vi.fn()} />
    </ProfileProvider>,
  )
}

describe('BppvLearnScreen', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(sendBppvLearnView).mockClear()
  })

  it('初期表示では送信しない', () => {
    renderScreen()
    expect(sendBppvLearnView).not.toHaveBeenCalled()
  })

  it('コンボボックスで型を選ぶと参照を記録する', () => {
    renderScreen()
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'hc_geo_r' } })

    expect(sendBppvLearnView).toHaveBeenCalledTimes(1)
    const sentPayload = vi.mocked(sendBppvLearnView).mock.calls[0][0]
    expect(sentPayload.kind).toBe('bppv_learn_view')
    expect(sentPayload.lessonId).toBe('hc_geo_r')
    expect(sentPayload.family).toBe('水平半規管・向地性')
  })

  it('同じ型を選び直しても（変化がなければ）連続送信しない', () => {
    renderScreen()
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'hc_geo_r' } })
    fireEvent.change(select, { target: { value: 'hc_geo_r' } })
    expect(sendBppvLearnView).toHaveBeenCalledTimes(1)
  })
})
