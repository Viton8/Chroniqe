import type { ListSchema, ViewConfig } from '../types/domain'
import { signedFileUrl } from '../services/api'

export interface FileMeta {
  path: string
  name?: string
  mime?: string
  bucket?: string
}

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i
const urlCache = new Map<string, string | null>()
const inflight = new Map<string, Promise<string | null>>()

export function fileMeta(value: unknown): FileMeta | null {
  if (typeof value === 'string') {
    const path = value.trim()
    if (!path) return null
    if (path.startsWith('http') || path.includes('/')) return { path }
    return null
  }
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const path = typeof v.path === 'string' ? v.path : null
  if (!path) return null
  return {
    path,
    name: typeof v.name === 'string' ? v.name : undefined,
    mime: typeof v.mime === 'string' ? v.mime : typeof v.mime_type === 'string' ? v.mime_type : undefined,
    bucket: typeof v.bucket === 'string' ? v.bucket : undefined,
  }
}

export function isImageFile(meta: FileMeta | null): boolean {
  if (!meta) return false
  if (meta.mime?.startsWith('image/')) return true
  return IMAGE_EXT.test(meta.name ?? meta.path)
}

export function resolveCoverFieldId(schema: ListSchema, view?: ViewConfig): string | undefined {
  const hinted = view?.imageFieldId ?? schema.imageFieldId
  if (hinted && schema.fields.some((f) => f.id === hinted)) return hinted
  return schema.fields.find((f) => f.type === 'image')?.id
}

export function cachedSignedUrl(path: string): Promise<string | null> {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return Promise.resolve(path)
  }
  if (urlCache.has(path)) return Promise.resolve(urlCache.get(path) ?? null)
  const pending = inflight.get(path)
  if (pending) return pending
  const next = signedFileUrl(path).then((url) => {
    urlCache.set(path, url)
    inflight.delete(path)
    return url
  })
  inflight.set(path, next)
  return next
}
