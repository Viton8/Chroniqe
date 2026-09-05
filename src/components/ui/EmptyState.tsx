import type { ReactNode } from 'react'
import Button from './Button'
import { usePrefs } from '../../context/PrefsContext'
import { cn } from '../../lib/cn'

export default function EmptyState({
  icon,
  title,
  text,
  action,
  compact,
}: {
  icon?: ReactNode
  title: string
  text?: string
  action?: { label: string; onClick: () => void }
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center border border-dashed border-line bg-paper/60 text-center',
        compact ? 'rounded-2xl px-4 py-6' : 'rounded-3xl px-6 py-12',
      )}
    >
      {icon ? <div className={compact ? 'mb-1.5 text-xl' : 'mb-3 text-3xl'}>{icon}</div> : null}
      <h2 className={compact ? 'text-sm font-medium text-muted' : 'font-serif text-2xl'}>{title}</h2>
      {text ? <p className={cn('max-w-md text-sm text-muted', compact ? 'mt-1' : 'mt-2')}>{text}</p> : null}
      {action ? (
        <Button className={compact ? 'mt-3' : 'mt-5'} size={compact ? 'sm' : 'md'} onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  )
}

export function Spinner({ label }: { label?: string }) {
  const { t } = usePrefs()
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted" role="status">
      <svg className="block h-5 w-5 shrink-0 text-accent" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeOpacity="0.22" strokeWidth="2.5" />
        <circle
          className="chroniqe-spinner-arc"
          cx="12"
          cy="12"
          r="8"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-sm">{label ?? t('common.loading')}</span>
    </div>
  )
}
