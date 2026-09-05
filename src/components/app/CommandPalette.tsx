import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Compass, Home, List, Plus, Search, Settings2, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useCommand } from '../../context/CommandContext'
import { usePrefs } from '../../context/PrefsContext'
import { fetchMyLists, fetchSharedLists } from '../../services/api'
import type { ListRow } from '../../types/domain'
import { cn } from '../../lib/cn'
import { matchesQuery } from '../../lib/search'

interface Entry {
  id: string
  group: 'actions' | 'lists' | 'items'
  label: string
  hint?: string
  icon: typeof Search
  run: () => void
}

export default function CommandPalette() {
  const { open, setOpen } = useCommand()

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && (event.key === 'k' || event.key === 'K')) {
        event.preventDefault()
        setOpen(!open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (!open) return null
  return <CommandPaletteDialog />
}

function CommandPaletteDialog() {
  const { setOpen, workspace } = useCommand()
  const { user } = useAuth()
  const { t } = usePrefs()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [lists, setLists] = useState<ListRow[]>([])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    void Promise.all([fetchMyLists(user.id), fetchSharedLists().catch(() => [] as ListRow[])]).then(
      ([mine, shared]) => {
        if (cancelled) return
        const seen = new Set<string>()
        const rows: ListRow[] = []
        for (const row of [...mine, ...shared]) {
          if (seen.has(row.id)) continue
          seen.add(row.id)
          rows.push(row)
        }
        setLists(rows)
      },
    )
    return () => {
      cancelled = true
    }
  }, [user])

  const entries = useMemo<Entry[]>(() => {
    const match = (...parts: Array<string | null | undefined>) => matchesQuery(query, ...parts)
    const go = (path: string) => {
      setOpen(false)
      navigate(path)
    }
    const actions: Entry[] = [
      {
        id: 'home',
        group: 'actions',
        label: t('command.home'),
        icon: Home,
        run: () => go(user ? '/dashboard' : '/'),
      },
      {
        id: 'lists',
        group: 'actions',
        label: t('nav.lists'),
        icon: List,
        run: () => go(user ? '/lists' : '/login'),
      },
      {
        id: 'explore',
        group: 'actions',
        label: t('command.explore'),
        icon: Compass,
        run: () => go('/explore'),
      },
    ]
    if (user) {
      actions.push(
        {
          id: 'new-list',
          group: 'actions',
          label: t('command.newList'),
          icon: Plus,
          run: () => go('/lists/new'),
        },
        {
          id: 'friends',
          group: 'actions',
          label: t('command.friends'),
          icon: Users,
          run: () => go('/friends'),
        },
        {
          id: 'settings',
          group: 'actions',
          label: t('command.settings'),
          icon: Settings2,
          run: () => go('/settings'),
        },
      )
    }
    if (workspace) {
      actions.unshift({
        id: 'new-item',
        group: 'actions',
        label: t('command.newItem'),
        icon: Plus,
        run: () => {
          setOpen(false)
          workspace.createItem()
        },
      })
    }

    const listEntries: Entry[] = lists
      .filter((row) => match(row.icon, row.title, row.description))
      .slice(0, 8)
      .map((row) => ({
        id: `list-${row.id}`,
        group: 'lists' as const,
        label: `${row.icon ?? '📋'} ${row.title}`,
        hint: t(`visibility.${row.visibility}`),
        icon: List,
        run: () => go(`/lists/${row.id}`),
      }))

    const itemEntries: Entry[] = (workspace?.items ?? [])
      .filter((item) => match(item.title))
      .slice(0, 8)
      .map((item) => ({
        id: `item-${item.id}`,
        group: 'items' as const,
        label: item.title,
        icon: Search,
        run: () => {
          setOpen(false)
          workspace?.openItem(item.id)
        },
      }))

    return [...actions.filter((row) => match(row.label)), ...listEntries, ...itemEntries]
  }, [lists, navigate, query, setOpen, t, user, workspace])

  const safeActive = entries.length ? Math.min(active, entries.length - 1) : 0

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActive((prev) => (entries.length ? (prev + 1) % entries.length : 0))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActive((prev) => (entries.length ? (prev - 1 + entries.length) % entries.length : 0))
        return
      }
      if (event.key === 'Enter' && entries[safeActive]) {
        event.preventDefault()
        entries[safeActive].run()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [entries, safeActive, setOpen])

  const groups = [
    ['actions', t('command.actions')],
    ['lists', t('command.lists')],
    ['items', t('command.items')],
  ] as const

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh]">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40"
        aria-label={t('common.close')}
        onClick={() => setOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('command.title')}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-line bg-paper shadow-lift"
      >
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Search size={16} className="text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            placeholder={t('command.placeholder')}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <kbd className="hidden rounded-lg bg-ink/5 px-2 py-0.5 font-mono text-[11px] text-muted sm:inline">
            Esc
          </kbd>
        </div>
        <div className="max-h-[min(60vh,22rem)] overflow-y-auto p-2">
          {entries.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">{t('command.empty')}</p>
          ) : (
            groups.map(([id, label]) => {
              const rows = entries.filter((row) => row.group === id)
              if (!rows.length) return null
              return (
                <div key={id} className="mb-2">
                  <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-muted">{label}</p>
                  <ul>
                    {rows.map((row) => {
                      const index = entries.indexOf(row)
                      const Icon = row.icon
                      return (
                        <li key={row.id}>
                          <button
                            type="button"
                            className={cn(
                              'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm',
                              index === safeActive ? 'bg-accent-soft' : 'hover:bg-ink/5',
                            )}
                            onMouseEnter={() => setActive(index)}
                            onClick={() => row.run()}
                          >
                            <Icon size={15} className="shrink-0 text-muted" />
                            <span className="min-w-0 flex-1 truncate">{row.label}</span>
                            {row.hint ? <span className="text-xs text-muted">{row.hint}</span> : null}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
