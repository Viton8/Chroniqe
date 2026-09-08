import { civilDateFromValue, titleFromValues } from './cn'
import { isPeakSpanSublist, sublistPeak } from './fields'
import type { FieldDef, ItemRating, ItemRow, ListSchema } from '../types/domain'

export type SortKey =
  | 'new'
  | 'old'
  | 'az'
  | 'za'
  | `f:${string}:asc`
  | `f:${string}:desc`

export interface ListFilters {
  facets: Record<string, string[]>
  dateFrom?: string
  dateTo?: string
  dateFieldId?: string
  ratingMin?: number
  ratingFieldId?: string
}

export function emptyFilters(): ListFilters {
  return { facets: {} }
}

export function titleFieldId(schema: ListSchema): string | undefined {
  return (
    schema.titleFieldId ??
    schema.fields.find(
      (field) => field.type === 'text' || field.type === 'textarea',
    )?.id
  )
}

export function facetFields(schema: ListSchema): FieldDef[] {
  return schema.fields.filter(
    (field) =>
      !field.hidden &&
      ['select', 'multiselect', 'tags', 'boolean', 'checkbox'].includes(
        field.type,
      ),
  )
}

export function sortableFields(schema: ListSchema): FieldDef[] {
  return schema.fields.filter(
    (field) =>
      [
        'text',
        'number',
        'integer',
        'date',
        'datetime',
        'rating',
        'multi_rating',
        'select',
      ].includes(field.type) || isPeakSpanSublist(field),
  )
}

export function filterDateFields(schema: ListSchema): FieldDef[] {
  return schema.fields.filter(
    (field) => field.type === 'date' || field.type === 'datetime',
  )
}

export function scoreFields(schema: ListSchema): FieldDef[] {
  return schema.fields.filter(
    (field) =>
      ['rating', 'multi_rating', 'number', 'integer'].includes(field.type) ||
      isPeakSpanSublist(field),
  )
}

export function countActiveFilters(filters: ListFilters): number {
  let n = Object.values(filters.facets).reduce(
    (sum, values) => sum + (values.length ? 1 : 0),
    0,
  )
  if (filters.dateFrom) n += 1
  if (filters.dateTo) n += 1
  if (filters.ratingMin != null && filters.ratingMin > 0) n += 1
  return n
}

export function itemDateIso(value: unknown): string | null {
  return civilDateFromValue(value)
}

export function itemScore(
  item: ItemRow,
  fieldId: string,
  ratings: ItemRating[],
  field?: FieldDef,
): number | null {
  const resolved = field && field.id === fieldId ? field : undefined
  if (resolved && isPeakSpanSublist(resolved)) {
    return sublistPeak(resolved, item.values[fieldId])
  }
  const raw = item.values[fieldId]
  if (raw != null && raw !== '') {
    const direct = Number(raw)
    if (Number.isFinite(direct)) return direct
  }
  if (Array.isArray(raw) && resolved) {
    return sublistPeak(resolved, raw)
  }
  const all = ratings.filter(
    (row) => row.item_id === item.id && row.field_id === fieldId,
  )
  if (!all.length) return null
  return all.reduce((sum, row) => sum + Number(row.value), 0) / all.length
}

export function applyListFilters(
  items: ItemRow[],
  schema: ListSchema,
  filters: ListFilters,
  ratings: ItemRating[],
): ItemRow[] {
  const dateId = filters.dateFieldId || schema.dateFieldId
  return items.filter((item) => {
    for (const [fieldId, selected] of Object.entries(filters.facets)) {
      if (!selected.length) continue
      const field = schema.fields.find((row) => row.id === fieldId)
      if (!field) continue
      const raw = item.values[fieldId]
      if (field.type === 'boolean' || field.type === 'checkbox') {
        if (!selected.includes(raw ? 'true' : 'false')) return false
        continue
      }
      if (Array.isArray(raw)) {
        const bag = raw.map(String)
        if (!selected.some((value) => bag.includes(value))) return false
        continue
      }
      if (!selected.includes(String(raw ?? ''))) return false
    }

    if (dateId && (filters.dateFrom || filters.dateTo)) {
      const iso = itemDateIso(item.values[dateId])
      if (!iso) return false
      if (filters.dateFrom && iso < filters.dateFrom) return false
      if (filters.dateTo && iso > filters.dateTo) return false
    }

    if (
      filters.ratingMin != null &&
      filters.ratingMin > 0 &&
      filters.ratingFieldId
    ) {
      const field = schema.fields.find(
        (row) => row.id === filters.ratingFieldId,
      )
      const score = itemScore(item, filters.ratingFieldId, ratings, field)
      if (score == null || score < filters.ratingMin) return false
    }

    return true
  })
}

export function sortItems(
  rows: ItemRow[],
  sort: SortKey,
  schema: ListSchema,
  locale: string,
  ratings: ItemRating[],
): ItemRow[] {
  const next = [...rows]
  const titleOf = (row: ItemRow) =>
    titleFromValues(row.values, schema.titleFieldId).toLowerCase()
  if (sort === 'new')
    next.sort((a, b) => b.created_at.localeCompare(a.created_at))
  if (sort === 'old')
    next.sort((a, b) => a.created_at.localeCompare(b.created_at))
  if (sort === 'az')
    next.sort((a, b) => titleOf(a).localeCompare(titleOf(b), locale))
  if (sort === 'za')
    next.sort((a, b) => titleOf(b).localeCompare(titleOf(a), locale))
  if (sort.startsWith('f:')) {
    const parts = sort.split(':')
    const fieldId = parts[1]
    const dir = parts[2] === 'desc' ? -1 : 1
    const field = schema.fields.find((row) => row.id === fieldId)
    next.sort((a, b) => compareField(a, b, field, ratings) * dir)
  }
  return next
}

function compareField(
  a: ItemRow,
  b: ItemRow,
  field: FieldDef | undefined,
  ratings: ItemRating[],
): number {
  if (!field) return 0
  if (
    field.type === 'number' ||
    field.type === 'integer' ||
    field.type === 'rating' ||
    field.type === 'multi_rating' ||
    isPeakSpanSublist(field)
  ) {
    const left = itemScore(a, field.id, ratings, field) ?? -Infinity
    const right = itemScore(b, field.id, ratings, field) ?? -Infinity
    return left - right
  }
  if (field.type === 'date' || field.type === 'datetime') {
    return (itemDateIso(a.values[field.id]) ?? '').localeCompare(
      itemDateIso(b.values[field.id]) ?? '',
    )
  }
  return String(a.values[field.id] ?? '').localeCompare(
    String(b.values[field.id] ?? ''),
    undefined,
    {
      numeric: true,
      sensitivity: 'base',
    },
  )
}

export function collectedTags(items: ItemRow[], field: FieldDef): string[] {
  const set = new Set<string>()
  for (const item of items) {
    const raw = item.values[field.id]
    if (Array.isArray(raw)) {
      for (const value of raw) {
        if (value != null && String(value).trim()) set.add(String(value))
      }
    } else if (raw != null && String(raw).trim()) {
      set.add(String(raw))
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}
