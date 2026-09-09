import { uid } from './cn'

const KEY = 'chroniqe-home-layout-v1'
const EVENT = 'chroniqe-home-layout'

export const HOME_FIXED_KINDS = [
  'stats',
  'feed',
  'following',
  'pinned',
  'overdue',
  'upcoming',
  'recent',
  'activity',
] as const

export type HomeFixedKind = (typeof HOME_FIXED_KINDS)[number]
export type HomeBlockKind = HomeFixedKind | 'list'

export interface HomeBlock {
  id: string
  kind: HomeBlockKind
  on: boolean
  listId?: string
  viewId?: string
  limit?: number
}

export interface HomeLayout {
  blocks: HomeBlock[]
}

const FIXED = new Set<string>(HOME_FIXED_KINDS)

export function defaultHomeLayout(): HomeLayout {
  return {
    blocks: HOME_FIXED_KINDS.map((kind) => ({ id: kind, kind, on: true })),
  }
}

export function readHomeLayout(): HomeLayout {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultHomeLayout()
    const parsed = JSON.parse(raw) as Partial<HomeLayout>
    return normalizeHomeLayout(parsed)
  } catch {
    return defaultHomeLayout()
  }
}

export function writeHomeLayout(layout: HomeLayout): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(normalizeHomeLayout(layout)))
  } catch {
    /* ignore quota / private mode */
  }
  window.dispatchEvent(new Event(EVENT))
}

export function subscribeHomeLayout(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export function normalizeHomeLayout(raw: Partial<HomeLayout> | null | undefined): HomeLayout {
  const seenFixed = new Set<string>()
  const blocks: HomeBlock[] = []
  for (const row of raw?.blocks ?? []) {
    if (!row || typeof row !== 'object') continue
    const kind = row.kind
    if (kind === 'list') {
      blocks.push({
        id: String(row.id || uid()),
        kind: 'list',
        on: row.on !== false,
        listId: typeof row.listId === 'string' ? row.listId : undefined,
        viewId: typeof row.viewId === 'string' ? row.viewId : undefined,
        limit: clampLimit(row.limit),
      })
      continue
    }
    if (!FIXED.has(kind) || seenFixed.has(kind)) continue
    seenFixed.add(kind)
    blocks.push({ id: kind, kind, on: row.on !== false })
  }
  for (const kind of HOME_FIXED_KINDS) {
    if (seenFixed.has(kind)) continue
    blocks.push({ id: kind, kind, on: true })
  }
  return { blocks }
}

export function addHomeBlock(layout: HomeLayout, kind: HomeBlockKind, listId?: string): HomeLayout {
  if (kind !== 'list') {
    const existing = layout.blocks.find((row) => row.kind === kind)
    if (existing) {
      return {
        blocks: layout.blocks.map((row) => (row.id === existing.id ? { ...row, on: true } : row)),
      }
    }
    return { blocks: [...layout.blocks, { id: kind, kind, on: true }] }
  }
  return {
    blocks: [
      ...layout.blocks,
      { id: uid(), kind: 'list', on: true, listId, limit: 8 },
    ],
  }
}

export function moveHomeBlock(layout: HomeLayout, id: string, dir: -1 | 1): HomeLayout {
  const index = layout.blocks.findIndex((row) => row.id === id)
  const target = index + dir
  if (index < 0 || target < 0 || target >= layout.blocks.length) return layout
  const next = [...layout.blocks]
  const [row] = next.splice(index, 1)
  next.splice(target, 0, row)
  return { blocks: next }
}

export function patchHomeBlock(layout: HomeLayout, id: string, patch: Partial<HomeBlock>): HomeLayout {
  return {
    blocks: layout.blocks.map((row) => {
      if (row.id !== id) return row
      if (row.kind === 'list') {
        return {
          id: row.id,
          kind: 'list',
          on: patch.on ?? row.on,
          listId: patch.listId !== undefined ? patch.listId || undefined : row.listId,
          viewId: patch.viewId !== undefined ? patch.viewId || undefined : row.viewId,
          limit: patch.limit !== undefined ? clampLimit(patch.limit) : row.limit,
        }
      }
      return { id: row.kind, kind: row.kind, on: patch.on ?? row.on }
    }),
  }
}

export function removeHomeBlock(layout: HomeLayout, id: string): HomeLayout {
  return {
    blocks: layout.blocks.filter((row) => !(row.kind === 'list' && row.id === id)),
  }
}

function clampLimit(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 8
  return Math.min(24, Math.max(4, Math.round(n)))
}
