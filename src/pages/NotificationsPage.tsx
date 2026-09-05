import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { fetchNotifications, markNotificationsRead } from '../services/api'
import type { AppNotification } from '../types/domain'
import { NotificationsFeed } from '../components/notifications/NotificationsModal'
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
      <div className="mt-4">
        <NotificationsFeed rows={rows} />
      </div>
    </div>
  )
}
