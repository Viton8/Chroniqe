import type { FieldDef, FieldViewStyle, ItemRating, ListSchema } from '../types/domain'
import { evalFormula } from './formula'
import { msg } from './i18n'

export function displayValue(
  field: FieldDef,
  value: unknown,
  ratings?: ItemRating[],
  itemId?: string,
): string {
  if (field.type === 'multi_rating' && ratings && itemId) {
    const all = ratings.filter((r) => r.field_id === field.id && r.item_id === itemId)
    if (!all.length) return '—'
    const avg = all.reduce((s, r) => s + Number(r.value), 0) / all.length
    return `${avg.toFixed(1)} (${all.length})`
  }
  if (value == null || value === '') return '—'
  if (Array.isArray(value)) return value.map(String).join(', ')
  if (typeof value === 'object' && value && 'name' in value) {
    return String((value as { name?: string }).name)
  }
  if (field.type === 'select') {
    return field.config?.options?.find((o) => o.value === String(value))?.label ?? String(value)
  }
  if (field.type === 'boolean' || field.type === 'checkbox') {
    return value ? msg('fields.yes') : msg('fields.no')
  }
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
  if (style?.formula && values && schema) {
    const n = evalFormula(style.formula, values, schema)
    if (n != null) {
      const text = style.decimals != null ? n.toFixed(style.decimals) : String(n)
      return `${style.prefix ?? ''}${text}${style.suffix ?? ''}`
    }
  }
  const base = displayValue(field, value, ratings, itemId)
  if (base === '—' || (!style?.prefix && !style?.suffix)) return base
  return `${style?.prefix ?? ''}${base}${style?.suffix ?? ''}`
}
