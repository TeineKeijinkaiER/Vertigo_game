import { useEffect, useRef } from 'react'
import { useProfile } from './ProfileContext'
import { recordResult } from './storage'
import type { PlayResult } from './types'

/**
 * 1症例分の結果を Profile に1回だけ書く。
 * React 19 の StrictMode は effect を二重に走らせるので、ref で番をする。
 * `result` が null のあいだは何もしない。
 */
export function useRecordResult(result: PlayResult | null): void {
  const { update } = useProfile()
  const done = useRef(false)

  useEffect(() => {
    if (!result || done.current) return
    done.current = true
    update((p) => recordResult(p, result, Date.now()))
  }, [result, update])
}
