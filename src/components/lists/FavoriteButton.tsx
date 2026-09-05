import { useState } from 'react'
import { Star } from 'lucide-react'
import { isFavorite, toggleFavorite } from '../../lib/favorites'
import { cn } from '../../lib/cn'
import { usePrefs } from '../../context/PrefsContext'

export default function FavoriteButton({
  id,
  onChange,
  className,
}: {
  id: string
  onChange?: (on: boolean) => void
  className?: string
}) {
  const { t } = usePrefs()
  const [on, setOn] = useState(() => isFavorite(id))

  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-xl text-muted hover:bg-ink/5 hover:text-ink',
        on && 'text-amber-500',
        className,
      )}
      aria-pressed={on}
      aria-label={on ? t('common.unpin') : t('common.pin')}
      title={on ? t('common.unpin') : t('common.pin')}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        const next = toggleFavorite(id)
        setOn(next)
        onChange?.(next)
      }}
    >
      <Star size={16} className={on ? 'fill-amber-400 text-amber-400' : undefined} />
    </button>
  )
}
