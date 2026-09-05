import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { fetchMyLists, fetchSharedLists, countItems } from '../services/api'
import type { ListRow } from '../types/domain'
import Button from '../components/ui/Button'
import EmptyState, { Spinner } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import FavoriteButton from '../components/lists/FavoriteButton'
import { readFavorites } from '../lib/favorites'

export default function ListsPage() {
  const { user } = useAuth()
  const { t } = usePrefs()
  const [mine, setMine] = useState<ListRow[]>([])
  const [shared, setShared] = useState<ListRow[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [favIds, setFavIds] = useState(() => readFavorites())

  useEffect(() => {
    if (!user) return
    void (async () => {
      const [a, b] = await Promise.all([fetchMyLists(user.id), fetchSharedLists()])
      setMine(a)
      setShared(b)
      setCounts(await countItems([...a, ...b].map((l) => l.id)))
    })().finally(() => setLoading(false))
  }, [user])

  const favorites = useMemo(() => new Set(favIds), [favIds])
  const pinned = useMemo(
    () => [...mine, ...shared].filter((list) => favorites.has(list.id)),
    [mine, shared, favorites],
  )

  if (loading) return <Spinner />

  const filter = (rows: ListRow[]) =>
    rows.filter((l) => l.title.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl">{t('lists.title')}</h1>
        <Link to="/lists/new">
          <Button>{t('common.create')}</Button>
        </Link>
      </div>
      <Input className="mt-4 max-w-sm" placeholder={t('lists.find')} value={q} onChange={(e) => setQ(e.target.value)} />
      <Section
        title={t('lists.pinned')}
        rows={filter(pinned)}
        counts={counts}
        onFav={() => setFavIds(readFavorites())}
      />
      <Section title={t('lists.mine')} rows={filter(mine)} counts={counts} onFav={() => setFavIds(readFavorites())} />
      <Section title={t('lists.shared')} rows={filter(shared)} counts={counts} onFav={() => setFavIds(readFavorites())} />
      {!mine.length && !shared.length ? (
        <div className="mt-6">
          <EmptyState icon="✨" title={t('lists.emptyTitle')} text={t('lists.emptyText')} />
          <p className="mt-3 text-center text-sm">
            <Link to="/lists/new" className="text-accent underline">
              {t('lists.templates')}
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  )
}

function Section({
  title,
  rows,
  counts,
  onFav,
}: {
  title: string
  rows: ListRow[]
  counts: Record<string, number>
  onFav: () => void
}) {
  const { t } = usePrefs()
  if (!rows.length) return null
  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-muted">{title}</h2>
      <ul className="mt-2 grid gap-3 sm:grid-cols-2">
        {rows.map((l) => (
          <li key={`${title}-${l.id}`}>
            <Link
              to={`/lists/${l.id}`}
              className="flex items-start justify-between rounded-2xl border border-line bg-paper p-4 shadow-lift"
            >
              <div>
                <p className="text-lg">
                  {l.icon} {l.title}
                </p>
                <p className="text-xs text-muted">
                  {counts[l.id] ?? 0} {t('common.records')} · {t(`visibility.${l.visibility}`)}
                </p>
              </div>
              <FavoriteButton id={l.id} onChange={onFav} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
