import { dateLocale, msg } from './i18n'

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function uid(): string {
  return crypto.randomUUID()
}

export function todayIso(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(dateLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString(dateLocale(), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function titleFromValues(
  values: Record<string, unknown>,
  titleFieldId?: string | string[],
): string {
  const ids = Array.isArray(titleFieldId) ? titleFieldId : titleFieldId ? [titleFieldId] : []
  const parts = ids
    .map((id) => values[id])
    .filter((v) => v != null && v !== '')
    .map(String)
  if (parts.length) return parts.join(' · ')
  const first = Object.values(values).find(
    (v) => typeof v === 'string' && v.trim().length > 0,
  )
  return first ? String(first) : msg('fields.untitled')
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
