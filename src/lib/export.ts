import type { FieldDef, ItemRow, ListSchema, ListSettings, ViewConfig } from '../types/domain'
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
  settings?: ListSettings
  view_config?: ViewConfig
  items: Array<{ values: Record<string, unknown>; is_checked?: boolean; position?: number }>
} {
  const data = JSON.parse(text) as {
    schema?: ListSchema
    settings?: ListSettings
    view_config?: ViewConfig
    list?: { schema?: ListSchema; settings?: ListSettings; view_config?: ViewConfig }
    items?: Array<
      | { values?: Record<string, unknown>; is_checked?: boolean; position?: number }
      | Record<string, unknown>
    >
  }
  const schema = data.schema ?? data.list?.schema
  const settings = data.settings ?? data.list?.settings
  const view_config = data.view_config ?? data.list?.view_config
  const items: Array<{ values: Record<string, unknown>; is_checked?: boolean; position?: number }> = (
    data.items ?? []
  ).map((raw) => {
    if (raw && typeof raw === 'object' && 'values' in raw && raw.values) {
      const row = raw as { values: Record<string, unknown>; is_checked?: boolean; position?: number }
      return {
        values: row.values,
        is_checked: Boolean(row.is_checked),
        position: typeof row.position === 'number' ? row.position : undefined,
      }
    }
    return { values: raw as Record<string, unknown> }
  })
  return { schema, settings, view_config, items }
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

export function mappingFromCsvHeader(header: string[], fields: FieldDef[]): Record<number, string> {
  const mapping: Record<number, string> = {}
  const used = new Set<string>()
  const byName = new Map(fields.map((f) => [f.name.trim().toLowerCase(), f]))
  const byKey = new Map(fields.map((f) => [f.key.trim().toLowerCase(), f]))
  const byId = new Map(fields.map((f) => [f.id.toLowerCase(), f]))

  header.forEach((raw, i) => {
    const name = raw.trim().toLowerCase()
    if (name === 'id' || name === 'checked') return
    const field = byName.get(name) ?? byKey.get(name) ?? byId.get(name)
    if (field && !used.has(field.id)) {
      mapping[i] = field.id
      used.add(field.id)
    }
  })

  if (!Object.keys(mapping).length) {
    const first = header[0]?.trim().toLowerCase()
    const second = header[1]?.trim().toLowerCase()
    const offset = first === 'id' ? (second === 'checked' ? 2 : 1) : 0
    fields.forEach((f, i) => {
      mapping[i + offset] = f.id
    })
  }
  return mapping
}

export function mapCsvToItems(
  rows: string[][],
  fields: FieldDef[],
  mapping?: Record<number, string>,
): Array<{ values: Record<string, unknown>; is_checked?: boolean }> {
  const [header, ...body] = rows
  if (!header) return []
  const resolved = mapping ?? mappingFromCsvHeader(header, fields)
  const checkedCol = header.findIndex((h) => h.trim().toLowerCase() === 'checked')
  return body.map((cols) => {
    const values: Record<string, unknown> = {}
    for (const [colStr, fieldId] of Object.entries(resolved)) {
      const col = Number(colStr)
      const field = fields.find((f) => f.id === fieldId)
      if (!field) continue
      values[fieldId] = coerce(field, cols[col] ?? '')
    }
    const is_checked =
      checkedCol >= 0
        ? ['1', 'true', 'yes', 'да'].includes((cols[checkedCol] ?? '').trim().toLowerCase())
        : undefined
    return { values, is_checked }
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
