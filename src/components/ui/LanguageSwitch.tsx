import { cn } from '../../lib/cn'
import { usePrefs } from '../../context/PrefsContext'
import type { Locale } from '../../lib/i18n'

export default function LanguageSwitch({ compact }: { compact?: boolean }) {
  const { locale, setLocale, t } = usePrefs()
  const btn = (code: Locale, label: string) => (
    <button
      type="button"
      onClick={() => setLocale(code)}
      aria-pressed={locale === code}
      className={cn(
        'rounded-lg px-2 py-1 text-xs font-semibold tracking-wide transition',
        locale === code ? 'bg-ink text-paper' : 'text-muted hover:text-ink',
      )}
    >
      {label}
    </button>
  )

  return (
    <div
      className={cn('inline-flex items-center rounded-xl bg-paper/80 p-0.5 ring-1 ring-line', compact && 'scale-95')}
      role="group"
      aria-label={t('lang.label')}
    >
      {btn('ru', t('lang.ru'))}
      {btn('en', t('lang.en'))}
    </div>
  )
}
