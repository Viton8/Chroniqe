import { cn } from '../../lib/cn'

export default function Avatar({
  name,
  url,
  size = 32,
}: {
  name: string
  url?: string | null
  size?: number
}) {
  const letter = (name || '?').slice(0, 1).toUpperCase()
  return url ? (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      className="rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent',
      )}
      style={{ width: size, height: size }}
    >
      {letter}
    </span>
  )
}
