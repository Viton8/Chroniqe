import { usesItemRatings } from './ratings'
import type { FieldDef, FieldViewStyle, ItemRating, ListSchema, NumberDisplay } from '../types/domain'
import { formatDate, formatDateTime, formatTimeSpan } from './cn'
import {
  isPeakSpanSublist,
  subfieldAsDef,
  sublistPeak,
  sublistPeakLabel,
  sublistRows,
  sublistTimeBounds,
} from './fields'
import { evalFormula } from './formula'
import { msg } from './i18n'

const NUMERIC_TYPES = new Set(['number', 'integer', 'rating', 'multi_rating', 'community_rating'])

export function isNumericField(field: FieldDef): boolean {
  return NUMERIC_TYPES.has(field.type) || isPeakSpanSublist(field)
}

export function fieldBounds(field: FieldDef): { min?: number; max?: number } {
  const cfg = field.config ?? {}
  if (isPeakSpanSublist(field)) {
    const valueId = cfg.sublistSummary?.valueFieldId
    const nested = cfg.subfields?.find(
      (row) => row.id === valueId || row.key === valueId,
    )
    if (nested) return fieldBounds(subfieldAsDef(nested))
    return { min: 0, max: 10 }
  }
  if (field.type === 'rating' || usesItemRatings(field)) {
    return {
      min: cfg.min ?? 1,
      max: cfg.ratingMax ?? cfg.max ?? 10,
    }
  }
  return {
    min: typeof cfg.min === 'number' ? cfg.min : undefined,
    max: typeof cfg.max === 'number' ? cfg.max : undefined,
  }
}

export function displaysForField(field: FieldDef): NumberDisplay[] {
  const { min, max } = fieldBounds(field)
  const modes: NumberDisplay[] = ['number']
  if (min != null || max != null) modes.push('range')
  if (max != null) modes.push('fraction')
  if (field.type === 'rating' || usesItemRatings(field)) modes.push('stars')
  return modes
}

