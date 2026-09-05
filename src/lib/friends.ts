import type { Friendship } from '../types/domain'

export type FriendRelation = 'self' | 'friends' | 'outgoing' | 'incoming' | 'none'

export function friendRelation(userId: string, otherId: string, rows: Friendship[]): FriendRelation {
  if (userId === otherId) return 'self'
  let pending: FriendRelation | null = null
  for (const row of rows) {
    const mine = row.requester_id === userId && row.addressee_id === otherId
    const theirs = row.requester_id === otherId && row.addressee_id === userId
    if (!mine && !theirs) continue
    if (row.status === 'accepted') return 'friends'
    if (row.status === 'pending') pending = mine ? 'outgoing' : 'incoming'
  }
  return pending ?? 'none'
}

export function otherFriend(userId: string, row: Friendship) {
  return row.requester_id === userId ? row.addressee : row.requester
}
