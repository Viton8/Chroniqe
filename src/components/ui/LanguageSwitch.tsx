import { LOCALES, isLocale } from '../../lib/i18n'
import { cn } from '../../lib/cn'
import { usePrefs } from '../../context/PrefsContext'

export default function LanguageSwitch({ compact }: { compact?: boolean }) {
  const { locale, setLocale, t } = usePrefs()

  return (
    <label className="inline-flex items-center">
      <span className="sr-only">{t('lang.label')}</span>
      <select
        value={locale}
        aria-label={t('lang.label')}
        onChange={(event) => {
          if (isLocale(event.target.value)) setLocale(event.target.value)
        }}
        className={cn(
          'cursor-pointer rounded-xl bg-paper/80 py-1.5 text-xs font-semibold text-ink ring-1 ring-line',
          compact ? 'max-w-[4.25rem] px-1.5' : 'max-w-[9.5rem] px-2',
        )}
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {compact ? code.toUpperCase() : t(`lang.${code}`)}
          </option>
        ))}
      </select>
    </label>
  )
}
