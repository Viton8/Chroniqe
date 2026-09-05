import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { fetchItems, fetchMyLists, fetchNotifications } from '../services/api'
import type { AppNotification, ItemRow, ListRow } from '../types/domain'
import { Spinner } from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import FavoriteButton from '../components/lists/FavoriteButton'
import { readFavorites } from '../lib/favorites'
import { buildInsights } from '../lib/insights'
import { formatDate, titleFromValues } from '../lib/cn'

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const { t } = usePrefs()
  const [lists, setLists] = useState<ListRow[]>([])
  const [notes, setNotes] = useState<AppNotification[]>([])
  const [upcoming, setUpcoming] = useState<Array<{ list: ListRow; item: ItemRow; date: string }>>([])
  const [overdue, setOverdue] = useState<Array<{ list: ListRow; item: ItemRow; date: string }>>([])
  const [openCount, setOpenCount] = useState(0)
  const [favIds, setFavIds] = useState(() => readFavorites())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    void (async () => {
      const [owned, inbox] = await Promise.all([fetchMyLists(user.id), fetchNotifications(user.id)])
      setLists(owned)
      setNotes(inbox.slice(0, 5))
      const sample = owned.slice(0, 10)
      const itemSets = await Promise.all(sample.map((list) => fetchItems(list.id).catch(() => [] as ItemRow[])))
      const soon: Array<{ list: ListRow; item: ItemRow; date: string }> = []
      const late: Array<{ list: ListRow; item: ItemRow; date: string }> = []
      let open = 0
      sample.forEach((list, index) => {
        const rows = itemSets[index]
        const stats = buildInsights(list.schema, rows, [])
        open += stats.open
        for (const row of stats.upcoming) soon.push({ list, item: row.item, date: row.date })
        for (const row of stats.overdue) late.push({ list, item: row.item, date: row.date })
      })
      soon.sort((a, b) => a.date.localeCompare(b.date))
      late.sort((a, b) => a.date.localeCompare(b.date))
      setUpcoming(soon.slice(0, 6))
      setOverdue(late.slice(0, 6))
      setOpenCount(open)
    })().finally(() => setLoading(false))
  }, [user])

  const favorites = useMemo(() => {
    const ids = new Set(favIds)
    return lists.filter((list) => ids.has(list.id))
  }, [lists, favIds])

  if (loading) return <Spinner />

  return (
    <div>
      <p className="text-sm text-muted">
        {t('dash.hi')}
        {profile ? `, ${profile.display_name || profile.username}` : ''}
      </p>
      <h1 className="font-serif text-3xl">{t('dash.title')}</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Stat label={t('dash.lists')} value={lists.length} />
        <Stat label={t('insights.open')} value={openCount} />
        <Stat label={t('dash.unread')} value={notes.filter((n) => !n.read_at).length} />
        <Stat label={t('dash.public')} value={lists.filter((l) => l.visibility === 'public').length} />
      </div>

      {favorites.length ? (
        <section className="mt-8">
          <h2 className="font-serif text-2xl">{t('dash.pinned')}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {favorites.map((list) => (
              <ListCard key={list.id} list={list} onFav={() => setFavIds(readFavorites())} />
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <DateBlock
          title={t('insights.overdue')}
          rows={overdue}
          empty={t('insights.noOverdue')}
        />
        <DateBlock
          title={t('dash.upcoming')}
          rows={upcoming}
          empty={t('dash.noUpcoming')}
        />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-serif text-2xl">{t('dash.recent')}</h2>
        <Link to="/lists/new">
          <Button size="sm">{t('dash.newList')}</Button>
        </Link>
      </div>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {lists.slice(0, 6).map((l) => (
          <ListCard key={l.id} list={l} onFav={() => setFavIds(readFavorites())} />
        ))}
      </ul>
      {!lists.length ? (
        <p className="mt-4 text-sm text-muted">
          {t('dash.startCinema')}{' '}
          <Link to="/lists/new" className="text-accent underline">
            {t('dash.newList')}
          </Link>
        </p>
      ) : null}
      <h2 className="mt-10 font-serif text-2xl">{t('dash.events')}</h2>
      <ul className="mt-3 space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="rounded-2xl bg-paper px-4 py-3 text-sm">
            {n.title}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ListCard({ list, onFav }: { list: ListRow; onFav: () => void }) {
  const { t } = usePrefs()
  return (
    <li>
      <Link
        to={`/lists/${list.id}`}
        className="flex items-start justify-between gap-2 rounded-2xl border border-line bg-paper p-4 shadow-lift hover:border-accent"
      >
        <span className="text-lg">
          {list.icon} {list.title}
        </span>
        <span className="flex items-center gap-2">
          <span className="text-xs text-muted">{t(`visibility.${list.visibility}`)}</span>
          <FavoriteButton id={list.id} onChange={onFav} />
        </span>
      </Link>
    </li>
  )
}

function DateBlock({
  title,
  rows,
  empty,
}: {
  title: string
  rows: Array<{ list: ListRow; item: ItemRow; date: string }>
  empty: string
}) {
  return (
    <section className="rounded-2xl border border-line bg-paper p-4">
      <h2 className="font-serif text-2xl">{title}</h2>
      {rows.length ? (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={`${row.list.id}-${row.item.id}`}>
              <Link
                to={`/lists/${row.list.id}`}
                className="flex items-center justify-between gap-3 rounded-xl px-1 py-1 text-sm hover:bg-ink/5"
              >
                <span className="min-w-0 truncate">
                  <span className="text-muted">{row.list.icon} {row.list.title}</span>
                  <span className="mx-1.5 text-muted">·</span>
                  {titleFromValues(row.item.values, row.list.schema.titleFieldId)}
                </span>
                <span className="shrink-0 text-xs text-muted">{formatDate(row.date)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-paper p-4 shadow-lift">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-serif text-3xl">{value}</p>
    </div>
  )
}
