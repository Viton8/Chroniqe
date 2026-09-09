import type { CSSProperties } from 'react'
import type {
  FieldDef,
  HighlightColor,
  HighlightCondition,
  HighlightMatch,
  HighlightOp,
  HighlightRule,
  ItemRating,
  ItemRow,
  ListSchema,
} from '../types/domain'
import { HIGHLIGHT_COLORS } from '../types/domain'
import { itemDateIso, itemScore } from './filters'
import { usesItemRatings } from './ratings'
import { isEmptyValue } from './validation'

export const ITEM_HIGHLIGHT_KEY = '__highlight'
export const HIGHLIGHT_CHECKED_ID = '_checked'

const HEX_RE = /^#[0-9a-fA-F]{6}$/
const NAMED = new Set<string>(HIGHLIGHT_COLORS)

export type ItemHighlightChoice = 'auto' | 'none' | string

export function isNamedHighlight(value: string): value is HighlightColor {
  return NAMED.has(value)
}

export function isHexHighlight(value: string): boolean {
  return HEX_RE.test(value)
}

export function normalizeHighlightColor(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const raw = value.trim()
  if (!raw) return null
  if (isNamedHighlight(raw) || isHexHighlight(raw)) return raw
  return null
}

export function readHighlightChoice(values: Record<string, unknown> | undefined): ItemHighlightChoice {
  if (!values || !(ITEM_HIGHLIGHT_KEY in values)) return 'auto'
  const raw = values[ITEM_HIGHLIGHT_KEY]
  if (raw == null || raw === '') return 'none'
  return String(raw)
}

export function writeHighlightChoice(
  values: Record<string, unknown>,
  choice: ItemHighlightChoice,
): Record<string, unknown> {
  const next = { ...values }
  if (choice === 'auto') delete next[ITEM_HIGHLIGHT_KEY]
  else if (choice === 'none') next[ITEM_HIGHLIGHT_KEY] = ''
  else next[ITEM_HIGHLIGHT_KEY] = choice
  return next
}

export function resolveItemHighlight(
  item: ItemRow,
  rules: HighlightRule[] | undefined,
  schema: ListSchema,
  ratings: ItemRating[],
): string | null {
  const choice = readHighlightChoice(item.values)
  if (choice === 'none') return null
  if (choice !== 'auto') return normalizeHighlightColor(choice)
  for (const rule of rules ?? []) {
    if (!rule.conditions.length) continue
    if (ruleMatches(rule, item, schema, ratings)) return normalizeHighlightColor(rule.color)
  }
  return null
}

export function ruleMatches(
  rule: HighlightRule,
  item: ItemRow,
  schema: ListSchema,
  ratings: ItemRating[],
): boolean {
  const match: HighlightMatch = rule.match === 'any' ? 'any' : 'all'
  if (match === 'any') return rule.conditions.some((row) => conditionMatches(row, item, schema, ratings))
  return rule.conditions.every((row) => conditionMatches(row, item, schema, ratings))
}

export function conditionMatches(
  condition: HighlightCondition,
  item: ItemRow,
  schema: ListSchema,
  ratings: ItemRating[],
): boolean {
  const op: HighlightOp = condition.op
  if (condition.fieldId === HIGHLIGHT_CHECKED_ID) {
    const checked = Boolean(item.is_checked)
    if (op === 'empty') return !checked
    if (op === 'not_empty') return checked
    if (op === 'eq') return checked === asBoolean(condition.value)
    if (op === 'neq') return checked !== asBoolean(condition.value)
    return false
  }

  const field = schema.fields.find((row) => row.id === condition.fieldId)
  if (!field) return false
  const current = fieldValue(item, field, ratings)

  if (op === 'empty') return isEmptyComparable(current)
  if (op === 'not_empty') return !isEmptyComparable(current)

  if (isEmptyComparable(current) && op !== 'eq' && op !== 'neq') return false

  if (op === 'contains') return containsValue(current, condition.value)
  if (op === 'eq') return equalsValue(field, current, condition.value)
  if (op === 'neq') return !equalsValue(field, current, condition.value)

  const left = orderedValue(field, current)
  const right = orderedValue(field, condition.value)
  if (left == null || right == null) return false
  if (op === 'gt') return left > right
  if (op === 'gte') return left >= right
  if (op === 'lt') return left < right
  if (op === 'lte') return left <= right
  return false
}

