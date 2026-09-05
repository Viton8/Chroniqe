import { formatDateTime } from '../../lib/cn'
import { activityItemTitle, activityTypeKey } from '../../lib/activity'
import type { ActivityEvent, ItemRow, ListSchema } from '../../types/domain'
import { usePrefs } from '../../context/PrefsContext'
import Avatar from '../ui/Avatar'

export default function ActivityFeed({
  events,
  schema,
  items,
  onOpen,
}: {
  events: ActivityEvent[]
  schema: ListSchema
  items: ItemRow[]
  onOpen: (item: ItemRow) => void
}) {
  const { t } = usePrefs()
  if (!events.length) {
    return <p className="text-sm text-muted">{t('list.quiet')}</p>
  }
  return (
    <ul className="space-y-2">
      {events.map((event) => {
        const title = activityItemTitle(event, schema)
        const item = event.item_id ? items.find((row) => row.id === event.item_id) : undefined
        const name = event.actor?.display_name || event.actor?.username || t('list.someone')
        return (
          <li key={event.id} className="flex items-start gap-3 rounded-2xl bg-paper px-4 py-3 text-sm shadow-lift">
            <Avatar name={name} url={event.actor?.avatar_url} />
            <div className="min-w-0 flex-1">
              <p>
                <span className="font-medium">{name}</span>{' '}
                <span className="text-muted">{t(activityTypeKey(event.event_type))}</span>
                {title ? <span> · {title}</span> : null}
              </p>
              <p className="mt-0.5 text-xs text-muted">{formatDateTime(event.created_at)}</p>
              {item ? (
                <button type="button" className="mt-1 text-xs text-accent" onClick={() => onOpen(item)}>
                  {t('activity.open')}
                </button>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
