import type { ReactNode } from 'react'
import Button from './Button'
import { usePrefs } from '../../context/PrefsContext'

export default function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode
  title: string
  text: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line bg-paper/60 px-6 py-12 text-center">
      <div className="mb-3 text-3xl">{icon}</div>
      <h2 className="font-serif text-2xl">{title}</h2>
      {text ? <p className="mt-2 max-w-md text-sm text-muted">{text}</p> : null}
      {action ? (
        <Button className="mt-5" onClick={action.onClick}>
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
