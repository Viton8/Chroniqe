import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { usePrefs } from '../../context/PrefsContext'
import { expandRelatedListIds } from '../../lib/relatedLists'
import { cn } from '../../lib/cn'
import { fetchListsByIds, fetchMyLists } from '../../services/api'
import type { ListRow } from '../../types/domain'

export default function RelatedListsNav({ list }: { list: ListRow }) {
  const { t } = usePrefs()
  const { user } = useAuth()
  const [rows, setRows] = useState<ListRow[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const mine = user ? await fetchMyLists(user.id).catch(() => [] as ListRow[]) : []
      const ids = expandRelatedListIds(list, mine)
      if (!ids.length) {
        if (!cancelled) setRows([])
        return
      }
      const found = await fetchListsByIds(ids)
      if (!cancelled) setRows(found)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [list, user?.id])

  if (!rows.length) return null

  return (
    <div className="mt-3">
      <p className="mb-1.5 text-xs uppercase tracking-wide text-muted">{t('relatedLists.title')}</p>
      <div className="flex flex-wrap gap-1.5">
        {rows.map((row) => (
          <Link
            key={row.id}
            to={`/lists/${row.id}`}
            className={cn(
              'inline-flex max-w-full items-center gap-1.5 rounded-full bg-ink/5 px-3 py-1 text-sm hover:bg-ink/10',
            )}
          >
            <span className="shrink-0">{row.icon}</span>
            <span className="truncate">{row.title}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
