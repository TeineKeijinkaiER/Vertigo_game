import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Nystagmus } from './Nystagmus'

/** 注視目標と眼振図が、画面の左右どちらの順に並んでいるか */
function order(container: HTMLElement): string[] | null {
  const row = container.querySelector('.gaze-row')
  if (!row) return null
  return [...row.children].map((el) => (el.classList.contains('gaze-target') ? 'target' : 'eyes'))
}

describe('注視目標の指', () => {
  // 図は検者から見たもの。患者が右を注視すると、眼は画面の左に寄る。
  // 追っている指も同じ側になければ、目線と目標が食い違って見える。
  it('右方注視では指を画面の左に置く', () => {
    const { container } = render(<Nystagmus spec={{ horizontal: 8, frequency: 3, gazeOffset: 14 }} />)
    expect(order(container)).toEqual(['target', 'eyes'])
  })

  it('左方注視では指を画面の右に置く', () => {
    const { container } = render(<Nystagmus spec={{ horizontal: -8, frequency: 3, gazeOffset: -14 }} />)
    expect(order(container)).toEqual(['eyes', 'target'])
  })

  it('注視させていない所見には指を出さない', () => {
    const { container } = render(<Nystagmus spec={{ horizontal: 5, torsional: 5, frequency: 3 }} />)
    expect(container.querySelector('.gaze-target')).toBeNull()
  })

  it('左右の注視を2枚並べたら、それぞれに指がつく', () => {
    const { container } = render(
      <Nystagmus
        spec={{
          horizontal: 8,
          frequency: 3,
          gazeOffset: 14,
          gazeOpposite: { horizontal: -8, frequency: 3, gazeOffset: -14 },
        }}
      />,
    )
    const targets = container.querySelectorAll('.gaze-target')
    expect(targets).toHaveLength(2)
    // 2枚目は反対を注視しているので、指も反対側にいる
    const rows = [...container.querySelectorAll('.gaze-row')].map((row) =>
      [...row.children].map((el) => (el.classList.contains('gaze-target') ? 'target' : 'eyes')),
    )
    expect(rows).toEqual([
      ['target', 'eyes'],
      ['eyes', 'target'],
    ])
  })
})
