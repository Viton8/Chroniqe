import type { ReactNode } from 'react'
import { Ban, Wand2 } from 'lucide-react'
import { HIGHLIGHT_COLORS } from '../../types/domain'
import { usePrefs } from '../../context/PrefsContext'
import { cn } from '../../lib/cn'
import {
  highlightSwatch,
  isHexHighlight,
  isNamedHighlight,
  type ItemHighlightChoice,
} from '../../lib/highlight'

export default function HighlightPicker({
  value,
  onChange,
  disabled,
}: {
  value: ItemHighlightChoice
  onChange: (choice: ItemHighlightChoice) => void
  disabled?: boolean
}) {
  const { t } = usePrefs()
  const custom = isHexHighlight(value) ? value : '#6d28d9'
  const named = isNamedHighlight(value) ? value : null

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{t('highlight.label')}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Choice
          active={value === 'auto'}
          disabled={disabled}
          label={t('highlight.auto')}
          onClick={() => onChange('auto')}
        >
          <Wand2 size={14} />
        </Choice>
        <Choice
          active={value === 'none'}
          disabled={disabled}
          label={t('highlight.none')}
          onClick={() => onChange('none')}
        >
          <Ban size={14} />
        </Choice>
        {HIGHLIGHT_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            disabled={disabled}
            title={t(`highlight.color.${color}`)}
            aria-label={t(`highlight.color.${color}`)}
            aria-pressed={named === color}
            onClick={() => onChange(color)}
            className={cn(
              'h-7 w-7 rounded-full border border-line',
              named === color && 'ring-2 ring-accent ring-offset-2 ring-offset-paper',
              disabled && 'opacity-50',
            )}
            style={{ background: highlightSwatch(color) }}
          />
        ))}
        <label
          className={cn(
            'relative inline-flex h-7 cursor-pointer items-center gap-1 overflow-hidden rounded-full border px-2 text-[11px]',
            isHexHighlight(value) && !named
              ? 'border-accent bg-accent-soft text-ink'
              : 'border-line text-muted',
            disabled && 'pointer-events-none opacity-50',
          )}
        >
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-full border border-line"
            style={{ background: custom }}
          />
          {t('highlight.custom')}
          <input
            type="color"
            className="absolute inset-0 cursor-pointer opacity-0"
            value={custom}
            disabled={disabled}
            aria-label={t('highlight.custom')}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>
      </div>
    </div>
  )
}

function Choice({
  active,
  disabled,
  label,
  onClick,
  children,
}: {
  active: boolean
  disabled?: boolean
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded-full border px-2 text-[11px]',
        active ? 'border-accent bg-accent-soft text-ink' : 'border-line text-muted',
        disabled && 'opacity-50',
      )}
    >
      {children}
      {label}
    </button>
  )
}
