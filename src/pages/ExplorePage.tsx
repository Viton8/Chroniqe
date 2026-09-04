import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePrefs } from '../context/PrefsContext'
import { fetchPublicLists } from '../services/api'
import type { ListRow } from '../types/domain'
import { Spinner } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'

export default function ExplorePage() {
  const { t } = usePrefs()
  const [rows, setRows] = useState<ListRow[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetchPublicLists()
      .then(setRows)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  const filtered = rows.filter((l) => l.title.toLowerCase().includes(q.toLowerCase()))

  return (
    <div>
      <h1 className="font-serif text-3xl">{t('explore.title')}</h1>
      <p className="mt-1 text-sm text-muted">{t('explore.lead')}</p>
      <Input className="mt-4 max-w-sm" placeholder={t('common.search')} value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {filtered.map((l) => (
          <li key={l.id}>
            <Link to={`/lists/${l.id}`} className="block rounded-2xl border border-line bg-paper p-4 shadow-lift">
              <p>
                {l.icon} {l.title}
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
            </Link>
          </li>
        ))}
      </ul>
      {!filtered.length ? <p className="mt-6 text-sm text-muted">{t('explore.empty')}</p> : null}
    </div>
  )
}
