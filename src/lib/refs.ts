export function refId(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value && 'id' in value) return String((value as { id: unknown }).id ?? '')
  return ''
}

export function refLabel(value: unknown): string {
  if (value == null || value === '') return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(refLabel).filter(Boolean).join(', ')
  if (typeof value === 'object') {
    const row = value as { title?: unknown; name?: unknown; username?: unknown }
    if (row.title) return String(row.title)
    if (row.name) return String(row.name)
    if (row.username) return `@${String(row.username)}`
  }
  return ''
}

export function refIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(refId).filter(Boolean)
  const id = refId(value)
  return id ? [id] : []
}
