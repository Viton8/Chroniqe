import { ChevronDown } from 'lucide-react'
import type { FieldDef, ItemRating } from '../../types/domain'
import { summarizeSublist } from '../../lib/display'
import { peakColor } from '../../lib/fields'
import { cn } from '../../lib/cn'
import { usePrefs } from '../../context/PrefsContext'

export default function SublistValue({
  field,
  value,
  ratings,
  itemId,
  className,
}: {
  field: FieldDef
  value: unknown
  ratings?: ItemRating[]
  itemId?: string
  className?: string
}) {
  const { t } = usePrefs()
  const summary = summarizeSublist(field, value, ratings, itemId)
  if (!summary.lines.length) {
    return <span className={cn('text-muted', className)}>—</span>
  }
  if (!summary.expandable) {
    return <span className={className}>{summary.text}</span>
  }

  return (
    <details
      className={cn('sublist-details max-w-xs text-left', className)}
      onClick={(event) => event.stopPropagation()}
    >
      <summary className="sublist-summary hover:bg-ink/5 flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-1 py-0.5">
        {summary.peak != null ? (
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ background: peakColor(summary.peak) }}
            aria-hidden
          />
        ) : null}
        <span className="min-w-0 flex-1 truncate text-sm">{summary.text}</span>
        <ChevronDown
          size={14}
          className="sublist-chevron shrink-0 text-muted"
        />
      </summary>
      <ul className="mt-1 space-y-1 border-l border-line pl-2.5 text-xs">
        {summary.lines.map((line, index) => (
          <li key={`${index}-${line}`} className="text-ink/80">
            {line}
          </li>
        ))}
      </ul>
      <span className="sr-only">{t('fields.sublistExpand')}</span>
    </details>
  )
}
