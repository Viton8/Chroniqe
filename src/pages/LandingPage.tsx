import { Link } from 'react-router-dom'
import { BarChart3, CalendarDays, Command, Filter, Link2, Rows3, Workflow } from 'lucide-react'
import hero from '../hero.png'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import LanguageSwitch from '../components/ui/LanguageSwitch'
import ColorPalettePicker from '../components/ui/ColorPalettePicker'
import ThemeSwitch from '../components/ui/ThemeSwitch'

const FEATURES = [
  ['featFilters', 'featFiltersText', Filter],
  ['featViews', 'featViewsText', CalendarDays],
  ['featBulk', 'featBulkText', Rows3],
  ['featInsights', 'featInsightsText', BarChart3],
  ['featShare', 'featShareText', Link2],
  ['featCommand', 'featCommandText', Command],
  ['featFlow', 'featFlowText', Workflow],
] as const

export default function LandingPage() {
  const { user } = useAuth()
  const { t } = usePrefs()
  return (
    <div className="min-h-screen overflow-x-clip bg-bg">
      <header className="mx-auto max-w-5xl px-4 py-5">
        <div className="flex items-center justify-between gap-3">
          <span className="shrink-0 font-serif text-2xl">Chroniqe</span>
          <div className="hidden min-w-0 items-center justify-end gap-2 sm:flex">
            <LanguageSwitch compact />
            <ThemeSwitch compact />
            <ColorPalettePicker compact />
            {user ? (
              <Link
                to="/dashboard"
                className="rounded-xl bg-ink px-4 py-2 text-sm text-paper transition-opacity hover:opacity-90"
              >
                {t('nav.toLists')}
              </Link>
            ) : (
              <>
                <Link to="/login" className="rounded-xl px-4 py-2 text-sm transition-colors hover:bg-ink/5">
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl bg-ink px-4 py-2 text-sm text-paper transition-opacity hover:opacity-90"
                >
                  {t('landing.register')}
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5 sm:hidden">
          <LanguageSwitch compact />
          <ThemeSwitch compact />
          <ColorPalettePicker compact />
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:hidden">
          {user ? (
            <Link
              to="/dashboard"
              className="rounded-xl bg-ink px-4 py-2 text-center text-sm text-paper transition-opacity hover:opacity-90"
            >
              {t('nav.toLists')}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-xl px-3 py-2 text-center text-sm ring-1 ring-line transition-colors hover:bg-ink/5"
              >
                {t('nav.login')}
              </Link>
              <Link
                to="/register"
                className="rounded-xl bg-ink px-3 py-2 text-center text-sm text-paper transition-opacity hover:opacity-90"
              >
                {t('landing.register')}
              </Link>
            </>
          )}
        </div>
      </header>
      <main className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-10 md:grid-cols-2 md:py-20">
        <div className="min-w-0">
          <p className="text-sm uppercase tracking-[0.2em] text-muted">{t('landing.kicker')}</p>
          <h1 className="mt-3 break-words font-serif text-4xl leading-tight sm:text-5xl">{t('landing.title')}</h1>
          <p className="mt-4 max-w-md text-pretty text-muted">{t('landing.text')}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              to="/register"
              className="rounded-2xl bg-accent px-5 py-3 text-center text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
            >
              {t('landing.start')}
            </Link>
            <Link
              to="/explore"
              className="rounded-2xl bg-paper px-5 py-3 text-center text-sm ring-1 ring-line transition-colors hover:bg-ink/5 hover:ring-accent"
            >
              {t('landing.public')}
            </Link>
          </div>
        </div>
        <img src={hero} alt="" className="mx-auto w-full max-w-sm rounded-[2rem] bg-ink p-8" />
      </main>
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="font-serif text-2xl">{t('landing.featTitle')}</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([title, text, Icon]) => (
            <article
              key={title}
              className="rounded-2xl border border-line bg-paper p-5 shadow-lift transition-colors hover:border-accent"
            >
              <Icon size={18} className="text-accent" />
              <h3 className="mt-3 font-medium">{t(`landing.${title}`)}</h3>
              <p className="mt-1 text-sm text-muted">{t(`landing.${text}`)}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
