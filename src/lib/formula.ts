import type { FieldDef, ListSchema } from '../types/domain'

const SAFE = /^[\d.\s+\-*/()]+$/

function fieldNumber(field: FieldDef, value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'boolean') return value ? 1 : 0
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function numericFieldValue(
  fieldId: string,
  values: Record<string, unknown>,
  schema: ListSchema,
): number | null {
  const field = schema.fields.find((f) => f.id === fieldId || f.key === fieldId)
  if (!field) return null
  return fieldNumber(field, values[field.id] ?? values[field.key])
}

export function evalFormula(
  formula: string,
  values: Record<string, unknown>,
  schema: ListSchema,
): number | null {
  const src = formula.trim()
  if (!src) return null
  const replaced = src.replace(/\{([a-zA-Z0-9_-]+)\}/g, (_, token: string) => {
    const n = numericFieldValue(token, values, schema)
    return n == null ? 'NaN' : String(n)
  })
  if (!SAFE.test(replaced) || replaced.includes('NaN')) return null
  try {
    const result = Function(`"use strict"; return (${replaced})`)() as unknown
    return typeof result === 'number' && Number.isFinite(result) ? result : null
  } catch {
    return null
  }
}
