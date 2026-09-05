import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { useToast } from '../context/ToastContext'
import { fetchFriendFeed, fetchFriendships } from '../services/api'
import { supabase } from '../services/supabase'
import type { FeedFilter, FriendFeedEvent } from '../types/domain'
import FriendFeed from '../components/lists/FriendFeed'
import EmptyState, { Spinner } from '../components/ui/EmptyState'
import PageHeader from '../components/ui/PageHeader'
import { matchesFeedFilter } from '../lib/activity'
import { cn } from '../lib/cn'

const FILTERS: FeedFilter[] = ['all', 'added', 'checked', 'moved']

export default function FeedPage() {
  const { user } = useAuth()
  const { t } = usePrefs()
  const { toast } = useToast()
  const [events, setEvents] = useState<FriendFeedEvent[]>([])
  const [friendCount, setFriendCount] = useState(0)
  const [filter, setFilter] = useState<FeedFilter>('all')
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!user) return
    const [feed, friends] = await Promise.all([
      fetchFriendFeed(80),
      fetchFriendships(user.id).then((rows) => rows.filter((row) => row.status === 'accepted').length),
    ])
    setEvents(feed)
    setFriendCount(friends)
  }, [user])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    void reload()
      .catch((error) => {
        if (!cancelled) toast(error instanceof Error ? error.message : t('common.error'), 'err')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [reload, t, toast, user])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`friend-feed-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_events' }, () => {
        void reload().catch(() => undefined)
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [reload, user])

  const visible = useMemo(
    () => events.filter((event) => matchesFeedFilter(event.event_type, filter)),
    [events, filter],
  )

  if (loading) return <Spinner />
  if (!user) return null

  const empty: 'none' | 'quiet' | 'nofriends' =
    friendCount === 0 ? 'nofriends' : visible.length ? 'none' : 'quiet'

  return (
    <div>
      <PageHeader
        kicker={t('feed.kicker')}
        title={t('feed.title')}
        lead={t('feed.lead')}
        action={
          <Link to="/friends" className="text-sm text-accent hover:underline">
            {t('feed.findPeople')}
          </Link>
        }
      />
      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              'rounded-full px-3 py-1 text-sm transition-colors',
              filter === key ? 'bg-ink text-paper' : 'bg-ink/5 text-muted hover:bg-ink/10',
            )}
          >
            {t(`feed.filter.${key}`)}
          </button>
        ))}
      </div>
      <div className="mt-5">
        {empty === 'quiet' && filter !== 'all' ? (
          <EmptyState compact title={t('feed.emptyFilter')} />
        ) : (
          <FriendFeed events={visible} empty={empty} />
        )}
      </div>
    </div>
  )
}
