const KEY = 'chroniqe-fav-lists'

export function readFavorites(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function writeFavorites(ids: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...new Set(ids)]))
  } catch {
    /* ignore quota / private mode */
  }
}

export function isFavorite(id: string): boolean {
  return readFavorites().includes(id)
}

export function toggleFavorite(id: string): boolean {
  const current = readFavorites()
  const next = current.includes(id) ? current.filter((value) => value !== id) : [id, ...current]
  writeFavorites(next)
  window.dispatchEvent(new Event('chroniqe-favorites'))
  return next.includes(id)
}
