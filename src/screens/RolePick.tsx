import { Button, MenuItem, Win } from '../components/ui'
import { useProfile } from '../profile/ProfileContext'
import { ROLES } from '../profile/roles'

export function RolePickScreen({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const { profile, update } = useProfile()

  const pick = (id: (typeof ROLES)[number]['id']) => {
    update((p) => ({ ...p, roleId: id }))
    onDone()
  }

  return (
    <div className="stack grow scroll">
      <Win title="しょくしゅをえらぶ">
        <p className="msg small dim" style={{ margin: '0 0 8px' }}>
          学習状況の集計に使います。個人を特定する情報は送りません。
        </p>
        <div className="menu">
          {ROLES.map((r) => (
            <MenuItem
              key={r.id}
              label={r.name}
              checked={profile.roleId === r.id}
              onSelect={() => pick(r.id)}
            />
          ))}
        </div>
      </Win>
      <div className="grow" />
      <Button onClick={onCancel}>やめる</Button>
    </div>
  )
}
