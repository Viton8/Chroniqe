import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { fetchNotifications, markNotificationsRead } from '../services/api'
import type { AppNotification } from '../types/domain'
import { formatDateTime } from '../lib/cn'
import { Spinner } from '../components/ui/EmptyState'
import Button from '../components/ui/Button'

export default function NotificationsPage() {
  const { user } = useAuth()
  const { t } = usePrefs()
  const [rows, setRows] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    void fetchNotifications(user.id)
      .then(setRows)
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <Spinner />

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">{t('notes.title')}</h1>
        {user ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              void markNotificationsRead(user.id).then(() =>
                setRows((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))),
              )
            }
          >
            {t('notes.readAll')}
          </Button>
        ) : null}
      </div>
      <ul className="mt-4 space-y-2">
        {rows.map((n) => {
          const listId = typeof n.payload.list_id === 'string' ? n.payload.list_id : null
          return (
            <li key={n.id} className={`rounded-2xl px-4 py-3 text-sm ${n.read_at ? 'bg-paper' : 'bg-accent-soft'}`}>
              <p className="font-medium">{n.title}</p>
              <p className="text-xs text-muted">{formatDateTime(n.created_at)}</p>
              {listId ? (
                <Link to={`/lists/${listId}`} className="text-xs text-accent">
                  {t('notes.openList')}
                </Link>
              ) : null}
            </li>
          )
        })}
      </ul>
      {!rows.length ? <p className="mt-6 text-sm text-muted">{t('notes.empty')}</p> : null}
    </div>
  )
}
