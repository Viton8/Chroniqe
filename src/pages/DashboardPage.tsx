import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { fetchMyLists, fetchNotifications } from '../services/api'
import type { AppNotification, ListRow } from '../types/domain'
import { Spinner } from '../components/ui/EmptyState'
import Button from '../components/ui/Button'

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const { t } = usePrefs()
  const [lists, setLists] = useState<ListRow[]>([])
  const [notes, setNotes] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    void Promise.all([fetchMyLists(user.id), fetchNotifications(user.id)])
      .then(([l, n]) => {
        setLists(l)
        setNotes(n.slice(0, 5))
      })
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <Spinner />

  return (
    <div>
      <p className="text-sm text-muted">
        {t('dash.hi')}
        {profile ? `, ${profile.display_name || profile.username}` : ''}
      </p>
      <h1 className="font-serif text-3xl">{t('dash.title')}</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label={t('dash.lists')} value={lists.length} />
        <Stat label={t('dash.unread')} value={notes.filter((n) => !n.read_at).length} />
        <Stat label={t('dash.public')} value={lists.filter((l) => l.visibility === 'public').length} />
      </div>
      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-serif text-2xl">{t('dash.recent')}</h2>
        <Link to="/lists/new">
          <Button size="sm">{t('dash.newList')}</Button>
        </Link>
      </div>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {lists.slice(0, 6).map((l) => (
          <li key={l.id}>
            <Link
              to={`/lists/${l.id}`}
              className="block rounded-2xl border border-line bg-paper p-4 shadow-lift hover:border-accent"
            >
              <span className="text-lg">
                {l.icon} {l.title}
              </span>
              <p className="mt-1 text-xs text-muted">{t(`visibility.${l.visibility}`)}</p>
            </Link>
          </li>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-paper p-4 shadow-lift">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-serif text-3xl">{value}</p>
    </div>
  )
}
