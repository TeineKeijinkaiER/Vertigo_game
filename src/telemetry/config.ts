/**
 * 送信先の URL は public/app-config.json から実行時に読む。
 * ビルドに埋め込まないので、GitHub Pages 上で URL を差し替えるのに
 * 再ビルドが要らない。
 */
let cached: Promise<string> | null = null
let override: string | null = null

/** Apps Script の Web アプリ（/exec）だけを受け入れる */
export function isValidGasUrl(url: string): boolean {
  return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:[?#].*)?$/.test(url)
}

export function loadTelemetryUrl(): Promise<string> {
  if (override !== null) return Promise.resolve(override)
  if (!cached) {
    cached = fetch(`${import.meta.env.BASE_URL}app-config.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: unknown) => {
        const url = (j as { googleSheetsWebAppUrl?: unknown } | null)?.googleSheetsWebAppUrl
        return typeof url === 'string' ? url.trim() : ''
      })
      .catch(() => '')
  }
  return cached
}

/** テスト専用。URL の解決を差し替える。null に戻すと通常の読み込みへ帰る */
export function __setTelemetryUrlForTest(url: string | null): void {
  override = url
  cached = null
}
