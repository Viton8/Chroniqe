import { itemDateIso, itemScore } from './filters'
import { isPeakSpanSublist } from './fields'
import { todayIso } from './cn'
import type { FieldDef, ItemRating, ItemRow, ListSchema } from '../types/domain'

export interface InsightGroup {
  value: string
  label: string
  count: number
  color?: string
}

export interface DatedInsight {
  item: ItemRow
  date: string
}

export interface ListInsights {
  total: number
  checked: number
  open: number
  completion: number
  addedThisWeek: number
  addedThisMonth: number
  avgRating: number | null
  ratingCount: number
  ratingField?: FieldDef
  groupField?: FieldDef
  dateField?: FieldDef
  byGroup: InsightGroup[]
  upcoming: DatedInsight[]
  overdue: DatedInsight[]
}

export function buildInsights(
  schema: ListSchema,
  items: ItemRow[],
  ratings: ItemRating[],
): ListInsights {
  const now = Date.now()
  const weekAgo = now - 7 * 86_400_000
  const monthAgo = now - 30 * 86_400_000
  const checked = items.filter((item) => item.is_checked).length
  const ratingField =
    schema.fields.find((field) => field.type === 'multi_rating') ??
    schema.fields.find((field) => field.type === 'rating') ??
    schema.fields.find((field) => isPeakSpanSublist(field))
  const groupField =
    schema.fields.find((field) => field.id === schema.groupFieldId) ??
    schema.fields.find((field) => field.type === 'select')
  const dateField =
    schema.fields.find((field) => field.id === schema.dateFieldId) ??
    schema.fields.find(
      (field) => field.type === 'date' || field.type === 'datetime',
    )

  let ratingSum = 0
  let ratingCount = 0
  if (ratingField) {
    for (const item of items) {
      const score = itemScore(item, ratingField.id, ratings, ratingField)
      if (score != null) {
        ratingSum += score
        ratingCount += 1
      }
    }
  }

  const byGroup: InsightGroup[] = []
  if (groupField) {
    const options = groupField.config?.options ?? []
    const counts = new Map<string, number>()
    for (const item of items) {
      const raw = item.values[groupField.id]
      const values = Array.isArray(raw) ? raw.map(String) : [String(raw ?? '')]
      for (const value of values) {
        if (!value) continue
        counts.set(value, (counts.get(value) ?? 0) + 1)
      }
    }
    const labels = new Map(options.map((option) => [option.value, option]))
    for (const [value, count] of counts) {
      byGroup.push({
        value,
        label: labels.get(value)?.label ?? value,
        count,
        color: labels.get(value)?.color,
      })
    }
    byGroup.sort((a, b) => b.count - a.count)
  }

  const today = todayIso()
  const dated: DatedInsight[] = dateField
    ? items
        .map((item) => ({
          item,
          date: itemDateIso(item.values[dateField.id]) ?? '',
        }))
        .filter((row) => row.date)
    : []

  return {
    total: items.length,
    checked,
    open: items.length - checked,
    completion: items.length ? Math.round((checked / items.length) * 100) : 0,
    addedThisWeek: items.filter(
      (item) => new Date(item.created_at).getTime() >= weekAgo,
    ).length,
    addedThisMonth: items.filter(
      (item) => new Date(item.created_at).getTime() >= monthAgo,
    ).length,
    avgRating: ratingCount ? ratingSum / ratingCount : null,
    ratingCount,
    ratingField,
    groupField,
    dateField,
    byGroup,
    upcoming: dated
      .filter((row) => row.date >= today && !row.item.is_checked)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8),
    overdue: dated
      .filter((row) => row.date < today && !row.item.is_checked)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8),
  }
}
