import { titleFromValues } from './cn'
import type { ActivityEvent, ListSchema } from '../types/domain'

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
  const values = event.payload?.values
  if (!values || typeof values !== 'object' || Array.isArray(values)) return null
  const title = titleFromValues(values as Record<string, unknown>, schema.titleFieldId)
  return title || null
}
