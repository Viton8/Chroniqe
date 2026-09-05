import { msg } from './i18n'
import type { FieldDef, ItemRow, ListSchema } from '../types/domain'

export function isEmptyValue(value: unknown): boolean {
  return value == null || value === '' || (Array.isArray(value) && value.length === 0)
}

export function validateField(
  field: FieldDef,
  value: unknown,
): string | null {
  const cfg = field.config ?? {}
  const empty = isEmptyValue(value)

  if (field.required && empty) {
    return msg('fields.required', { name: field.name })
  }
  if (empty) return null

  switch (field.type) {
    case 'text':
    case 'textarea':
    case 'email':
    case 'url': {
      const s = String(value)
      if (cfg.minLength != null && s.length < cfg.minLength) {
        return msg('fields.minChars', { n: cfg.minLength })
      }
      if (cfg.maxLength != null && s.length > cfg.maxLength) {
        return msg('fields.maxChars', { n: cfg.maxLength })
      }
      if (cfg.pattern) {
        try {
          if (!new RegExp(cfg.pattern).test(s)) {
            return msg('fields.pattern')
          }
        } catch {
          /* ignore bad pattern */
        }
      }
      if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
        return msg('fields.email')
      }
      if (field.type === 'url') {
        try {
          const u = new URL(s)
          if (!['http:', 'https:'].includes(u.protocol)) {
            return msg('fields.urlHttp')
          }
        } catch {
          return msg('fields.urlBad')
        }
      }
      break
    }
    case 'number':
    case 'integer':
    case 'rating': {
      const n = Number(value)
      if (!Number.isFinite(n)) return msg('fields.number')
      if (field.type === 'integer' && !Number.isInteger(n)) {
        return msg('fields.integer')
      }
      if (cfg.min != null && n < cfg.min) return msg('fields.min', { n: cfg.min })
      if (cfg.max != null && n > cfg.max) return msg('fields.max', { n: cfg.max })
      if (field.type === 'rating') {
        const max = cfg.ratingMax ?? cfg.max ?? 10
        if (n < 1 || n > max) return msg('fields.rating', { n: max })
      }
      break
    }
    case 'select': {
      const allowed = (cfg.options ?? []).map((o) => o.value)
      if (allowed.length && !allowed.includes(String(value))) {
        return msg('fields.select')
      }
      break
    }
    case 'multiselect':
    case 'tags': {
      if (!Array.isArray(value)) return msg('fields.list')
      break
    }
    case 'sublist': {
      if (!Array.isArray(value)) return msg('fields.nested')
      break
    }
    default:
      break
  }
  return null
}

export function validateItem(
  schema: ListSchema,
  values: Record<string, unknown>,
  ctx?: { items?: ItemRow[]; excludeId?: string },
): string[] {
  const fieldErrors = schema.fields
    .map((field) => validateField(field, values[field.id]))
    .filter((message): message is string => Boolean(message))
  if (!ctx?.items) return fieldErrors
  const uniqueErrors = schema.fields
    .filter((field) => field.unique)
    .flatMap((field) => {
      const raw = values[field.id]
      if (raw == null || raw === '') return []
      const key = uniqueKey(raw)
      const clash = ctx.items!.some(
        (row) => row.id !== ctx.excludeId && uniqueKey(row.values[field.id]) === key,
      )
      return clash ? [msg('fields.unique', { name: field.name })] : []
    })
  return [...fieldErrors, ...uniqueErrors]
}

function uniqueKey(value: unknown): string {
  if (Array.isArray(value)) return [...value].map(String).sort().join('\0')
  return String(value).trim().toLowerCase()
}

function cloneDefault(value: unknown): unknown {
  if (Array.isArray(value)) return [...value]
  if (value && typeof value === 'object') return { ...(value as Record<string, unknown>) }
  return value
}

export function emptyValues(schema: ListSchema): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const field of schema.fields) {
    const fallback = field.config?.defaultValue
    if (fallback !== undefined && fallback !== null && fallback !== '') {
      values[field.id] = cloneDefault(fallback)
      continue
    }
    if (field.type === 'multiselect' || field.type === 'tags' || field.type === 'sublist') {
      values[field.id] = []
    } else if (field.type === 'boolean' || field.type === 'checkbox') {
      values[field.id] = false
    }
  }
  return values
}

export function itemMatchesQuery(item: ItemRow, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const blob = JSON.stringify(item.values).toLowerCase()
  return blob.includes(q)
}

export const ALLOWED_UPLOAD_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/csv',
  'application/json',
  'text/plain',
] as const

export const IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const

const EXT_MIME: Record<string, string> = {
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  pdf: 'application/pdf',
  csv: 'text/csv',
  json: 'application/json',
  txt: 'text/plain',
}

export function fileMime(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXT_MIME[ext] ?? file.type
}

export function assertSafeFile(
  file: File,
  opts: { imagesOnly?: boolean; maxMb?: number },
): string | null {
  const maxMb = opts.maxMb ?? (opts.imagesOnly ? 2 : 10)
  if (file.size > maxMb * 1024 * 1024) {
    return msg('fields.fileBig', { n: maxMb })
  }
  const allowed = opts.imagesOnly ? IMAGE_MIMES : ALLOWED_UPLOAD_MIMES
  if (!(allowed as readonly string[]).includes(fileMime(file))) {
    return msg('fields.fileType')
  }
  const name = file.name.toLowerCase()
  if (
    name.endsWith('.svg') ||
    name.endsWith('.html') ||
    name.endsWith('.htm') ||
    name.endsWith('.js') ||
    name.endsWith('.exe')
  ) {
    return msg('fields.fileType')
  }
  return null
}
