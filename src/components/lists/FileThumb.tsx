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
  const [url, setUrl] = useState<string | null>(null)
  const [ready, setReady] = useState(!meta)

  useEffect(() => {
    const path = meta?.path
    if (!path) {
      setUrl(null)
      setReady(true)
      return
    }
    let cancelled = false
    setReady(false)
    void cachedSignedUrl(path).then((next) => {
      if (!cancelled) {
        setUrl(next)
        setReady(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [meta?.path])

  if (!meta) {
    return (
      <div className={cn('flex items-center justify-center bg-accent-soft text-lg text-accent', className)}>
        ·
      </div>
    )
  }

  if (!ready) {
    return <div className={cn('animate-pulse bg-ink/5', className)} />
  }

  if (url && isImageFile(meta)) {
    return <img src={url} alt={alt} className={cn('object-cover', className)} />
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
