import { usesItemRatings } from './ratings'
import type { FieldDef, ItemRating, ListSchema } from '../types/domain'

export function formulaToken(field: FieldDef): string {
  if (/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field.key)) return field.key
  const name = field.name.trim()
  if (name && !/[{}\s]/.test(name)) return name
  return field.id
}

export function formulaExample(field: FieldDef): string {
  return `{${formulaToken(field)}} * 0.9`
}

function fieldNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'boolean') return value ? 1 : 0
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export interface FormulaCtx {
  ratings?: ItemRating[]
  itemId?: string
  currentFieldId?: string
}

function findField(token: string, schema: ListSchema): FieldDef | undefined {
  const t = token.trim()
  if (!t) return undefined
  const lower = t.toLowerCase()
  return (
    schema.fields.find((f) => f.id === t || f.key === t) ??
    schema.fields.find((f) => f.key.toLowerCase() === lower || f.name.trim().toLowerCase() === lower)
  )
}

function rawFieldNumber(
  field: FieldDef,
  values: Record<string, unknown>,
  ctx?: FormulaCtx,
): number | null {
  if (usesItemRatings(field) && ctx?.ratings && ctx.itemId) {
    const all = ctx.ratings.filter((r) => r.field_id === field.id && r.item_id === ctx.itemId)
    if (!all.length) return null
    return all.reduce((s, r) => s + Number(r.value), 0) / all.length
  }
  return fieldNumber(values[field.id] ?? values[field.key])
}

export function numericFieldValue(
  fieldId: string,
  values: Record<string, unknown>,
  schema: ListSchema,
  ctx?: FormulaCtx,
): number | null {
  const field = findField(fieldId, schema)
  if (!field) return null
  return rawFieldNumber(field, values, ctx)
}

function evalArithmetic(input: string): number | null {
  const expr = input.replace(/\s+/g, '')
  if (!expr || !/^[-+*/().\d]+$/.test(expr)) return null
  let i = 0

  const parseExpression = (): number => {
    let v = parseTerm()
    while (expr[i] === '+' || expr[i] === '-') {
      const op = expr[i++]
      const r = parseTerm()
      v = op === '+' ? v + r : v - r
    }
    return v
  }

  const parseTerm = (): number => {
    let v = parseFactor()
    while (expr[i] === '*' || expr[i] === '/') {
      const op = expr[i++]
      const r = parseFactor()
      v = op === '*' ? v * r : r === 0 ? NaN : v / r
    }
    return v
  }

  const parseFactor = (): number => {
    if (expr[i] === '+') {
      i += 1
      return parseFactor()
    }
    if (expr[i] === '-') {
      i += 1
      return -parseFactor()
    }
    if (expr[i] === '(') {
      i += 1
      const v = parseExpression()
      if (expr[i] === ')') i += 1
      return v
    }
    const m = expr.slice(i).match(/^\d*\.?\d+/)
    if (!m) return NaN
    i += m[0].length
    return Number(m[0])
  }

  const value = parseExpression()
  if (i !== expr.length || !Number.isFinite(value)) return null
  return value
}

export function evalFormula(
  formula: string,
  values: Record<string, unknown>,
  schema: ListSchema,
  ctx?: FormulaCtx,
): number | null {
  let src = formula.trim()
  if (!src) return null

  const current = ctx?.currentFieldId ? schema.fields.find((f) => f.id === ctx.currentFieldId) : undefined
  if (/^[*/]/.test(src) && current) {
    src = `{${formulaToken(current)}} ${src}`
  }

  const missing = { n: false }
  let replaced = src.replace(/\{([^}]+)\}/g, (_, token: string) => {
    const name = String(token).trim()
    if (name === 'this' || name === '.' || (current && name === formulaToken(current))) {
      const n = current ? rawFieldNumber(current, values, ctx) : null
      if (n == null) {
        missing.n = true
        return 'NaN'
      }
      return String(n)
    }
    const n = numericFieldValue(name, values, schema, ctx)
    if (n == null) {
      missing.n = true
      return 'NaN'
    }
    return String(n)
  })

  if (missing.n) return null

  const leftovers = [...schema.fields].sort((a, b) => formulaToken(b).length - formulaToken(a).length)
  for (const field of leftovers) {
    const token = formulaToken(field)
    if (!token || !/^[a-zA-Z0-9_\u0400-\u04FF-]+$/.test(token)) continue
    const re = new RegExp(`(?<![\\w\\u0400-\\u04FF])${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w\\u0400-\\u04FF])`, 'g')
    if (!re.test(replaced)) {
      re.lastIndex = 0
      continue
    }
    re.lastIndex = 0
    const n = rawFieldNumber(field, values, ctx)
    if (n == null) return null
    replaced = replaced.replace(re, String(n))
  }

  return evalArithmetic(replaced)
}
