import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { fetchFriendFeed, fetchFriendships, fetchItems, fetchMyInvites, fetchMyLists, fetchNotifications, fetchSharedLists, fetchSubscribedLists } from '../services/api'
import { NotificationsFeed } from '../components/notifications/NotificationsModal'
import type { AppNotification, FriendFeedEvent, ItemRow, ListRow } from '../types/domain'
import EmptyState, { Spinner } from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import { SearchField } from '../components/ui/Input'
import PageHeader from '../components/ui/PageHeader'
import ListCard from '../components/lists/ListCard'
import FriendFeed from '../components/lists/FriendFeed'
import { readFavorites } from '../lib/favorites'
import { buildInsights } from '../lib/insights'
import { formatDate, titleFromValues } from '../lib/cn'
import { matchesQuery } from '../lib/search'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const { t } = usePrefs()
  const navigate = useNavigate()
  const [lists, setLists] = useState<ListRow[]>([])
  const [shared, setShared] = useState<ListRow[]>([])
  const [notes, setNotes] = useState<AppNotification[]>([])
  const [upcoming, setUpcoming] = useState<Array<{ list: ListRow; item: ItemRow; date: string }>>([])
  const [overdue, setOverdue] = useState<Array<{ list: ListRow; item: ItemRow; date: string }>>([])
  const [openCount, setOpenCount] = useState(0)
  const [requests, setRequests] = useState(0)
  const [invites, setInvites] = useState(0)
  const [following, setFollowing] = useState<ListRow[]>([])
  const [feed, setFeed] = useState<FriendFeedEvent[]>([])
  const [friendCount, setFriendCount] = useState(0)
  const [favIds, setFavIds] = useState(() => readFavorites())
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const debounced = useDebouncedValue(query)

  useEffect(() => {
    if (!user) return
    void (async () => {
      const [owned, sharedRows, inbox, friends, listInvites, subscribed, friendEvents] = await Promise.all([
        fetchMyLists(user.id),
        fetchSharedLists(user.id).catch(() => [] as ListRow[]),
        fetchNotifications(user.id),
        fetchFriendships(user.id).catch(() => []),
        fetchMyInvites(user.id).catch(() => []),
        fetchSubscribedLists(user.id).catch(() => [] as ListRow[]),
        fetchFriendFeed(12).catch(() => [] as FriendFeedEvent[]),
      ])
      setLists(owned)
      setShared(sharedRows)
      setFollowing(subscribed.filter((row) => row.owner_id !== user.id))
      setNotes(inbox.slice(0, 5))
      setFeed(friendEvents)
      setFriendCount(friends.filter((row) => row.status === 'accepted').length)
      setRequests(friends.filter((row) => row.status === 'pending' && row.addressee_id === user.id).length)
      setInvites(listInvites.length)
      const sample = [...owned, ...sharedRows].slice(0, 12)
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

  const allLists = useMemo(() => {
    const seen = new Set<string>()
    return [...lists, ...shared].filter((list) => {
      if (seen.has(list.id)) return false
      seen.add(list.id)
      return true
    })
  }, [lists, shared])

  const favorites = useMemo(() => {
    const ids = new Set(favIds)
    return allLists.filter((list) => ids.has(list.id))
  }, [allLists, favIds])

  const visibleLists = useMemo(
    () => allLists.filter((list) => matchesQuery(debounced, list.title, list.description, list.icon)),
    [allLists, debounced],
  )

  const visibleFollowing = useMemo(
    () => following.filter((list) => matchesQuery(debounced, list.title, list.description, list.icon)),
    [following, debounced],
  )

  if (loading) return <Spinner />

  const greet = profile ? `${t('dash.hi')}, ${profile.display_name || profile.username}` : t('dash.hi')

  return (
    <div>
      <PageHeader
        kicker={greet}
        title={t('dash.title')}
        action={
          <Link to="/lists/new">
            <Button size="sm">{t('dash.newList')}</Button>
          </Link>
        }
      />
      <SearchField
        className="mt-4"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('dash.search')}
      />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={t('dash.lists')} value={lists.length} />
        <Stat label={t('insights.open')} value={openCount} />
        <Stat label={t('dash.unread')} value={notes.filter((n) => !n.read_at).length} />
        <Stat label={t('dash.public')} value={lists.filter((l) => l.visibility === 'public').length} />
      </div>

      {requests || invites ? (
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          {requests ? (
            <Link
              to="/friends"
              className="rounded-full bg-accent-soft px-3 py-1 text-accent transition-colors hover:bg-accent/15"
            >
              {t('dash.friendRequests', { n: requests })}
            </Link>
          ) : null}
          {invites ? (
            <Link to="/friends" className="rounded-full bg-ink/5 px-3 py-1 transition-colors hover:bg-ink/10">
              {t('dash.listInvites', { n: invites })}
            </Link>
          ) : null}
        </div>
      ) : null}

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">{t('dash.feed')}</h2>
          <Link to="/feed" className="text-sm text-accent hover:underline">
            {t('feed.seeAll')}
          </Link>
        </div>
        <div className="mt-3">
          <FriendFeed
            compact
            events={feed}
            empty={friendCount === 0 ? 'nofriends' : feed.length ? 'none' : 'quiet'}
          />
        </div>
      </section>

      {visibleFollowing.length ? (
        <section className="mt-8">
          <h2 className="font-serif text-2xl">{t('dash.following')}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {visibleFollowing.slice(0, 6).map((list) => (
              <ListCard
                key={list.id}
                list={list}
                badge={t('list.following')}
                favorite
                onFav={() => setFavIds(readFavorites())}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {favorites.length ? (
        <section className="mt-8">
          <h2 className="font-serif text-2xl">{t('dash.pinned')}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {favorites.map((list) => (
              <ListCard
                key={list.id}
                list={list}
                badge={list.owner_id !== user?.id ? t('dash.shared') : t(`visibility.${list.visibility}`)}
                favorite
                onFav={() => setFavIds(readFavorites())}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <DateBlock title={t('insights.overdue')} rows={overdue} empty={t('insights.noOverdue')} />
        <DateBlock title={t('dash.upcoming')} rows={upcoming} empty={t('dash.noUpcoming')} />
      </div>

      <h2 className="mt-8 font-serif text-2xl">{t('dash.recent')}</h2>
      {visibleLists.length ? (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {visibleLists.slice(0, 8).map((list) => (
            <ListCard
              key={list.id}
              list={list}
              badge={list.owner_id !== user?.id ? t('dash.shared') : t(`visibility.${list.visibility}`)}
              favorite
              onFav={() => setFavIds(readFavorites())}
            />
          ))}
        </ul>
      ) : (
        <div className="mt-4">
          <EmptyState
            icon="✨"
            title={debounced ? t('dash.noSearch') : t('lists.emptyTitle')}
            text={debounced ? t('dash.noSearchText') : t('dash.startCinema')}
            action={!debounced ? { label: t('dash.newList'), onClick: () => navigate('/lists/new') } : undefined}
          />
        </div>
      )}

      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-serif text-2xl">{t('dash.events')}</h2>
        <Link to="/notifications" className="text-sm text-accent hover:underline">
          {t('dash.openNotes')}
        </Link>
      </div>
      <div className="mt-3">
        <NotificationsFeed rows={notes} />
      </div>
    </div>
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
    <section className="rounded-2xl border border-line bg-paper p-4 shadow-lift">
      <h2 className="font-serif text-2xl">{title}</h2>
      {rows.length ? (
        <ul className="mt-3 space-y-1">
          {rows.map((row) => (
            <li key={`${row.list.id}-${row.item.id}`}>
              <Link
                to={`/lists/${row.list.id}`}
                className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-sm transition-colors hover:bg-ink/5"
              >
                <span className="min-w-0 truncate">
                  <span className="text-muted">
                    {row.list.icon} {row.list.title}
                  </span>
                  <span className="mx-1.5 text-muted">·</span>
                  {titleFromValues(row.item.values, row.list.schema.titleFieldId)}
                </span>
                <span className="shrink-0 text-xs text-muted">{formatDate(row.date)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3">
          <EmptyState compact title={empty} />
        </div>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: number | string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-4 shadow-lift">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-serif text-3xl">{value}</p>
    </div>
  )
}
