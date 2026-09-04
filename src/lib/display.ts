import type { FieldDef, ItemRating } from '../types/domain'
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
