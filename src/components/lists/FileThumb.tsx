import { useEffect, useState } from 'react'
import { cachedSignedUrl, fileMeta, isImageFile } from '../../lib/files'
import { cn } from '../../lib/cn'

export default function FileThumb({
  value,
  className,
  alt = '',
}: {
  value: unknown
  className?: string
  alt?: string
}) {
  const meta = fileMeta(value)
  if (!meta) {
    return (
      <div className={cn('flex items-center justify-center bg-accent-soft text-lg text-accent', className)}>
        ·
      </div>
    )
  }
  return <LoadedThumb key={meta.path} meta={meta} className={className} alt={alt} />
}

function LoadedThumb({
  meta,
  className,
  alt,
}: {
  meta: NonNullable<ReturnType<typeof fileMeta>>
  className?: string
  alt: string
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [broken, setBroken] = useState(false)
  const remote = Boolean(meta.path && /^https?:\/\//i.test(meta.path))

  useEffect(() => {
    let cancelled = false
    void cachedSignedUrl(meta.path).then((next) => {
      if (cancelled) return
      setUrl(next)
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [meta.path])

  if (!ready) {
    return <div className={cn('animate-pulse bg-ink/5', className)} />
  }

  if (url && !broken && (isImageFile(meta) || remote)) {
    return (
      <img
        src={url}
        alt={alt}
        className={cn('object-cover', className)}
        onError={() => setBroken(true)}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center bg-accent-soft px-2 text-center text-xs text-muted',
        className,
      )}
    >
      {meta.name ?? '·'}
    </div>
  )
}
