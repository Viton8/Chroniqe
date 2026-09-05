import { useState } from 'react'
import type { ReactNode } from 'react'
import type { FieldDef } from '../../types/domain'
import { fileMeta } from '../../lib/files'
import { cn } from '../../lib/cn'
import FileThumb from './FileThumb'

function httpUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const src = value.trim()
  return /^https?:\/\//i.test(src) ? src : null
}

export function hasCoverVisual(value: unknown): boolean {
  if (fileMeta(value) || httpUrl(value)) return true
  if (value == null || value === '') return false
  if (Array.isArray(value)) return value.length > 0
  return true
}

export default function CoverSlot({
  field,
  value,
  className,
  alt = '',
  fallback,
}: {
  field?: FieldDef
  value: unknown
  className?: string
  alt?: string
  fallback?: ReactNode
}) {
  if (field?.type === 'image' || field?.type === 'file' || fileMeta(value)) {
    return <FileThumb value={value} className={className} alt={alt} />
  }

  const href = httpUrl(value)
  if (href) {
    return <RemoteImage href={href} className={className} alt={alt} fallback={fallback} />
  }

  if (field?.type === 'color' && typeof value === 'string' && value) {
    return <div className={className} style={{ background: value }} aria-label={alt} />
  }

  if (value == null || value === '') {
    return <div className={cn('bg-ink/5', className)} />
  }

  return (
    <div className={cn('flex items-end bg-gradient-to-br from-accent-soft to-ink/5 p-3', className)}>
      <div className="line-clamp-4 min-w-0 font-serif text-base leading-snug text-ink">
        {fallback ?? String(value)}
      </div>
    </div>
  )
}

function RemoteImage({
  href,
  className,
  alt,
  fallback,
}: {
  href: string
  className?: string
  alt: string
  fallback?: ReactNode
}) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className={cn('flex items-end bg-gradient-to-br from-accent-soft to-ink/5 p-3', className)}>
        <span className="line-clamp-4 min-w-0 font-serif text-sm leading-snug text-ink">
          {fallback ?? hostOf(href)}
        </span>
      </div>
    )
  }
  return (
    <img src={href} alt={alt} className={cn('object-cover', className)} onError={() => setFailed(true)} />
  )
}

function hostOf(href: string): string {
  try {
    return new URL(href).host
  } catch {
    return href
  }
}