function fieldValue(item: ItemRow, field: FieldDef, ratings: ItemRating[]): unknown {
  if (
    usesItemRatings(field) ||
    field.type === 'rating' ||
    field.type === 'number' ||
    field.type === 'integer'
  ) {
    const score = itemScore(item, field.id, ratings)
    if (score != null) return score
  }
  if (field.type === 'date' || field.type === 'datetime') {
    return itemDateIso(item.values[field.id]) ?? item.values[field.id]
  }
  return item.values[field.id]
}

function isEmptyComparable(value: unknown): boolean {
  return isEmptyValue(value)
}

function asBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  const raw = String(value ?? '').toLowerCase()
  return raw === 'true' || raw === '1' || raw === 'yes'
}

function containsValue(current: unknown, expected: unknown): boolean {
  if (expected == null || expected === '') return false
  const needle = String(expected).toLowerCase()
  if (Array.isArray(current)) return current.some((part) => String(part).toLowerCase().includes(needle))
  return String(current ?? '')
    .toLowerCase()
    .includes(needle)
}

function equalsValue(field: FieldDef, current: unknown, expected: unknown): boolean {
  if (field.type === 'boolean' || field.type === 'checkbox') {
    return Boolean(current) === asBoolean(expected)
  }
  if (Array.isArray(current)) {
    const want = String(expected ?? '')
    return current.map(String).includes(want)
  }
  const left = orderedValue(field, current)
  const right = orderedValue(field, expected)
  if (left != null && right != null) return left === right
  return String(current ?? '').toLowerCase() === String(expected ?? '').toLowerCase()
}

function orderedValue(field: FieldDef, value: unknown): number | string | null {
  if (value == null || value === '') return null
  if (
    field.type === 'number' ||
    field.type === 'integer' ||
    field.type === 'rating' ||
    usesItemRatings(field)
  ) {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  if (field.type === 'date' || field.type === 'datetime') {
    return itemDateIso(value) ?? String(value)
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const n = Number(value)
  if (String(value).trim() !== '' && Number.isFinite(n) && String(value).trim() === String(n)) return n
  return String(value).toLowerCase()
}

export function itemHighlightBind(color: string | null | undefined): {
  className?: string
  style?: CSSProperties
  'data-hl'?: string
} {
  if (!color) return {}
  if (isNamedHighlight(color)) return { className: 'item-hl', 'data-hl': color }
  if (isHexHighlight(color)) return { className: 'item-hl', style: { ['--hl']: color } as CSSProperties }
  return {}
}

export function highlightSwatch(color: string): string {
  if (isNamedHighlight(color)) return NAMED_HEX[color]
  if (isHexHighlight(color)) return color
  return '#64748b'
}

export const NAMED_HEX: Record<HighlightColor, string> = {
  red: '#e11d48',
  orange: '#ea580c',
  yellow: '#ca8a04',
  green: '#16a34a',
  teal: '#0f766e',
  blue: '#2563eb',
  purple: '#7c3aed',
  pink: '#db2777',
  gray: '#64748b',
}

export function emptyHighlightCondition(fieldId: string): HighlightCondition {
  if (fieldId === HIGHLIGHT_CHECKED_ID) return { fieldId, op: 'eq', value: true }
  return { fieldId, op: 'lt', value: 5 }
}

export function emptyHighlightRule(fieldId: string, color: string = 'red'): HighlightRule {
  return {
    id: crypto.randomUUID(),
    color,
    match: 'all',
    conditions: [emptyHighlightCondition(fieldId)],
  }
}

export function ratingBandRules(fieldId: string): HighlightRule[] {
  return [
    {
      id: 'hl-low',
      color: 'red',
      match: 'all',
      conditions: [{ fieldId, op: 'lt', value: 5 }],
    },
    {
      id: 'hl-mid',
      color: 'yellow',
      match: 'all',
      conditions: [
        { fieldId, op: 'gte', value: 5 },
        { fieldId, op: 'lt', value: 7 },
      ],
    },
    {
      id: 'hl-high',
      color: 'green',
      match: 'all',
      conditions: [{ fieldId, op: 'gte', value: 7 }],
    },
  ]
}

export function selectValueRules(
  fieldId: string,
  rows: Array<{ value: string; color: HighlightColor }>,
): HighlightRule[] {
  return rows.map((row) => ({
    id: `hl-${fieldId}-${row.value}`,
    color: row.color,
    match: 'all' as const,
    conditions: [{ fieldId, op: 'eq' as const, value: row.value }],
  }))
}
