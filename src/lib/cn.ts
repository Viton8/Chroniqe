import { dateLocale, msg } from './i18n'

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function uid(): string {
  return crypto.randomUUID()
}

const CIVIL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const WALL_DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/

export function hasTimeZoneOffset(raw: string): boolean {
  if (/Z$/i.test(raw)) return true
  return /[T\s][\d:.]+[+-]\d{2}(?::\d{2})?$/.test(raw)
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function todayIso(date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** UTC instant for system columns (`created_at`, `checked_at`). */
export function nowIso(): string {
  return new Date().toISOString()
}

/** Author's wall clock, same shape as `<input type="datetime-local">`. */
export function nowLocalIso(date = new Date()): string {
  return `${todayIso(date)}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

export function parseWallOrInstant(value: string): Date | null {
  if (hasTimeZoneOffset(value)) {
    const instant = new Date(value)
    return Number.isNaN(instant.getTime()) ? null : instant
  }
  const civil = CIVIL_DATE_RE.exec(value)
  if (civil) {
    return new Date(Number(civil[1]), Number(civil[2]) - 1, Number(civil[3]))
  }
  const wall = WALL_DATETIME_RE.exec(value)
  if (wall) {
    return new Date(
      Number(wall[1]),
      Number(wall[2]) - 1,
      Number(wall[3]),
      Number(wall[4]),
      Number(wall[5]),
      wall[6] ? Number(wall[6]) : 0,
    )
  }
  const fallback = new Date(value)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

/** Civil YYYY-MM-DD. Wall-clock datetimes keep the author's day; instants use the viewer's local day. */
export function civilDateFromValue(value: unknown): string | null {
  if (value == null || value === '') return null
  const raw = String(value).trim()
  if (!raw) return null
  if (!hasTimeZoneOffset(raw)) {
    if (CIVIL_DATE_RE.test(raw)) return raw
    if (WALL_DATETIME_RE.test(raw)) return raw.slice(0, 10)
  }
  const parsed = parseWallOrInstant(raw)
  return parsed ? todayIso(parsed) : null
}

export function asDateInputValue(value: unknown): string {
  return civilDateFromValue(value) ?? ''
}

export function asDatetimeInputValue(value: unknown): string {
  if (value == null || value === '') return ''
  const raw = String(value).trim()
  if (!raw) return ''
  if (!hasTimeZoneOffset(raw) && WALL_DATETIME_RE.test(raw))
    return raw.slice(0, 16)
  if (!hasTimeZoneOffset(raw) && CIVIL_DATE_RE.test(raw)) return `${raw}T00:00`
  const parsed = parseWallOrInstant(raw)
  return parsed ? nowLocalIso(parsed) : raw.slice(0, 16)
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = parseWallOrInstant(value)
  if (!d) return value
  return d.toLocaleDateString(dateLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = parseWallOrInstant(value)
  if (!d) return value
  return d.toLocaleString(dateLocale(), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatClock(value: string | null | undefined): string {
  if (!value) return '—'
  const d = parseWallOrInstant(value)
  if (!d) return value
  return d.toLocaleTimeString(dateLocale(), {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTimeSpan(
  start?: string | null,
  end?: string | null,
): string {
  if (!start && !end) return ''
  if (start && end) {
    if (civilDateFromValue(start) === civilDateFromValue(end)) {
      return `${formatClock(start)}–${formatClock(end)}`
    }
    return `${formatDateTime(start)} – ${formatDateTime(end)}`
  }
  return formatDateTime(start || end)
}

export function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = parseWallOrInstant(value)
  if (!d) return value
  const diffSec = Math.round((d.getTime() - Date.now()) / 1000)
  const abs = Math.abs(diffSec)
  const rtf = new Intl.RelativeTimeFormat(dateLocale(), { numeric: 'auto' })
  if (abs < 60) return rtf.format(diffSec, 'second')
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour')
  if (abs < 86400 * 7) return rtf.format(Math.round(diffSec / 86400), 'day')
  return formatDateTime(value)
}

function looksLikeDateTime(value: string): boolean {
  return (
    CIVIL_DATE_RE.test(value) ||
    WALL_DATETIME_RE.test(value) ||
    hasTimeZoneOffset(value)
  )
}

function valueLabel(value: unknown): string {
  if (value == null || value === '') return ''
  if (typeof value === 'string') {
    if (CIVIL_DATE_RE.test(value)) return formatDate(value)
    if (looksLikeDateTime(value)) return formatDateTime(value)
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value)
  if (Array.isArray(value))
    return value.map(valueLabel).filter(Boolean).join(', ')
  if (typeof value === 'object') {
    const row = value as { title?: unknown; name?: unknown; username?: unknown }
    if (row.title) return String(row.title)
    if (row.name) return String(row.name)
    if (row.username) return `@${String(row.username)}`
  }
  return ''
}

export function titleFromValues(
  values: Record<string, unknown>,
  titleFieldId?: string | string[],
): string {
  const ids = Array.isArray(titleFieldId)
    ? titleFieldId
    : titleFieldId
      ? [titleFieldId]
      : []
  const parts = ids.map((id) => valueLabel(values[id])).filter(Boolean)
  if (parts.length) return parts.join(' · ')
  const first = Object.values(values)
    .map(valueLabel)
    .find((v) => v.trim().length > 0)
  return first || msg('fields.untitled')
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /Mac|iPhone|iPad|iPod/.test(navigator.platform) ||
    /Mac OS X/.test(navigator.userAgent)
  )
}
