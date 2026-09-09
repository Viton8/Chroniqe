import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import {
  fetchFriendFeed,
  fetchFriendships,
  fetchItems,
  fetchListsByIds,
  fetchMyInvites,
  fetchMyLists,
  fetchNotifications,
  fetchRatings,
  fetchSharedLists,
  fetchSubscribedLists,
} from '../services/api'
import { NotificationsFeed } from '../components/notifications/NotificationsModal'
import type { AppNotification, FriendFeedEvent, ItemRating, ItemRow, ListRow } from '../types/domain'
import EmptyState, { Spinner } from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import { SearchField } from '../components/ui/Input'
import PageHeader from '../components/ui/PageHeader'
import ListCard from '../components/lists/ListCard'
import FriendFeed from '../components/lists/FriendFeed'
import HomeLayoutEditor from '../components/dash/HomeLayoutEditor'
import HomeListPanel from '../components/dash/HomeListPanel'
import { readFavorites } from '../lib/favorites'
import {
  patchHomeBlock,
  readHomeLayout,
  subscribeHomeLayout,
  writeHomeLayout,
  type HomeBlock,
  type HomeLayout,
} from '../lib/homeLayout'
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
  const [extraLists, setExtraLists] = useState<ListRow[]>([])
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
  const [editorOpen, setEditorOpen] = useState(false)
  const [layout, setLayout] = useState<HomeLayout>(() => readHomeLayout())
  const [itemsByList, setItemsByList] = useState<Record<string, ItemRow[]>>({})
  const [ratingsByList, setRatingsByList] = useState<Record<string, ItemRating[]>>({})
  const fetchedItems = useRef(new Set<string>())
  const debounced = useDebouncedValue(query)

  const saveLayout = (next: HomeLayout) => {
    writeHomeLayout(next)
    setLayout(readHomeLayout())
  }

  useEffect(() => subscribeHomeLayout(() => setLayout(readHomeLayout())), [])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetchedItems.current = new Set()
    setLoading(true)
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
      if (cancelled) return
      setLists(owned)
      setShared(sharedRows)
      setFollowing(subscribed.filter((row) => row.owner_id !== user.id))
      setNotes(inbox.slice(0, 5))
      setFeed(friendEvents)
      setFriendCount(friends.filter((row) => row.status === 'accepted').length)
      setRequests(friends.filter((row) => row.status === 'pending' && row.addressee_id === user.id).length)
      setInvites(listInvites.length)

      const layoutNow = readHomeLayout()
      const widgetIds = layoutNow.blocks
        .filter((block) => block.kind === 'list' && block.listId)
        .map((block) => block.listId as string)
      const known = new Map([...owned, ...sharedRows, ...subscribed].map((row) => [row.id, row]))
      const extra = await fetchListsByIds(widgetIds.filter((id) => !known.has(id))).catch(() => [] as ListRow[])
      if (cancelled) return
      setExtraLists(extra)
      for (const row of extra) known.set(row.id, row)

      const insightLists = [...owned, ...sharedRows].slice(0, 12)
      const itemIds = [...new Set([...insightLists.map((row) => row.id), ...widgetIds])]
      const payloads = await Promise.all(itemIds.map((id) => loadListPayload(id)))
      if (cancelled) return
      const nextItems: Record<string, ItemRow[]> = {}
      const nextRatings: Record<string, ItemRating[]> = {}
      itemIds.forEach((id, index) => {
        fetchedItems.current.add(id)
        nextItems[id] = payloads[index].rows
        nextRatings[id] = payloads[index].ratings
      })
      setItemsByList(nextItems)
      setRatingsByList(nextRatings)

      const soon: Array<{ list: ListRow; item: ItemRow; date: string }> = []
      const late: Array<{ list: ListRow; item: ItemRow; date: string }> = []
      let open = 0
      for (const list of insightLists) {
        const rows = nextItems[list.id] ?? []
        const stats = buildInsights(list.schema, rows, nextRatings[list.id] ?? [], list.settings)
        open += stats.open
        for (const row of stats.upcoming) soon.push({ list, item: row.item, date: row.date })
        for (const row of stats.overdue) late.push({ list, item: row.item, date: row.date })
      }
      soon.sort((a, b) => a.date.localeCompare(b.date))
      late.sort((a, b) => a.date.localeCompare(b.date))
      setUpcoming(soon.slice(0, 6))
      setOverdue(late.slice(0, 6))
      setOpenCount(open)
    })().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  const widgetIds = useMemo(
    () =>
      [...new Set(layout.blocks.filter((block) => block.kind === 'list' && block.listId).map((block) => block.listId as string))],
    [layout],
  )

  const catalog = useMemo(() => {
    const seen = new Set<string>()
    return [...lists, ...shared, ...following, ...extraLists].filter((list) => {
      if (seen.has(list.id)) return false
      seen.add(list.id)
      return true
    })
  }, [lists, shared, following, extraLists])

  useEffect(() => {
    if (!user || loading) return
    let cancelled = false
    void (async () => {
      const known = new Set(catalog.map((row) => row.id))
      const missing = widgetIds.filter((id) => !known.has(id))
      if (missing.length) {
        const extra = await fetchListsByIds(missing).catch(() => [] as ListRow[])
        if (!cancelled && extra.length) {
          setExtraLists((prev) => {
            const map = new Map(prev.map((row) => [row.id, row]))
            for (const row of extra) map.set(row.id, row)
            return [...map.values()]
          })
        }
      }
      const need = widgetIds.filter((id) => !fetchedItems.current.has(id))
      if (!need.length) return
      need.forEach((id) => fetchedItems.current.add(id))
      const payloads = await Promise.all(need.map((id) => loadListPayload(id)))
      if (cancelled) {
        need.forEach((id) => fetchedItems.current.delete(id))
        return
      }
      setItemsByList((prev) => {
        const next = { ...prev }
        need.forEach((id, index) => {
          next[id] = payloads[index].rows
        })
        return next
      })
      setRatingsByList((prev) => {
        const next = { ...prev }
        need.forEach((id, index) => {
          next[id] = payloads[index].ratings
        })
        return next
      })
    })()
    return () => {
      cancelled = true
    }
  }, [user, loading, widgetIds, catalog])

  const allLists = useMemo(() => {
    const seen = new Set<string>()
    return [...lists, ...shared].filter((list) => {
      if (seen.has(list.id)) return false
      seen.add(list.id)
      return true
    })
  }, [lists, shared])

  const listsById = useMemo(() => new Map(catalog.map((row) => [row.id, row])), [catalog])

  const favorites = useMemo(() => {
    const ids = new Set(favIds)
    const seen = new Set<string>()
    return [...allLists, ...following].filter((list) => {
      if (!ids.has(list.id) || seen.has(list.id)) return false
      seen.add(list.id)
      return true
    })
  }, [allLists, following, favIds])

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
  const visibleBlocks = layout.blocks.filter((block) => block.on)

  const refreshFav = () => setFavIds(readFavorites())

  const listGrid = (rows: ListRow[], empty: ReactNode, badgeFor?: (list: ListRow) => string) =>
    rows.length ? (
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {rows.map((list) => (
          <ListCard
            key={list.id}
            list={list}
            badge={
              badgeFor
                ? badgeFor(list)
                : list.owner_id !== user?.id
                  ? t('dash.shared')
                  : t(`visibility.${list.visibility}`)
            }
            favorite
            onFav={refreshFav}
          />
        ))}
      </ul>
    ) : (
      empty
    )

  const panel = (block: HomeBlock) => {
    switch (block.kind) {
      case 'stats':
        return (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label={t('dash.lists')} value={lists.length} />
            <Stat label={t('insights.open')} value={openCount} />
            <Stat label={t('dash.unread')} value={notes.filter((n) => !n.read_at).length} />
            <Stat label={t('dash.public')} value={lists.filter((l) => l.visibility === 'public').length} />
          </div>
        )
      case 'feed':
        return (
          <section>
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
        )
      case 'following':
        return (
          <section>
            <h2 className="font-serif text-2xl">{t('dash.following')}</h2>
            {listGrid(
              visibleFollowing.slice(0, 6),
              <div className="mt-3">
                <EmptyState
                  compact
                  title={debounced ? t('dash.noSearch') : t('home.emptyFollowing')}
                  text={debounced ? t('dash.noSearchText') : undefined}
                />
              </div>,
              () => t('list.following'),
            )}
          </section>
        )
      case 'pinned':
        return (
          <section>
            <h2 className="font-serif text-2xl">{t('dash.pinned')}</h2>
            {listGrid(
              favorites,
              <div className="mt-3">
                <EmptyState compact title={t('home.emptyPinned')} />
              </div>,
            )}
          </section>
        )
      case 'overdue':
        return <DateBlock title={t('insights.overdue')} rows={overdue} empty={t('insights.noOverdue')} />
      case 'upcoming':
        return <DateBlock title={t('dash.upcoming')} rows={upcoming} empty={t('dash.noUpcoming')} />
      case 'recent':
        return (
          <section>
            <h2 className="font-serif text-2xl">{t('dash.recent')}</h2>
            {visibleLists.length ? (
              listGrid(visibleLists.slice(0, 8), null)
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
          </section>
        )
      case 'activity':
        return (
          <section>
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl">{t('dash.events')}</h2>
              <Link to="/notifications" className="text-sm text-accent hover:underline">
                {t('dash.openNotes')}
              </Link>
            </div>
            <div className="mt-3">
              <NotificationsFeed rows={notes} />
            </div>
          </section>
        )
      case 'list': {
        const list = block.listId ? listsById.get(block.listId) : undefined
        return (
          <HomeListPanel
            block={block}
            list={list}
            items={block.listId ? itemsByList[block.listId] : []}
            ratings={block.listId ? ratingsByList[block.listId] : []}
            loading={Boolean(block.listId && itemsByList[block.listId] === undefined)}
            onViewChange={(viewId) => saveLayout(patchHomeBlock(layout, block.id, { viewId }))}
          />
        )
      }
      default:
        return null
    }
  }

  const panels: ReactNode[] = []
  for (let i = 0; i < visibleBlocks.length; i++) {
    const a = visibleBlocks[i]
    const b = visibleBlocks[i + 1]
    if (
      b &&
      ((a.kind === 'overdue' && b.kind === 'upcoming') || (a.kind === 'upcoming' && b.kind === 'overdue'))
    ) {
      panels.push(
        <div key={`${a.id}:${b.id}`} className="mt-8 grid gap-6 lg:grid-cols-2">
          {panel(a)}
          {panel(b)}
        </div>,
      )
      i += 1
      continue
    }
    panels.push(
      <div key={a.id} className={a.kind === 'stats' ? 'mt-6' : 'mt-8'}>
        {panel(a)}
      </div>,
    )
  }

  return (
    <div>
      <PageHeader
        kicker={greet}
        title={t('dash.title')}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="soft" size="sm" onClick={() => setEditorOpen(true)}>
              <SlidersHorizontal size={14} /> {t('home.customize')}
            </Button>
            <Link to="/lists/new">
              <Button size="sm">{t('dash.newList')}</Button>
            </Link>
          </div>
        }
      />
      <SearchField
        className="mt-4"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('dash.search')}
      />
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

      {visibleBlocks.length ? (
        panels
      ) : (
        <div className="mt-8">
          <EmptyState
            title={t('home.noPanels')}
            action={{ label: t('home.customize'), onClick: () => setEditorOpen(true) }}
          />
        </div>
      )}

      <HomeLayoutEditor
        open={editorOpen}
        layout={layout}
        lists={catalog}
        onChange={saveLayout}
        onClose={() => setEditorOpen(false)}
      />
    </div>
  )
}

async function loadListPayload(id: string): Promise<{ rows: ItemRow[]; ratings: ItemRating[] }> {
  const rows = await fetchItems(id).catch(() => [] as ItemRow[])
  const ratings = rows.length ? await fetchRatings(rows.map((row) => row.id)).catch(() => [] as ItemRating[]) : []
  return { rows, ratings }
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
                to={`/lists/${row.list.id}?item=${row.item.id}`}
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