export function resolveNumericValue(
  field: FieldDef,
  value: unknown,
  style?: FieldViewStyle,
  ratings?: ItemRating[],
  itemId?: string,
  values?: Record<string, unknown>,
  schema?: ListSchema,
): number | null {
  if (style?.formula && values && schema) {
    const n = evalFormula(style.formula, values, schema, {
      ratings,
      itemId,
      currentFieldId: field.id,
    })
    if (n != null) return n
  }
  if (usesItemRatings(field) && ratings && itemId) {
    const all = ratings.filter((r) => r.field_id === field.id && r.item_id === itemId)
    if (!all.length) return null
    return all.reduce((s, r) => s + Number(r.value), 0) / all.length
  }
  if (isPeakSpanSublist(field)) return sublistPeak(field, value)
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function formatNumberBody(n: number, decimals?: number): string {
  if (decimals != null) return n.toFixed(decimals)
  if (Number.isInteger(n)) return String(n)
  return String(Math.round(n * 100) / 100)
}

export function formatNumberText(
  n: number,
  field: FieldDef,
  style?: FieldViewStyle,
): string {
  const mode = style?.numberDisplay ?? 'number'
  const { min, max } = fieldBounds(field)
  const body = formatNumberBody(n, style?.decimals)
  let core = body
  if (mode === 'range') {
    if (min != null && max != null) core = `${body} (${min}–${max})`
    else if (max != null)
      core = `${body} (${msg('viewEditor.boundTo', { n: max })})`
    else if (min != null)
      core = `${body} (${msg('viewEditor.boundFrom', { n: min })})`
  } else if (mode === 'fraction' && max != null) {
    core = `${body}/${max}`
  }
  return `${style?.prefix ?? ''}${core}${style?.suffix ?? ''}`
}

export function displayValue(
  field: FieldDef,
  value: unknown,
  ratings?: ItemRating[],
  itemId?: string,
): string {
  if (usesItemRatings(field) && ratings && itemId) {
    const all = ratings.filter((r) => r.field_id === field.id && r.item_id === itemId)
    if (!all.length) return '—'
    const avg = all.reduce((s, r) => s + Number(r.value), 0) / all.length
    return `${avg.toFixed(1)} (${all.length})`
  }
  if (value == null || value === '') return '—'
  if (field.type === 'relation' || field.type === 'user') {
    if (Array.isArray(value)) {
      const labels = value
        .map((row) => {
          if (
            typeof row === 'object' &&
            row &&
            ('title' in row || 'name' in row)
          ) {
            return String(
              (row as { title?: string; name?: string }).title ??
                (row as { name?: string }).name ??
                '',
            )
          }
          return String(row ?? '')
        })
        .filter(Boolean)
      return labels.join(', ') || '—'
    }
    if (typeof value === 'object' && value) {
      const row = value as { title?: string; name?: string }
      return row.title || row.name || '—'
    }
  }
  if (field.type === 'sublist' && Array.isArray(value)) {
    return summarizeSublist(field, value, ratings, itemId).text
  }
  if (Array.isArray(value)) return value.map(String).join(', ')
  if (typeof value === 'object' && value && 'name' in value) {
    return String((value as { name?: string }).name)
  }
  if (field.type === 'select') {
    return (
      field.config?.options?.find((o) => o.value === String(value))?.label ??
      String(value)
    )
  }
  if (field.type === 'boolean' || field.type === 'checkbox') {
    return value ? msg('fields.yes') : msg('fields.no')
  }
  if (field.type === 'date') return formatDate(String(value))
  if (field.type === 'datetime') return formatDateTime(String(value))
  return String(value)
}

export function displayStyledValue(
  field: FieldDef,
  value: unknown,
  style?: FieldViewStyle,
  ratings?: ItemRating[],
  itemId?: string,
  values?: Record<string, unknown>,
  schema?: ListSchema,
): string {
  const numeric = resolveNumericValue(
    field,
    value,
    style,
    ratings,
    itemId,
    values,
    schema,
  )
  if (numeric != null && (isNumericField(field) || style?.formula)) {
    const asText =
      style?.numberDisplay === 'stars'
        ? formatNumberText(numeric, field, {
            ...style,
            numberDisplay: 'fraction',
          })
        : formatNumberText(numeric, field, style)
    if (usesItemRatings(field) && ratings && itemId) {
      const count = ratings.filter((r) => r.field_id === field.id && r.item_id === itemId).length
      if (count) return `${asText} (${count})`
    }
    return asText
  }
  const base = displayValue(field, value, ratings, itemId)
  if (base === '—' || (!style?.prefix && !style?.suffix)) return base
  return `${style?.prefix ?? ''}${base}${style?.suffix ?? ''}`
}

export interface SublistDisplaySummary {
  text: string
  peak: number | null
  peakLabel: string | null
  start: string | null
  end: string | null
  lines: string[]
  expandable: boolean
}

function sublistLine(
  field: FieldDef,
  row: Record<string, unknown>,
  ratings?: ItemRating[],
  itemId?: string,
): string {
  const sub = field.config?.subfields ?? []
  return sub
    .map((subfield) => {
      const text = displayValue(
        subfieldAsDef(subfield),
        row[subfield.id],
        ratings,
        itemId,
      )
      return text === '—' ? '' : text
    })
    .filter(Boolean)
    .join(' · ')
}

export function summarizeSublist(
  field: FieldDef,
  value: unknown,
  ratings?: ItemRating[],
  itemId?: string,
): SublistDisplaySummary {
  const rows = sublistRows(value)
  const lines = rows
    .map((row) => sublistLine(field, row, ratings, itemId))
    .filter(Boolean)
  const peak = isPeakSpanSublist(field) ? sublistPeak(field, value) : null
  const peakLabel = isPeakSpanSublist(field)
    ? sublistPeakLabel(field, value)
    : null
  const { start, end } = isPeakSpanSublist(field)
    ? sublistTimeBounds(field, value)
    : { start: null, end: null }
  const span = formatTimeSpan(start, end)

  let text = lines.join('; ') || '—'
  if (isPeakSpanSublist(field) && peakLabel) {
    text = span
      ? msg('fields.sublistPeakSpan', { value: peakLabel, span })
      : msg('fields.sublistPeak', { value: peakLabel })
  } else if (lines.length > 1) {
    text = msg('fields.sublistRows', { n: lines.length })
  }

  return {
    text,
    peak,
    peakLabel,
    start,
    end,
    lines,
    expandable:
      lines.length > 1 || Boolean(isPeakSpanSublist(field) && lines.length),
  }
}
