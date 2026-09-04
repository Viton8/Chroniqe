import { msg } from './i18n'
import type { FieldDef, ItemRow, ListSchema } from '../types/domain'

export function validateField(
  field: FieldDef,
  value: unknown,
): string | null {
  const cfg = field.config ?? {}
  const empty =
    value == null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)

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
): string[] {
  return schema.fields
    .map((field) => validateField(field, values[field.id]))
    .filter((msg): msg is string => Boolean(msg))
}

export function emptyValues(schema: ListSchema): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const field of schema.fields) {
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

export function assertSafeFile(
  file: File,
  opts: { imagesOnly?: boolean; maxMb?: number },
): string | null {
  const maxMb = opts.maxMb ?? (opts.imagesOnly ? 2 : 10)
  if (file.size > maxMb * 1024 * 1024) {
    return msg('fields.fileBig', { n: maxMb })
  }
  const allowed = opts.imagesOnly ? IMAGE_MIMES : ALLOWED_UPLOAD_MIMES
  if (!(allowed as readonly string[]).includes(file.type)) {
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
