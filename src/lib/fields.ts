import { parseWallOrInstant } from './cn'
import {
  FIELD_TYPES,
  type FieldDef,
  type FieldType,
  type SublistField,
} from '../types/domain'

export const NESTED_FIELD_TYPES = FIELD_TYPES.filter(
  (type): type is FieldType => type !== 'sublist' && type !== 'multi_rating',
)

export function subfieldAsDef(field: SublistField): FieldDef {
  return {
    id: field.id,
    key: field.key,
    name: field.name,
    type: field.type,
    required: field.required,
    config: field.config,
  }
}

export function emptySublistRow(
  subfields: SublistField[],
): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const field of subfields) {
    const fallback = field.config?.defaultValue
    if (fallback !== undefined && fallback !== null && fallback !== '') {
      values[field.id] = Array.isArray(fallback) ? [...fallback] : fallback
      continue
    }
    if (field.type === 'multiselect' || field.type === 'tags')
      values[field.id] = []
    else if (field.type === 'boolean' || field.type === 'checkbox')
      values[field.id] = false
  }
  return values
}

export function sublistRows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (row): row is Record<string, unknown> =>
      Boolean(row) && typeof row === 'object' && !Array.isArray(row),
  )
}

export function isPeakSpanSublist(field: FieldDef): boolean {
  return (
    field.type === 'sublist' &&
    field.config?.sublistSummary?.mode === 'peak_span'
  )
}

export function coerceFieldNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'boolean') return value ? 1 : 0
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function summarySubfield(
  field: FieldDef,
  id?: string,
): SublistField | undefined {
  if (!id) return undefined
  return field.config?.subfields?.find((row) => row.id === id || row.key === id)
}

export function sublistPeak(field: FieldDef, value: unknown): number | null {
  const valueField = summarySubfield(
    field,
    field.config?.sublistSummary?.valueFieldId,
  )
  if (!valueField) return null
  let peak: number | null = null
  for (const row of sublistRows(value)) {
    const n = coerceFieldNumber(row[valueField.id] ?? row[valueField.key])
    if (n == null) continue
    peak = peak == null ? n : Math.max(peak, n)
  }
  return peak
}

function rowTime(
  row: Record<string, unknown>,
  subfield?: SublistField,
): string | null {
  if (!subfield) return null
  const raw = row[subfield.id] ?? row[subfield.key]
  if (raw == null || raw === '') return null
  const text = String(raw)
  return parseWallOrInstant(text) ? text : null
}

export function sublistTimeBounds(
  field: FieldDef,
  value: unknown,
): { start: string | null; end: string | null } {
  const summary = field.config?.sublistSummary
  const startField = summarySubfield(field, summary?.startFieldId)
  const endField = summarySubfield(field, summary?.endFieldId) ?? startField
  let start: string | null = null
  let end: string | null = null
  for (const row of sublistRows(value)) {
    const from = rowTime(row, startField)
    const until = rowTime(row, endField) ?? from
    if (from && (!start || from < start)) start = from
    if (until && (!end || until > end)) end = until
  }
  return { start, end }
}

export function optionForValue(field: FieldDef, value: unknown) {
  if (value == null || value === '') return undefined
  return field.config?.options?.find((option) => option.value === String(value))
}

export function sublistPeakLabel(
  field: FieldDef,
  value: unknown,
): string | null {
  const peak = sublistPeak(field, value)
  if (peak == null) return null
  const valueField = summarySubfield(
    field,
    field.config?.sublistSummary?.valueFieldId,
  )
  if (!valueField) return String(peak)
  const match = sublistRows(value).find((row) => {
    const n = coerceFieldNumber(row[valueField.id] ?? row[valueField.key])
    return n === peak
  })
  const raw = match ? (match[valueField.id] ?? match[valueField.key]) : peak
  return optionForValue(subfieldAsDef(valueField), raw)?.label ?? String(raw)
}

export function peakColor(n: number): string {
  if (n <= 0) return '#6e6578'
  if (n <= 3) return '#0f766e'
  if (n <= 6) return '#b45309'
  if (n <= 8) return '#c2410c'
  return '#be123c'
}
