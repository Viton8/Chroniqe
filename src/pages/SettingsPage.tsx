import { Link } from 'react-router-dom'
import Hint from '../components/ui/Hint'
import LanguageSwitch from '../components/ui/LanguageSwitch'
import { usePrefs } from '../context/PrefsContext'
import { cn } from '../lib/cn'
import type { ThemePref } from '../lib/i18n'

export default function SettingsPage() {
  const { t, theme, setTheme, locale } = usePrefs()
  const themes: ThemePref[] = ['light', 'dark', 'system']
  return (
    <div className="max-w-lg">
      <h1 className="font-serif text-3xl">{t('settings.title')}</h1>
      <div className="mt-4 space-y-3">
        <section className="rounded-2xl border border-line bg-paper p-4">
          <p className="text-sm font-medium">{t('settings.appearance')}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <LanguageSwitch />
            <div className="inline-flex items-center rounded-xl bg-bg p-0.5 ring-1 ring-line" role="group" aria-label={t('theme.label')}>
              {themes.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setTheme(code)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-semibold transition',
                    theme === code ? 'bg-ink text-paper' : 'text-muted hover:text-ink',
                  )}
                >
                  {t(`theme.${code}`)}
                </button>
              ))}
            </div>
          </div>
        </section>
        <Hint title={t('settings.files')} example={t('settings.filesEx')} />
        <p className="text-sm text-muted">
          {locale === 'en' ? (
            <>
              Name and avatar live in{' '}
              <Link className="text-accent underline" to="/profile">
                Profile
              </Link>
              . Sharing is configured on each list.
            </>
          ) : (
            <>
              Профиль и аватар — в{' '}
              <Link className="text-accent underline" to="/profile">
                профиле
              </Link>
              . Списки и доступ настраиваются внутри каждого списка.
            </>
          )}
        </p>
        <p className="text-sm text-muted">{t('settings.publicNote')}</p>
      </div>
    </div>
  )
}
