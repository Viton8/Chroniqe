import type { ItemRow, ListRow } from '../types/domain'
import { fetchItems, fetchList } from '../services/api'
import { resolveCoverFieldId } from './files'
import { titleFromValues } from './cn'

const listCache = new Map<string, Promise<ListRow | null>>()
const itemsCache = new Map<string, Promise<ItemRow[]>>()

export function loadRelatedList(listId: string): Promise<ListRow | null> {
  let pending = listCache.get(listId)
  if (!pending) {
    pending = fetchList(listId).catch(() => null)
    listCache.set(listId, pending)
  }
  return pending
}

export function loadRelatedItems(listId: string): Promise<ItemRow[]> {
  let pending = itemsCache.get(listId)
  if (!pending) {
    pending = fetchItems(listId).catch(() => [])
    itemsCache.set(listId, pending)
  }
  return pending
}

export function invalidateRelatedCache(listId?: string) {
  if (!listId) {
    listCache.clear()
    itemsCache.clear()
    return
  }
  listCache.delete(listId)
  itemsCache.delete(listId)
}

export function relatedItemTitle(item: ItemRow, list: ListRow | null): string {
  return titleFromValues(item.values, list?.schema.titleFieldId)
}

export function relatedItemCover(item: ItemRow, list: ListRow | null): unknown {
  if (!list) return null
  const coverId = resolveCoverFieldId(list.schema)
  return coverId ? item.values[coverId] : null
}

export function relatedCoverField(list: ListRow | null) {
  if (!list) return undefined
  const coverId = resolveCoverFieldId(list.schema)
  return coverId ? list.schema.fields.find((f) => f.id === coverId) : undefined
}
