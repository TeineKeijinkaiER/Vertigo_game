import { StrictMode } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { ProfileProvider, useProfile } from './ProfileContext'
import { useRecordResult } from './useRecordResult'
import { clearOf, loadProfile } from './storage'
import type { PlayResult } from './types'

const play: PlayResult = {
  caseId: 1,
  caseTitle: '後半規管型BPPV　右',
  category: 'bppv',
  rank: 'A',
  score: 88,
  ending: 'best',
  fromRandom: false,
}

function Probe({ result }: { result: PlayResult | null }) {
  useRecordResult(result)
  const { profile } = useProfile()
  return <span data-testid="plays">{clearOf(profile, 1)?.plays ?? 0}</span>
}

describe('useRecordResult', () => {
  beforeEach(() => localStorage.clear())

  it('StrictMode で effect が二重に走っても1回しか記録しない', () => {
    const { getByTestId } = render(
      <StrictMode>
        <ProfileProvider>
          <Probe result={play} />
        </ProfileProvider>
      </StrictMode>,
    )
    expect(getByTestId('plays').textContent).toBe('1')
    expect(clearOf(loadProfile(), 1)?.plays).toBe(1)
    expect(loadProfile().history).toHaveLength(1)
  })

  it('再レンダーしても増えない', () => {
    const { getByTestId, rerender } = render(
      <ProfileProvider>
        <Probe result={play} />
      </ProfileProvider>,
    )
    rerender(
      <ProfileProvider>
        <Probe result={play} />
      </ProfileProvider>,
    )
    expect(getByTestId('plays').textContent).toBe('1')
  })

  it('result が null のあいだは何も記録しない', () => {
    render(
      <ProfileProvider>
        <Probe result={null} />
      </ProfileProvider>,
    )
    expect(loadProfile().history).toHaveLength(0)
  })
})
