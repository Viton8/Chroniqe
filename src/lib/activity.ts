import { titleFromValues } from './cn'
import type {
  ActivityEvent,
  FeedFilter,
  FriendFeedEvent,
  ListSchema,
} from '../types/domain'

const KNOWN = [
  'item_created',
  'item_updated',
  'item_checked',
  'item_unchecked',
  'item_deleted',
  'item_moved',
] as const

export function activityTypeKey(eventType: string): string {
  return KNOWN.includes(eventType as (typeof KNOWN)[number])
    ? `activity.${eventType}`
    : 'activity.unknown'
}

export function activityItemTitle(event: ActivityEvent, schema: ListSchema): string | null {
  return titleFromPayload(event.payload, schema)
}

export function titleFromPayload(
  payload: Record<string, unknown> | null | undefined,
  schema?: ListSchema | null,
): string | null {
  const values = payload?.values
  if (!values || typeof values !== 'object' || Array.isArray(values)) return null
  const title = titleFromValues(values as Record<string, unknown>, schema?.titleFieldId)
  return title || null
}

export function matchesFeedFilter(eventType: string, filter: FeedFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'added') return eventType === 'item_created'
  if (filter === 'checked') return eventType === 'item_checked' || eventType === 'item_unchecked'
  if (filter === 'moved') return eventType === 'item_moved'
  return true
}

export function feedEventHref(event: FriendFeedEvent): string | null {
  const payload = event.payload ?? {}
  const targetId =
    event.target_list_id || (typeof payload.target_list_id === 'string' ? payload.target_list_id : null)
  const newItemId = typeof payload.new_item_id === 'string' ? payload.new_item_id : null
  if (event.event_type === 'item_moved' && targetId) {
    return newItemId ? `/lists/${targetId}?item=${newItemId}` : `/lists/${targetId}`
  }
  if (event.list_id && event.item_id) return `/lists/${event.list_id}?item=${event.item_id}`
  if (event.list_id) return `/lists/${event.list_id}`
  return null
}
