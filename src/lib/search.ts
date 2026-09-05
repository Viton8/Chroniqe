export function textMatch(...parts: Array<string | null | undefined>): (query: string) => boolean {
  const hay = parts.filter(Boolean).join(' ').toLowerCase()
  return (query: string) => {
    const q = query.trim().toLowerCase()
    return !q || hay.includes(q)
  }
}

export function matchesQuery(query: string, ...parts: Array<string | null | undefined>): boolean {
  return textMatch(...parts)(query)
}
