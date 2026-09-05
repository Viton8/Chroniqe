import { Link, useNavigate } from 'react-router-dom'
import Avatar from '../ui/Avatar'
import EmptyState from '../ui/EmptyState'
import { formatDate, formatRelativeTime } from '../../lib/cn'
import { activityTypeKey, feedEventHref, titleFromPayload } from '../../lib/activity'
import type { FriendFeedEvent } from '../../types/domain'
import { usePrefs } from '../../context/PrefsContext'

function listLabel(icon: string | null | undefined, title: string | null | undefined) {
  return `${icon ?? ''} ${title ?? ''}`.trim()
}

function dayKey(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function groupByDay(events: FriendFeedEvent[]): Array<{ day: string; rows: FriendFeedEvent[] }> {
  const map = new Map<string, FriendFeedEvent[]>()
  for (const event of events) {
    const key = dayKey(event.created_at)
    const bucket = map.get(key)
    if (bucket) bucket.push(event)
    else map.set(key, [event])
  }
  return [...map.entries()].map(([day, rows]) => ({ day, rows }))
}

function FeedRow({ event }: { event: FriendFeedEvent }) {
  const { t } = usePrefs()
  const name = event.actor_display_name || event.actor_username || t('list.someone')
  const title = titleFromPayload(event.payload, event.list_schema)
  const href = feedEventHref(event)
  const source = listLabel(event.list_icon, event.list_title)
  const target = listLabel(event.target_list_icon, event.target_list_title)
  const inner = (
    <>
      <Avatar name={name} url={event.actor_avatar_url} />
      <div className="min-w-0 flex-1">
        <p>
          {event.actor_username ? (
            <Link
              to={`/u/${event.actor_username}`}
              className="font-medium hover:text-accent"
              onClick={(e) => e.stopPropagation()}
            >
              {name}
            </Link>
          ) : (
            <span className="font-medium">{name}</span>
          )}{' '}
          <span className="text-muted">{t(activityTypeKey(event.event_type))}</span>
          {title ? <span> · {title}</span> : null}
        </p>
        {source || target ? (
          <p className="mt-0.5 truncate text-xs text-muted">
            {source}
            {event.event_type === 'item_moved' && target ? ` → ${target}` : ''}
          </p>
        ) : null}
        <p className="mt-0.5 text-xs text-muted">{formatRelativeTime(event.created_at)}</p>
      </div>
    </>
  )

  if (href) {
    return (
      <Link
        to={href}
        className="flex items-start gap-3 rounded-2xl border border-line bg-paper px-4 py-3 text-sm shadow-lift transition-colors hover:border-accent"
      >
        {inner}
      </Link>
    )
  }
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-line bg-paper px-4 py-3 text-sm shadow-lift">
      {inner}
    </div>
  )
}

export default function FriendFeed({
  events,
  empty,
  compact,
}: {
  events: FriendFeedEvent[]
  empty: 'none' | 'quiet' | 'nofriends'
  compact?: boolean
}) {
  const { t } = usePrefs()
  const navigate = useNavigate()

  if (!events.length) {
    if (empty === 'nofriends') {
      return (
        <EmptyState
          compact={compact}
          title={t('feed.emptyFriends')}
          text={t('feed.emptyFriendsText')}
          action={{ label: t('feed.findPeople'), onClick: () => navigate('/friends') }}
        />
      )
    }
    return <EmptyState compact={compact} title={t('feed.emptyTitle')} text={t('feed.emptyText')} />
  }

  if (compact) {
    return (
      <ul className="space-y-2">
        {events.map((event) => (
          <li key={event.id}>
            <FeedRow event={event} />
          </li>
        ))}
      </ul>
    )
  }

  const groups = groupByDay(events)
  return (
    <div className="space-y-6">
      {groups.map(({ day, rows }) => (
        <section key={day}>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            {formatDate(day)}
          </h3>
          <ul className="space-y-2">
            {rows.map((event) => (
              <li key={event.id}>
                <FeedRow event={event} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
