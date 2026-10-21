import { useState, type DragEvent } from 'react'
import { Avatar, Badge, Button, Card, ErrorBlock, Input, LoadingBlock, Modal, PageHeader, StatusBadge } from '@/components/ui'
import { cn } from '@/lib/cn'
import { TEAM_MIN, teamMix, teamRuleError } from '@/lib/teams'
import { api, ApiError } from '@/services/api'
import { useApi, useInvalidate } from '@/store/data'
import { useToast } from '@/store/toast'
import type { Team, User } from '@/types'
import UsersTabs from './UsersTabs'

/** AP-03 · Delivery Teams — group drivers/custodians into operational units. */
export default function Teams() {
  const { data: teams, error, reload } = useApi(() => api.teams.list())
  const { data: users } = useApi(() => api.users.list())
  const invalidate = useInvalidate()
  const toast = useToast()
  const [editing, setEditing] = useState<Team | 'new' | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [addFor, setAddFor] = useState<User | null>(null)

  if (error) return <ErrorBlock error={error} onRetry={reload} />
  if (!teams || !users) return <LoadingBlock />

  const delivery = users.filter((u) => u.role === 'Driver' || u.role === 'Custodian')
  const unassigned = delivery.filter((u) => !teams.some((t) => t.memberIds.includes(u.id)))
  const byId = (id: string) => users.find((u) => u.id === id)

  const moveTo = async (userId: string, team: Team) => {
    if (team.memberIds.includes(userId)) return
    try {
      await api.teams.update(team.id, { name: team.name, memberIds: [...team.memberIds, userId] })
      invalidate()
      toast(`${byId(userId)?.name} added to ${team.name}.`)
    } catch (e) {
      toast((e as ApiError).message, 'error')
    }
  }

  const removeFrom = async (userId: string, team: Team) => {
    await api.teams.update(team.id, { name: team.name, memberIds: team.memberIds.filter((m) => m !== userId) })
    invalidate()
    toast(`${byId(userId)?.name} moved to unassigned.`, 'info')
  }

  /** Lock the team in once it has at least 1 driver + 2 custodians. */
  const confirmTeam = async (team: Team) => {
    const rule = teamRuleError(team.memberIds, users)
    if (rule) {
      toast(`${team.name}: ${rule}`, 'error')
      return
    }
    try {
      await api.teams.update(team.id, { name: team.name, memberIds: team.memberIds, confirmed: true })
      invalidate()
      toast(`${team.name} confirmed. It can now be assigned to deliveries.`)
    } catch (e) {
      toast((e as ApiError).message, 'error')
    }
  }

  const dropProps = (key: string, onDrop: (userId: string) => void) => ({
    onDragOver: (e: DragEvent) => {
      e.preventDefault()
      setDropTarget(key)
    },
    onDragLeave: () => setDropTarget((t) => (t === key ? null : t)),
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      setDropTarget(null)
      const id = e.dataTransfer.getData('text/user-id')
      if (id) onDrop(id)
    },
  })

  return (
    <>
      <UsersTabs />
      <PageHeader
        title="Delivery Team Grouping"
        subtitle="Bundle delivery members into named operational units"
        actions={<Button onClick={() => setEditing('new')}>+ Create Team</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {teams.map((t) => (
          <Card
            key={t.id}
            padded={false}
            className={cn('flex flex-col p-4 transition', dropTarget === t.id && 'ring-4 ring-violet/30')}
          >
            <div {...dropProps(t.id, (id) => moveTo(id, t))} className="flex flex-1 flex-col">
              <p className="text-[16px] font-bold text-ink">{t.name}</p>
              <div className="mt-1 mb-3 flex items-center justify-between">
                <span className="text-[11px] text-ink-60">
                  {teamMix(t.memberIds, users).drivers}/{TEAM_MIN.Driver} driver · {teamMix(t.memberIds, users).custodians}/{TEAM_MIN.Custodian} custodians
                </span>
                {t.confirmed ? (
                  <Badge tone={t.status === 'On trip' ? 'violet' : 'lime'}>{t.status}</Badge>
                ) : (
                  <Badge tone="amber">Draft</Badge>
                )}
              </div>
              <ul className="flex flex-1 flex-col gap-2">
                {t.memberIds.length === 0 && (
                  <li className="rounded-[16px] border border-dashed border-ink-9 px-3 py-4 text-center text-[12px] text-ink-38">
                    Drop members here
                  </li>
                )}
                {t.memberIds.map((id) => {
                  const u = byId(id)
                  return u ? <MemberRow key={id} user={u} onRemove={() => removeFrom(id, t)} /> : null
                })}
              </ul>
              {!t.confirmed && (
                <Button size="sm" className="mt-3 w-full !py-2.5" onClick={() => confirmTeam(t)}>
                  Confirm team
                </Button>
              )}
              <Button variant="ghost" size="sm" className="mt-2 w-full !py-2.5" onClick={() => setEditing(t)}>
                Edit members
              </Button>
            </div>
          </Card>
        ))}

        <Card padded={false} className={cn('p-4 transition', dropTarget === 'none' && 'ring-4 ring-violet/30')}>
          <div
            {...dropProps('none', (id) => {
              const t = teams.find((x) => x.memberIds.includes(id))
              if (t) removeFrom(id, t)
            })}
          >
            <p className="text-[16px] font-bold text-ink">Unassigned members · {unassigned.length}</p>
            <p className="mt-1 mb-3 text-[11px] text-ink-60">Drag or add into a team</p>
            <ul className="-mr-2 flex max-h-[360px] flex-col gap-1 overflow-y-auto pr-2">
              {unassigned.length === 0 && <li className="py-4 text-center text-[12px] text-ink-38">Everyone is in a team.</li>}
              {unassigned.map((u) => (
                <li
                  key={u.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/user-id', u.id)}
                  className="flex cursor-grab items-center justify-between gap-2 rounded-[16px] px-2 py-2 hover:bg-ink-4"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={u.name} size={30} />
                    <span className="min-w-0 leading-tight">
                      <span className="block truncate text-[12px] font-bold text-ink">{u.name}</span>
                      <span className="block text-[10px] text-ink-60">{u.role}</span>
                    </span>
                  </span>
                  <button type="button" onClick={() => setAddFor(u)} className="shrink-0 text-[11px] font-bold text-violet hover:underline">
                    + Add
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      {editing && (
        <TeamForm team={editing === 'new' ? null : editing} delivery={delivery} teams={teams} onClose={() => setEditing(null)} />
      )}

      <Modal open={!!addFor} onClose={() => setAddFor(null)} size="sm" title={`Add ${addFor?.name ?? ''} to…`}>
        <ul className="flex flex-col gap-2 pb-2">
          {teams.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={async () => {
                  if (addFor) await moveTo(addFor.id, t)
                  setAddFor(null)
                }}
                className="flex w-full items-center justify-between rounded-[18px] bg-white/70 px-4 py-3 text-left hover:bg-white"
              >
                <span>
                  <span className="block text-[14px] font-bold text-ink">{t.name}</span>
                  <span className="block text-[11px] text-ink-60">
                    {t.memberIds.length} members{t.confirmed ? '' : ' · draft'}
                  </span>
                </span>
                <StatusBadge status={t.status} />
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  )
}

function MemberRow({ user, onRemove }: { user: User; onRemove: () => void }) {
  return (
    <li
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/user-id', user.id)}
      className="group flex cursor-grab items-center justify-between gap-2 rounded-[16px] bg-ink-6 px-2.5 py-2"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <Avatar name={user.name} size={30} />
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[12px] font-bold text-ink">{user.name}</span>
          <span className="block text-[10px] text-ink-60">{user.role}</span>
        </span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${user.name}`}
        className="text-[11px] font-bold text-ink-38 opacity-100 hover:text-danger sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
      >
        ✕
      </button>
    </li>
  )
}

function TeamForm({ team, delivery, teams, onClose }: { team: Team | null; delivery: User[]; teams: Team[]; onClose: () => void }) {
  const invalidate = useInvalidate()
  const toast = useToast()
  const [name, setName] = useState(team?.name ?? `Team ${String.fromCharCode(65 + teams.length)}`)
  const [members, setMembers] = useState<string[]>(team?.memberIds ?? [])
  const [error, setError] = useState<string>()
  const [ruleError, setRuleError] = useState<string>()
  const [busy, setBusy] = useState(false)

  // People already in another team aren't offered: only unassigned ones and this team's own members.
  const pickable = delivery.filter((u) => {
    const t = teams.find((x) => x.memberIds.includes(u.id))
    return !t || t.id === team?.id
  })
  const mix = teamMix(members, delivery)
  const toggle = (id: string) => {
    setRuleError(undefined)
    setMembers((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))
  }

  const save = async (confirmed: boolean) => {
    const rule = confirmed ? teamRuleError(members, delivery) : null
    if (rule) {
      setRuleError(rule)
      return
    }
    setBusy(true)
    try {
      if (team) await api.teams.update(team.id, { name, memberIds: members, confirmed })
      else await api.teams.create({ name, memberIds: members, confirmed })
      invalidate()
      toast(confirmed ? `${name} confirmed.` : `${name} saved as a draft. Confirm it once it has 1 driver and 2 custodians.`)
      onClose()
    } catch (e) {
      const ae = e as ApiError
      if (ae.fields?.members) setRuleError(ae.message)
      else setError(ae.fields?.name ?? ae.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={team ? `Edit ${team.name}` : 'Create Team'}
      subtitle={`Save as a draft anytime. To confirm, pick at least ${TEAM_MIN.Driver} driver and ${TEAM_MIN.Custodian} custodians. People already in another team aren't listed.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="ghost" onClick={() => save(false)} disabled={busy}>
            Save draft
          </Button>
          <Button onClick={() => save(true)} loading={busy}>
            Save &amp; confirm
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Input label="Team name" value={name} onChange={(e) => setName(e.target.value)} error={error} />
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold">
          <Badge tone={mix.drivers >= TEAM_MIN.Driver ? 'lime' : 'neutral'}>
            Driver {mix.drivers}/{TEAM_MIN.Driver}
          </Badge>
          <Badge tone={mix.custodians >= TEAM_MIN.Custodian ? 'lime' : 'neutral'}>
            Custodians {mix.custodians}/{TEAM_MIN.Custodian}
          </Badge>
          {ruleError && <span className="text-danger">{ruleError}</span>}
        </div>
        {pickable.length === 0 && <p className="text-[12px] text-ink-60">No unassigned drivers or custodians. Add them in User Accounts first.</p>}
        <ul className="-mr-2 grid max-h-[340px] gap-2 overflow-y-auto pr-2 sm:grid-cols-2">
          {pickable.map((u) => {
            const on = members.includes(u.id)
            return (
              <li key={u.id}>
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-[16px] border px-3 py-2.5 transition',
                    on ? 'border-violet/40 bg-periwinkle-18' : 'border-white/95 bg-white/70 hover:bg-white',
                  )}
                >
                  <input type="checkbox" checked={on} onChange={() => toggle(u.id)} className="size-4 accent-[#721cb8]" />
                  <Avatar name={u.name} size={28} />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[12px] font-bold text-ink">{u.name}</span>
                    <span className="block text-[10px] text-ink-60">{u.role}</span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </div>
    </Modal>
  )
}
