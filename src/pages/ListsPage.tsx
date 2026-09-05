import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { fetchMyLists, fetchSharedLists, countItems } from '../services/api'
import type { ListRow } from '../types/domain'
import Button from '../components/ui/Button'
import EmptyState, { Spinner } from '../components/ui/EmptyState'
import { SearchField } from '../components/ui/Input'
import PageHeader from '../components/ui/PageHeader'
import ListCard from '../components/lists/ListCard'
import { readFavorites } from '../lib/favorites'
import { matchesQuery } from '../lib/search'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

export default function ListsPage() {
  const { user } = useAuth()
  const { t } = usePrefs()
  const navigate = useNavigate()
  const [mine, setMine] = useState<ListRow[]>([])
  const [shared, setShared] = useState<ListRow[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [favIds, setFavIds] = useState(() => readFavorites())
  const debounced = useDebouncedValue(q)

  useEffect(() => {
    if (!user) return
    void (async () => {
      const [a, b] = await Promise.all([
        fetchMyLists(user.id),
        fetchSharedLists(user.id).catch(() => [] as ListRow[]),
      ])
      setMine(a)
      setShared(b)
      setCounts(await countItems([...a, ...b].map((l) => l.id)))
    })().finally(() => setLoading(false))
  }, [user])

  const favorites = useMemo(() => new Set(favIds), [favIds])
  const filter = (rows: ListRow[]) =>
    rows.filter((l) => matchesQuery(debounced, l.title, l.description, l.icon))
  const pinned = useMemo(
    () => [...mine, ...shared].filter((list) => favorites.has(list.id)),
    [mine, shared, favorites],
  )
  const filteredPinned = filter(pinned)
  const filteredMine = filter(mine)
  const filteredShared = filter(shared)
  const any = mine.length + shared.length > 0
  const anyVisible = filteredPinned.length + filteredMine.length + filteredShared.length > 0

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader
        title={t('lists.title')}
        lead={t('lists.lead')}
        action={
          <Link to="/lists/new">
            <Button>{t('common.create')}</Button>
          </Link>
        }
      />
      <SearchField className="mt-4" placeholder={t('lists.find')} value={q} onChange={(e) => setQ(e.target.value)} />
      {anyVisible ? (
        <>
          <Section
            title={t('lists.pinned')}
            rows={filteredPinned}
            counts={counts}
            onFav={() => setFavIds(readFavorites())}
          />
          <Section title={t('lists.mine')} rows={filteredMine} counts={counts} onFav={() => setFavIds(readFavorites())} />
          <Section
            title={t('lists.shared')}
            rows={filteredShared}
            counts={counts}
            onFav={() => setFavIds(readFavorites())}
          />
        </>
      ) : (
        <div className="mt-6">
          <EmptyState
            icon="✨"
            title={any ? t('lists.noSearch') : t('lists.emptyTitle')}
            text={any ? t('lists.noSearchText') : t('lists.emptyText')}
            action={!any ? { label: t('lists.templates'), onClick: () => navigate('/lists/new') } : undefined}
          />
        </div>
      )}
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
      <h2 className="font-serif text-2xl">{title}</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {rows.map((l) => (
          <ListCard
            key={`${title}-${l.id}`}
            list={l}
            badge={t(`visibility.${l.visibility}`)}
            meta={`${counts[l.id] ?? 0} ${t('common.records')}`}
            favorite
            onFav={onFav}
          />
        ))}
      </ul>
    </section>
  )
}
