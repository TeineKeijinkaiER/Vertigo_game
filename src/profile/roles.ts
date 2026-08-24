import type { RoleId } from './types'

/** 表示順。TKH-ER-Quiz の職種と一対一に対応させてある */
export const ROLES: readonly { id: RoleId; name: string }[] = [
  { id: 'pgy1', name: 'PGY1' },
  { id: 'pgy2', name: 'PGY2' },
  { id: 'senior', name: '専攻医' },
  { id: 'er', name: '救急専門医' },
  { id: 'other_doctor', name: '他科医師' },
  { id: 'nurse', name: '看護師' },
  { id: 'student', name: '医学生' },
  { id: 'other', name: 'その他' },
]

const ROLE_IDS = new Set<string>(ROLES.map((r) => r.id))

export function isRoleId(v: unknown): v is RoleId {
  return typeof v === 'string' && ROLE_IDS.has(v)
}

export function roleName(id: RoleId | ''): string {
  return ROLES.find((r) => r.id === id)?.name ?? '未選択'
}
