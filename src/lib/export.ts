import type { FieldDef, ItemRow, ListSchema } from '../types/domain'
import { titleFromValues } from './cn'

export function itemsToCsv(schema: ListSchema, items: ItemRow[]): string {
  const fields = schema.fields
  const header = ['id', 'checked', ...fields.map((f) => f.name)]
  const rows = items.map((item) => {
    const cols = [
      item.id,
      item.is_checked ? '1' : '0',
      ...fields.map((f) => csvEscape(stringifyValue(item.values[f.id]))),
    ]
    return cols.join(',')
  })
  return [header.map(csvEscape).join(','), ...rows].join('\n')
}

export function itemsToJson(
  listMeta: { title: string; schema: ListSchema; settings?: unknown; view_config?: unknown },
  items: ItemRow[],
): string {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      list: listMeta,
      items: items.map((item) => ({
        values: item.values,
        is_checked: item.is_checked,
        position: item.position,
      })),
    },
    null,
    2,
  )
}

export function parseImportJson(text: string): {
  schema?: ListSchema
  items: Array<{ values: Record<string, unknown>; is_checked?: boolean }>
} {
  const data = JSON.parse(text) as {
    schema?: ListSchema
    list?: { schema?: ListSchema }
    items?: Array<{ values?: Record<string, unknown>; is_checked?: boolean } | Record<string, unknown>>
  }
  const schema = data.schema ?? data.list?.schema
  const items: Array<{ values: Record<string, unknown>; is_checked?: boolean }> = (
    data.items ?? []
  ).map((raw) => {
    if (raw && typeof raw === 'object' && 'values' in raw && raw.values) {
      return {
        values: raw.values as Record<string, unknown>,
        is_checked: Boolean((raw as { is_checked?: boolean }).is_checked),
      }
    }
    return { values: raw as Record<string, unknown> }
  })
  return { schema, items }
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cur += '"'
        i += 1
      } else if (ch === '"') {
        quoted = false
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      row.push(cur)
      cur = ''
    } else if (ch === '\n') {
      row.push(cur)
      rows.push(row)
      row = []
      cur = ''
    } else if (ch !== '\r') {
      cur += ch
    }
  }
  if (cur.length || row.length) {
    row.push(cur)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0))
}

export function mapCsvToItems(
  rows: string[][],
  fields: FieldDef[],
  mapping: Record<number, string>,
): Array<{ values: Record<string, unknown> }> {
  const [header, ...body] = rows
  if (!header) return []
  return body.map((cols) => {
    const values: Record<string, unknown> = {}
    for (const [colStr, fieldId] of Object.entries(mapping)) {
      const col = Number(colStr)
      const field = fields.find((f) => f.id === fieldId)
      if (!field) continue
      values[fieldId] = coerce(field, cols[col] ?? '')
    }
    return { values }
  })
}

function coerce(field: FieldDef, raw: string): unknown {
  const t = raw.trim()
  if (t === '') return null
  if (field.type === 'number' || field.type === 'integer' || field.type === 'rating') {
    const n = Number(t)
    return Number.isFinite(n) ? n : t
  }
  if (field.type === 'boolean' || field.type === 'checkbox') {
    return ['1', 'true', 'yes', 'да'].includes(t.toLowerCase())
  }
  if (field.type === 'multiselect' || field.type === 'tags') {
    return t.split('|').map((s) => s.trim()).filter(Boolean)
  }
  return t
}

function stringifyValue(value: unknown): string {
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(String).join('|')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`
  return value
}

export function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function previewItemLine(schema: ListSchema, item: ItemRow): string {
  return titleFromValues(item.values, schema.titleFieldId)
}
