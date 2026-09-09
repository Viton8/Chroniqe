import { usesItemRatings } from './ratings'
import type {
  ChartConfig,
  ChartType,
  FieldDef,
  ItemRating,
  ItemRow,
  ListSchema,
} from '../types/domain'
import { displayValue } from './display'
import { formatDate, formatDateTime, parseWallOrInstant, titleFromValues } from './cn'
import { msg } from './i18n'

export interface ChartPoint {
  label: string
  date?: number
  value: number
  extra?: string
}

export interface TimelineEvent {
  id: string
  title: string
  at: number
  label: string
}

export function buildTimelineEvents(
  config: ChartConfig,
  schema: ListSchema,
  items: ItemRow[],
): TimelineEvent[] {
  const dateField = fieldById(schema, config.dateFieldId)
  if (!dateField || (dateField.type !== 'date' && dateField.type !== 'datetime')) return []
  const events: TimelineEvent[] = []
  for (const item of items) {
    const raw = item.values[dateField.id]
    if (raw == null || raw === '') continue
    const parsed = parseWallOrInstant(String(raw))
    if (!parsed) continue
    const stamp = String(raw)
    events.push({
      id: item.id,
      title: titleFromValues(item.values, schema.titleFieldId),
      at: parsed.getTime(),
      label: dateField.type === 'datetime' ? formatDateTime(stamp) : formatDate(stamp),
    })
  }
  events.sort((a, b) => a.at - b.at || a.title.localeCompare(b.title))
  return events
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
  if (usesItemRatings(field)) {
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
    const groupField = fieldById(schema, config.groupFieldId)
    const counts = new Map<string, number>()
    for (const item of items) {
      const raw = groupField ? item.values[groupField.id] : null
      const key = groupField ? displayValue(groupField, raw, ratings, item.id) : '—'
      counts.set(key || '—', (counts.get(key || '—') ?? 0) + 1)
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
    const label = axisLabel(dateField, dateField ? item.values[dateField.id] : item.created_at, ratings, item.id)
    const n =
      agg === 'count'
        ? 1
        : numericFromValue(valueField, item.values[valueField?.id ?? ''], ratings, item.id)
    if (n == null) continue
    const arr = buckets.get(label) ?? []
    arr.push(n)
    buckets.set(label, arr)
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => compareAxisLabels(a, b, dateField))
    .map(([label, nums]) => {
      let value = nums.length
      if (agg === 'sum') value = nums.reduce((s, x) => s + x, 0)
      if (agg === 'avg') value = nums.reduce((s, x) => s + x, 0) / nums.length
      if (agg === 'min') value = Math.min(...nums)
      if (agg === 'max') value = Math.max(...nums)
      const ts = Date.parse(label)
      return {
        label,
        date: Number.isFinite(ts) ? ts : undefined,
        value: Number(value.toFixed(2)),
      }
    })
}

function axisLabel(
  field: FieldDef | undefined,
  value: unknown,
  ratings: ItemRating[],
  itemId: string,
): string {
  if (!field) {
    return value != null && value !== '' ? String(value).slice(0, 10) : '—'
  }
  if (field.type === 'date' || field.type === 'datetime') {
    if (value == null || value === '') return '—'
    const raw = String(value)
    return field.type === 'date' ? raw.slice(0, 10) : raw.slice(0, 16).replace('T', ' ')
  }
  return displayValue(field, value, ratings, itemId)
}

function compareAxisLabels(a: string, b: string, field?: FieldDef): number {
  if (!field || field.type === 'date' || field.type === 'datetime') {
    return a.localeCompare(b)
  }
  if (field.type === 'number' || field.type === 'integer' || field.type === 'rating') {
    const na = Number(a)
    const nb = Number(b)
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb
  }
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}
