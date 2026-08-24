import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { loadProfile, saveProfile } from './storage'
import type { Profile } from './types'

interface ProfileApi {
  profile: Profile
  /** 現在の Profile から次の Profile を作る。保存も行う */
  update: (fn: (p: Profile) => Profile) => void
}

const ProfileCtx = createContext<ProfileApi | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(loadProfile)

  const update = useCallback((fn: (p: Profile) => Profile) => {
    setProfile((prev) => {
      const next = fn(prev)
      saveProfile(next)
      return next
    })
  }, [])

  const api = useMemo(() => ({ profile, update }), [profile, update])
  return <ProfileCtx.Provider value={api}>{children}</ProfileCtx.Provider>
}

export function useProfile(): ProfileApi {
  const api = useContext(ProfileCtx)
  if (!api) throw new Error('useProfile must be used inside <ProfileProvider>')
  return api
}
