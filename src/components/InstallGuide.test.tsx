import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InstallGuide } from './InstallGuide'
import { markInstallGuideComplete } from '../lib/install-guide'

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36'

function setDevice(userAgent: string, standalone = false) {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: userAgent })
  Object.defineProperty(navigator, 'platform', { configurable: true, value: '' })
  Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: 0 })
  Object.defineProperty(navigator, 'standalone', { configurable: true, value: false })
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: standalone,
      media: '(display-mode: standalone)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  })
}

describe('InstallGuide', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    setDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
  })

  it('iPhoneでは共有マークとSafariの手順を表示する', async () => {
    setDevice(IPHONE_UA)
    render(<InstallGuide />)

    expect(await screen.findByRole('dialog')).toBeDefined()
    expect(screen.getByRole('img', { name: '四角から上向き矢印が出ている共有マーク' })).toBeDefined()
    expect(screen.getByRole('heading', { name: 'このアプリを追加' })).toBeDefined()
    expect(screen.getByText(/携帯電話のホーム画面に登録すると/)).toBeDefined()
    expect(screen.getByText(/Safariの「共有」/)).toBeDefined()
    expect(screen.getByText(/「ホーム画面に追加」/)).toBeDefined()
    expect(screen.queryByText('ホーム画面に追加できた')).toBeNull()
    expect(screen.queryByText('今回は閉じる')).toBeNull()
  })

  it('AndroidではChromeメニューの代替手順を表示する', async () => {
    setDevice(ANDROID_UA)
    render(<InstallGuide />)

    expect(await screen.findByRole('dialog')).toBeDefined()
    expect(screen.getByText(/Chrome右上/)).toBeDefined()
    expect(screen.getByText(/「アプリをインストール」/)).toBeDefined()
  })

  it('案内を閉じると同じ閲覧中は再表示しない', async () => {
    setDevice(IPHONE_UA)
    const view = render(<InstallGuide />)
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: '案内を閉じる' }))
    expect(screen.queryByRole('dialog')).toBeNull()

    view.unmount()
    render(<InstallGuide />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('追加完了後は別の閲覧でも再表示しない', () => {
    setDevice(IPHONE_UA)
    markInstallGuideComplete()
    render(<InstallGuide />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('ホーム画面からのstandalone起動では表示しない', () => {
    setDevice(IPHONE_UA, true)
    render(<InstallGuide />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('デスクトップでは表示しない', () => {
    render(<InstallGuide />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
