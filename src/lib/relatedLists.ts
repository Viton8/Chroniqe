import type { ListRow } from '../types/domain'

export function structuralRelatedListIds(list: Pick<ListRow, 'id' | 'schema' | 'settings'>): string[] {
  const ids = new Set<string>()
  for (const action of list.settings?.transferActions ?? []) {
    if (action.targetListId && action.targetListId !== list.id) ids.add(action.targetListId)
  }
  for (const field of list.schema?.fields ?? []) {
    const related = field.config?.relatedListId
    if (related && related !== list.id) ids.add(related)
  }
  for (const action of [...(list.settings?.onCheck ?? []), ...(list.settings?.onUncheck ?? [])]) {
    if (action.type === 'move_to_list' && action.targetListId && action.targetListId !== list.id) {
      ids.add(action.targetListId)
    }
  }
  return [...ids]
}

export function relatedListIdsFrom(list: Pick<ListRow, 'id' | 'schema' | 'settings'>): string[] {
  const ids = new Set(structuralRelatedListIds(list))
  for (const id of list.settings?.relatedListIds ?? []) {
    if (id && id !== list.id) ids.add(id)
  }
  return [...ids]
}

export function expandRelatedListIds(list: ListRow, others: ListRow[]): string[] {
  const ids = new Set(relatedListIdsFrom(list))
  for (const other of others) {
    if (other.id === list.id) continue
    if (relatedListIdsFrom(other).includes(list.id)) ids.add(other.id)
  }
  return [...ids]
}

export function lockedRelatedListIds(list: ListRow, others: ListRow[]): Set<string> {
  const locked = new Set(structuralRelatedListIds(list))
  for (const other of others) {
    if (other.id === list.id) continue
    if (structuralRelatedListIds(other).includes(list.id)) locked.add(other.id)
  }
  return locked
}
