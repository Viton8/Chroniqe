import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { fetchPublicLists } from '../services/api'
import type { ListRow } from '../types/domain'
import EmptyState, { Spinner } from '../components/ui/EmptyState'
import { SearchField } from '../components/ui/Input'
import PageHeader from '../components/ui/PageHeader'
import ListCard from '../components/lists/ListCard'
import { matchesQuery } from '../lib/search'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

export default function ExplorePage() {
  const { t } = usePrefs()
  const { user } = useAuth()
  const [rows, setRows] = useState<ListRow[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const debounced = useDebouncedValue(q)

  useEffect(() => {
    void fetchPublicLists()
      .then(setRows)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(
    () =>
      rows.filter((l) =>
        matchesQuery(debounced, l.title, l.description, l.icon, l.owner?.username, l.owner?.display_name),
      ),
    [rows, debounced],
  )

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader title={t('explore.title')} lead={t('explore.lead')} />
      <SearchField
        className="mt-4"
        placeholder={t('explore.find')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {filtered.length ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {filtered.map((l) => (
            <ListCard
              key={l.id}
              list={l}
              favorite={Boolean(user)}
              aside={
                l.owner?.username ? (
                  <Link to={`/u/${l.owner.username}`} className="text-accent hover:underline">
                    {l.owner.display_name || `@${l.owner.username}`}
                  </Link>
                ) : (
                  `@${t('explore.author')}`
                )
              }
            />
          ))}
        </ul>
      ) : (
        <div className="mt-6">
          <EmptyState
            icon="🧭"
            title={debounced ? t('explore.noSearch') : t('explore.empty')}
            text={debounced ? t('lists.noSearchText') : undefined}
          />
        </div>
      )}
    </div>
  )
}
