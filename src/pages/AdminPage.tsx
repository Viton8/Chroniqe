import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { useToast } from '../context/ToastContext'
import {
  adminDeletePublicList,
  adminSetUserBlocked,
  fetchAdminProfiles,
  fetchAdminPublicLists,
} from '../services/api'
import type { ListRow, Profile } from '../types/domain'
import Button from '../components/ui/Button'
import Hint from '../components/ui/Hint'
import Modal from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Spinner } from '../components/ui/EmptyState'
import { cn } from '../lib/cn'

type Tab = 'lists' | 'users'
type Pending =
  | { kind: 'delete'; list: ListRow }
  | { kind: 'block'; user: Profile; blocked: boolean }
  | null

export default function AdminPage() {
  const { user } = useAuth()
  const { t } = usePrefs()
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('lists')
  const [q, setQ] = useState('')
  const [lists, setLists] = useState<ListRow[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<Pending>(null)

  const loadLists = useCallback(async () => {
    setLists(await fetchAdminPublicLists())
  }, [])

  const loadUsers = useCallback(async (query: string) => {
    setUsers(await fetchAdminProfiles(query))
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [nextLists, nextUsers] = await Promise.all([fetchAdminPublicLists(), fetchAdminProfiles('')])
        if (cancelled) return
        setLists(nextLists)
        setUsers(nextUsers)
      } catch (err) {
        if (!cancelled) toast(err instanceof Error ? err.message : t('common.error'), 'err')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [t, toast])

  if (loading) return <Spinner />

  const listRows = lists.filter((l) => l.title.toLowerCase().includes(q.toLowerCase()))

  const confirmPending = async () => {
    if (!pending) return
    setBusy(true)
    try {
      if (pending.kind === 'delete') {
        await adminDeletePublicList(pending.list.id)
        toast(t('admin.deleted'))
        await loadLists()
      } else {
        await adminSetUserBlocked(pending.user.id, pending.blocked)
        toast(pending.blocked ? t('admin.blocked') : t('admin.unblocked'))
        await loadUsers(tab === 'users' ? q : '')
      }
      setPending(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : t('common.error'), 'err')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl">{t('admin.title')}</h1>
      <p className="mt-1 text-sm text-muted">{t('admin.lead')}</p>
      <Hint className="mt-4" title={t('admin.hint')} example={t('admin.hintEx')} />

      <div className="mt-5 flex gap-2">
        {(
          [
            ['lists', t('admin.lists')],
            ['users', t('admin.users')],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id)
              setQ('')
              if (id === 'users') void loadUsers('')
            }}
            className={cn(
              'rounded-xl px-3 py-1.5 text-sm',
              tab === id ? 'bg-accent-soft font-medium text-accent' : 'text-muted hover:bg-ink/5 hover:text-ink',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Input
        className="mt-4 max-w-sm"
        placeholder={tab === 'lists' ? t('admin.searchLists') : t('admin.searchUsers')}
        value={q}
        onChange={(e) => {
          const value = e.target.value
          setQ(value)
          if (tab === 'users') void loadUsers(value)
        }}
      />

      {tab === 'lists' ? (
        <ul className="mt-4 space-y-2">
          {listRows.map((l) => (
            <li
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate">
                  {l.icon ? `${l.icon} ` : ''}
                  {l.title}
                </p>
                <p className="text-xs text-muted">
                  {l.owner?.username ? (
                    <Link to={`/u/${l.owner.username}`} className="hover:underline">
                      @{l.owner.username}
                    </Link>
                  ) : (
                    `@${t('explore.author')}`
                  )}
                </p>
              </div>
              <span className="flex gap-2">
                <Link to={`/lists/${l.id}`}>
                  <Button size="sm" variant="soft">
                    {t('admin.openList')}
                  </Button>
                </Link>
                <Button size="sm" variant="danger" onClick={() => setPending({ kind: 'delete', list: l })}>
                  {t('common.delete')}
                </Button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-4 space-y-2">
          {users.map((p) => {
            const blocked = Boolean(p.blocked_at)
            const isSelf = p.id === user?.id
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-4 py-3"
              >
                <div className="min-w-0">
                  <Link to={`/u/${p.username}`} className="hover:underline">
                    {p.display_name || p.username}{' '}
                    <span className="text-muted">@{p.username}</span>
                  </Link>
                  <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
                    {p.is_admin ? (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-accent">{t('admin.adminBadge')}</span>
                    ) : null}
                    {blocked ? (
                      <span className="rounded-full bg-rose-700/15 px-2 py-0.5 text-rose-800 dark:text-rose-300">
                        {t('admin.blockedBadge')}
                      </span>
                    ) : null}
                    {isSelf ? <span className="text-muted">{t('admin.you')}</span> : null}
                  </p>
                </div>
                {!isSelf && !p.is_admin ? (
                  <Button
                    size="sm"
                    variant={blocked ? 'soft' : 'danger'}
                    onClick={() => setPending({ kind: 'block', user: p, blocked: !blocked })}
                  >
                    {blocked ? t('admin.unblock') : t('admin.block')}
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {tab === 'lists' && !listRows.length ? <p className="mt-6 text-sm text-muted">{t('admin.emptyLists')}</p> : null}
      {tab === 'users' && !users.length ? <p className="mt-6 text-sm text-muted">{t('admin.emptyUsers')}</p> : null}

      <Modal
        open={Boolean(pending)}
        title={
          pending?.kind === 'delete'
            ? t('admin.deleteList')
            : pending?.kind === 'block' && pending.blocked
              ? t('admin.block')
              : t('admin.unblock')
        }
        onClose={() => {
          if (!busy) setPending(null)
        }}
      >
        <p className="text-sm text-muted">
          {pending?.kind === 'delete'
            ? t('admin.deleteConfirm', { title: pending.list.title })
            : pending?.kind === 'block'
              ? pending.blocked
                ? t('admin.blockConfirm', { username: pending.user.username })
                : t('admin.unblockConfirm', { username: pending.user.username })
              : null}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="soft" disabled={busy} onClick={() => setPending(null)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant={pending?.kind === 'block' && !pending.blocked ? 'soft' : 'danger'}
            disabled={busy}
            onClick={() => void confirmPending()}
          >
            {pending?.kind === 'delete'
              ? t('common.delete')
              : pending?.kind === 'block' && pending.blocked
                ? t('admin.block')
                : t('admin.unblock')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
