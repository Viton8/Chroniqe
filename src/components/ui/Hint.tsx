import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { cn } from '../../lib/cn'
import { usePrefs } from '../../context/PrefsContext'

export default function Hint({
  title,
  example,
  compact,
  className,
}: {
  title: string
  example?: string
  compact?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(!compact)
  const { t } = usePrefs()

  return (
    <div className={cn('rounded-2xl bg-accent-soft/70 p-3 text-sm text-ink/90', compact && 'p-2', className)}>
      <button
        type="button"
        className="flex w-full items-start gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <HelpCircle size={16} className="mt-0.5 shrink-0 text-accent" />
        <span className="font-medium">{title}</span>
      </button>
      {open && example ? (
        <p className="mt-2 pl-6 text-muted">
          {t('common.example')}: {example}
        </p>
      ) : null}
    </div>
  )
}
