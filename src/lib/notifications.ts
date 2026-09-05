import type { AppNotification } from '../types/domain'

type Translate = (key: string, vars?: Record<string, string | number>) => string

const KNOWN_TYPES = new Set([
  'item_created',
  'item_updated',
  'item_checked',
  'item_unchecked',
  'item_deleted',
  'proposal_created',
  'proposal_reviewed',
  'friend_request',
  'friend_accepted',
  'list_invite',
])

export function notificationTitle(row: AppNotification, t: Translate): string {
  if (row.type === 'proposal_reviewed') {
    const key = row.payload.approved ? 'notes.types.proposal_approved' : 'notes.types.proposal_rejected'
    return t(key)
  }
  const key = `notes.types.${row.type}`
  const text = t(key)
  if (KNOWN_TYPES.has(row.type) && text !== key) return text
  return row.title || t('notes.unknown')
}

export function notificationBody(row: AppNotification, t: Translate): string | null {
  if (!row.body) return null
  if (row.body === row.type || row.body.startsWith('item_')) {
    const key = `notes.types.${row.body}`
    const text = t(key)
    if (text !== key) return null
  }
  return row.body
}
