import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { usePrefs } from '../../context/PrefsContext'
import { expandRelatedListIds, lockedRelatedListIds } from '../../lib/relatedLists'
import { fetchMyLists } from '../../services/api'
import type { ListRow } from '../../types/domain'
import Hint from '../ui/Hint'
import { SearchField } from '../ui/Input'

export default function RelatedListsEditor({
  list,
  onChange,
}: {
  list: ListRow
  onChange: (ids: string[]) => void
}) {
  const { t } = usePrefs()
  const { user } = useAuth()
  const [lists, setLists] = useState<ListRow[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!user) return
    let cancelled = false
    void fetchMyLists(user.id).then((rows) => {
      if (!cancelled) setLists(rows.filter((row) => row.id !== list.id))
    })
    return () => {
      cancelled = true
    }
  }, [user, list.id])

  useEffect(() => {
    if (!lists.length) return
    const expanded = expandRelatedListIds(list, lists)
    const current = list.settings?.relatedListIds ?? []
    const missing = expanded.filter((id) => !current.includes(id))
    if (missing.length) onChange([...current, ...missing])
    // Seed reverse links once the owner's lists are known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lists, list.id])

  const locked = useMemo(() => lockedRelatedListIds(list, lists), [list, lists])
  const selected = useMemo(() => {
    const ids = new Set(list.settings?.relatedListIds ?? [])
    for (const id of locked) ids.add(id)
    return ids
  }, [list.settings?.relatedListIds, locked])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return lists
    return lists.filter((row) => `${row.icon ?? ''} ${row.title}`.toLowerCase().includes(q))
  }, [lists, query])

  const toggle = (id: string) => {
    if (locked.has(id)) return
    const current = new Set(list.settings?.relatedListIds ?? [])
    if (current.has(id)) current.delete(id)
    else current.add(id)
    onChange([...current])
  }

  return (
    <div className="space-y-3">
      <Hint title={t('relatedLists.hint')} example={t('relatedLists.hintEx')} />
      {lists.length > 5 ? (
        <SearchField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('relatedLists.search')}
        />
      ) : null}
      {lists.length === 0 ? <p className="text-sm text-muted">{t('relatedLists.none')}</p> : null}
      <ul className="max-h-56 space-y-1 overflow-y-auto">
        {filtered.map((row) => {
          const on = selected.has(row.id)
          const fixed = locked.has(row.id)
          return (
            <li key={row.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-ink/5">
                <input type="checkbox" checked={on} disabled={fixed} onChange={() => toggle(row.id)} />
                <span className="min-w-0 truncate">
                  {row.icon} {row.title}
                </span>
                {fixed ? <span className="ml-auto shrink-0 text-xs text-muted">{t('relatedLists.viaFlow')}</span> : null}
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
