import type { ListRow, Visibility } from '../types/domain'
import { formatDateTime } from './cn'
import { listLinkAccess } from './share'

export const LIST_SORT_KEYS = ['updated', 'created', 'az', 'za'] as const
export type ListSortKey = (typeof LIST_SORT_KEYS)[number]

export const LIST_PEOPLE_FILTERS = ['all', 'solo', 'many'] as const
export type ListPeopleFilter = (typeof LIST_PEOPLE_FILTERS)[number]

export function listLooksCollaborative(list: ListRow): boolean {
  if (list.edit_mode !== 'owner') return true
  const access = listLinkAccess(list)
  if (access === 'edit' || access === 'propose') return true
  return Boolean(list.updated_by && list.updated_by !== list.owner_id)
}

export function listActorName(list: ListRow): string | null {
  const profile = list.updater
  if (!profile) return null
  if (profile.username) return `@${profile.username}`
  const name = profile.display_name?.trim()
  return name || null
}

export function shouldShowListActor(list: ListRow): boolean {
  return listLooksCollaborative(list)
}

export function filterLists(
  rows: ListRow[],
  opts: { visibility?: Visibility | 'all'; people?: ListPeopleFilter } = {},
): ListRow[] {
  const visibility = opts.visibility ?? 'all'
  const people = opts.people ?? 'all'
  return rows.filter((list) => {
    if (visibility !== 'all' && list.visibility !== visibility) return false
    if (people === 'many' && !listLooksCollaborative(list)) return false
    if (people === 'solo' && listLooksCollaborative(list)) return false
    return true
  })
}

export function sortLists(rows: ListRow[], sort: ListSortKey = 'updated', locale = 'en'): ListRow[] {
  const next = [...rows]
  next.sort((a, b) => {
    if (sort === 'az') return a.title.localeCompare(b.title, locale, { sensitivity: 'base' })
    if (sort === 'za') return b.title.localeCompare(a.title, locale, { sensitivity: 'base' })
    if (sort === 'created') return b.created_at.localeCompare(a.created_at)
    return b.updated_at.localeCompare(a.updated_at)
  })
  return next
}

export function listChangeText(
  list: ListRow,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const when = formatDateTime(list.updated_at)
  const name = shouldShowListActor(list) ? listActorName(list) : null
  if (name) return t('lists.changedBy', { when, name })
  return t('lists.changed', { when })
}
