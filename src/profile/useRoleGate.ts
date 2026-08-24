import { useCallback, useRef } from 'react'
import type { RoleId } from './types'

/**
 * 職種が未選択のまま診察を始めようとしたら、職種選択へ誘導する。
 * 選択が終わったら保留していた操作をそのまま続行する。
 * ボタンをもう一度押させるのは、学習者にとって意味のない一手間なので避ける。
 */
export function useRoleGate(roleId: RoleId | '', openRolePick: () => void) {
  const pending = useRef<(() => void) | null>(null)

  const guard = useCallback(
    (run: () => void) => {
      if (roleId) {
        run()
        return
      }
      pending.current = run
      openRolePick()
    },
    [roleId, openRolePick],
  )

  const resume = useCallback(() => {
    const run = pending.current
    pending.current = null
    run?.()
  }, [])

  const cancel = useCallback(() => {
    pending.current = null
  }, [])

  return { guard, resume, cancel }
}
