import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { BppvLearnScreen } from './BppvLearn'
import { ProfileProvider } from '../profile/ProfileContext'

vi.mock('../telemetry/send', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../telemetry/send')>()
  return {
    ...actual,
    sendBppvPracticeOpen: vi.fn(),
  }
})

import { sendBppvPracticeOpen } from '../telemetry/send'

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
    vi.mocked(sendBppvPracticeOpen).mockClear()
  })

  it('練習モードを開いた時点で閲覧履歴を1回だけ送る', () => {
    renderScreen()
    expect(sendBppvPracticeOpen).toHaveBeenCalledTimes(1)
    const sentPayload = vi.mocked(sendBppvPracticeOpen).mock.calls[0][0]
    expect(sentPayload.kind).toBe('bppv_practice_open')
    expect(sentPayload.openedAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })

  it('型を選び直しても追加で送らない', () => {
    renderScreen()
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'hc_geo_r' } })
    fireEvent.change(select, { target: { value: 'hc_apo_l' } })

    expect(sendBppvPracticeOpen).toHaveBeenCalledTimes(1)
  })

  it('選んだ型の内容は画面に反映される', () => {
    renderScreen()
    const select = screen.getByRole('combobox') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'hc_geo_r' } })
    expect(select.value).toBe('hc_geo_r')
  })
})
