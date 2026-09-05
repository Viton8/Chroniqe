import { LOCALES, isLocale } from '../../lib/i18n'
import { cn } from '../../lib/cn'
import { usePrefs } from '../../context/PrefsContext'

export default function LanguageSwitch({ compact }: { compact?: boolean }) {
  const { locale, setLocale, t } = usePrefs()

  return (
    <label className={cn('inline-flex items-center', compact && 'scale-95')}>
      <span className="sr-only">{t('lang.label')}</span>
      <select
        value={locale}
        aria-label={t('lang.label')}
        onChange={(event) => {
          if (isLocale(event.target.value)) setLocale(event.target.value)
        }}
        className="max-w-[9.5rem] cursor-pointer rounded-xl bg-paper/80 px-2 py-1.5 text-xs font-semibold text-ink ring-1 ring-line"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {t(`lang.${code}`)}
          </option>
        ))}
      </select>
    </label>
  )
}
