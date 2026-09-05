import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { usePrefs } from '../../context/PrefsContext'
import { resolveTheme } from '../../lib/i18n'
import { namedThemes, palettePreview, type PaletteId, type ThemeMode } from '../../lib/themes'

function ThemeSwatch({
  palette,
  mode,
  selected,
  label,
  compact,
  onSelect,
}: {
  palette: PaletteId
  mode: ThemeMode
  selected: boolean
  label: string
  compact?: boolean
  onSelect: (palette: PaletteId, mode: ThemeMode) => void
}) {
  const colors = palettePreview[palette][mode]
  return (
    <button
      type="button"
      onClick={() => onSelect(palette, mode)}
      aria-pressed={selected}
      aria-label={label}
      title={label}
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border text-left transition',
        selected ? 'border-ink ring-2 ring-ink/15' : 'border-line hover:border-ink/35',
      )}
    >
      <span
        className={cn('relative flex items-end justify-end gap-1 p-2', compact ? 'h-11' : 'h-14')}
        style={{ background: colors.bg }}
      >
        <span
          className={cn('rounded-lg', compact ? 'h-6 w-8' : 'h-7 w-9')}
          style={{ background: colors.paper, boxShadow: `inset 0 0 0 1px ${colors.accent}40` }}
        />
        <span className="mb-0.5 h-2.5 w-2.5 rounded-full" style={{ background: colors.accent }} />
      </span>
      <span className={cn('bg-paper px-2 font-medium text-ink', compact ? 'py-1 text-[10px]' : 'py-1.5 text-xs')}>
        {label}
      </span>
    </button>
  )
}

function ThemeGrid({
  compact,
  onPicked,
}: {
  compact?: boolean
  onPicked?: () => void
}) {
  const { theme, palette, applyColorTheme, t } = usePrefs()
  const resolved = resolveTheme(theme)
  const light = namedThemes.filter((item) => item.mode === 'light')
  const dark = namedThemes.filter((item) => item.mode === 'dark')

  const pick = (nextPalette: PaletteId, mode: ThemeMode) => {
    applyColorTheme(nextPalette, mode)
    onPicked?.()
  }

  const selected = (nextPalette: PaletteId, mode: ThemeMode) =>
    palette === nextPalette && (theme === mode || (theme === 'system' && resolved === mode))

  const section = (title: string, items: typeof light) => (
    <div>
      <p className={cn('font-medium text-muted', compact ? 'mb-1.5 text-[10px]' : 'mb-2 text-xs')}>{title}</p>
      <div className={cn('grid gap-2', compact ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3')}>
        {items.map((item) => (
          <ThemeSwatch
            key={`${item.palette}-${item.mode}`}
            palette={item.palette}
            mode={item.mode}
            selected={selected(item.palette, item.mode)}
            label={t(item.nameKey)}
            compact={compact}
            onSelect={pick}
          />
        ))}
      </div>
    </div>
  )

  return (
    <div className={cn('space-y-3', compact && 'space-y-2.5')}>
      {section(t('theme.lightThemes'), light)}
      {section(t('theme.darkThemes'), dark)}
    </div>
  )
}

export default function ColorPalettePicker({ compact }: { compact?: boolean }) {
  const { t } = usePrefs()

  if (!compact) {
    return (
      <div>
        <p className="mb-3 text-sm font-medium">{t('theme.palette')}</p>
        <ThemeGrid />
      </div>
    )
  }

  return <CompactPaletteMenu />
}

function CompactPaletteMenu() {
  const { t, palette, theme } = usePrefs()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const mode = theme === 'system' ? resolveTheme(theme) : theme
  const preview = palettePreview[palette][mode]

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t('theme.palette')}
        title={t('theme.palette')}
        className="inline-flex items-center rounded-xl bg-paper/80 p-1.5 ring-1 ring-line transition hover:ring-ink/30"
      >
        <span className="relative block h-4 w-4 overflow-hidden rounded-full ring-1 ring-line">
          <span className="absolute inset-0" style={{ background: preview.bg }} />
          <span className="absolute inset-y-0 right-0 w-1/2" style={{ background: preview.accent }} />
        </span>
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label={t('theme.palette')}
          className="chroniqe-panel absolute right-0 z-50 mt-2 max-h-[min(28rem,70vh)] w-[min(17.5rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-line bg-paper p-3 shadow-lift"
        >
          <ThemeGrid compact onPicked={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  )
}
