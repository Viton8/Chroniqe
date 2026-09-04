import type {
  ChartConfig,
  ChartType,
  FieldDef,
  ItemRating,
  ItemRow,
  ListSchema,
} from '../types/domain'
import { msg } from './i18n'

export interface ChartPoint {
  label: string
  date?: number
  value: number
  extra?: string
}

export function fieldById(schema: ListSchema, id?: string): FieldDef | undefined {
  return schema.fields.find((f) => f.id === id)
}

function numericFromValue(
  field: FieldDef | undefined,
  value: unknown,
  ratings: ItemRating[],
  itemId: string,
): number | null {
  if (!field) return null
  if (field.type === 'multi_rating') {
    const mine = ratings.filter((r) => r.item_id === itemId && r.field_id === field.id)
    if (!mine.length) return null
    return mine.reduce((s, r) => s + Number(r.value), 0) / mine.length
  }
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function buildChartSeries(
  type: ChartType,
  config: ChartConfig,
  schema: ListSchema,
  items: ItemRow[],
  ratings: ItemRating[],
): ChartPoint[] {
  const dateField = fieldById(schema, config.dateFieldId)
  const valueField = fieldById(schema, config.valueFieldId)
  const agg = config.aggregation ?? (valueField ? 'avg' : 'count')

  if (type === 'pie') {
    const groupId = config.groupFieldId ?? config.valueFieldId
    const counts = new Map<string, number>()
    for (const item of items) {
      const key = String(item.values[groupId ?? ''] ?? '—')
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()].map(([label, value]) => ({ label, value }))
  }

  if (type === 'kpi') {
    const values = items
      .map((item) => numericFromValue(valueField, item.values[valueField?.id ?? ''], ratings, item.id))
      .filter((n): n is number => n != null)
    const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
    return [
      { label: msg('charts.records'), value: items.length },
      { label: msg('charts.average'), value: Number(avg.toFixed(2)) },
      { label: msg('charts.checked'), value: items.filter((i) => i.is_checked).length },
    ]
  }

  const buckets = new Map<string, number[]>()
  for (const item of items) {
    const rawDate = dateField ? item.values[dateField.id] : item.created_at
    const dateStr = rawDate ? String(rawDate).slice(0, 10) : ''
    if (!dateStr) continue
    const n =
      agg === 'count'
        ? 1
        : numericFromValue(valueField, item.values[valueField?.id ?? ''], ratings, item.id)
    if (n == null) continue
    const arr = buckets.get(dateStr) ?? []
    arr.push(n)
    buckets.set(dateStr, arr)
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, nums]) => {
      let value = nums.length
      if (agg === 'sum') value = nums.reduce((a, b) => a + b, 0)
      if (agg === 'avg') value = nums.reduce((a, b) => a + b, 0) / nums.length
      if (agg === 'min') value = Math.min(...nums)
      if (agg === 'max') value = Math.max(...nums)
      return { label, date: new Date(label).getTime(), value: Number(value.toFixed(2)) }
    })
}
