import { Link } from 'react-router-dom'
import hero from '../hero.png'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import LanguageSwitch from '../components/ui/LanguageSwitch'
import ColorPalettePicker from '../components/ui/ColorPalettePicker'
import ThemeSwitch from '../components/ui/ThemeSwitch'

export default function LandingPage() {
  const { user } = useAuth()
  const { t } = usePrefs()
  return (
    <div className="min-h-screen bg-bg">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <span className="font-serif text-2xl">Chroniqe</span>
        <div className="flex items-center gap-2">
          <LanguageSwitch />
          <ThemeSwitch />
          <ColorPalettePicker compact />
          {user ? (
            <Link to="/dashboard" className="rounded-xl bg-ink px-4 py-2 text-sm text-paper">
              {t('nav.toLists')}
            </Link>
          ) : (
            <>
              <Link to="/login" className="rounded-xl px-4 py-2 text-sm hover:bg-ink/5">
                {t('nav.login')}
              </Link>
              <Link to="/register" className="rounded-xl bg-ink px-4 py-2 text-sm text-paper">
                {t('landing.register')}
              </Link>
            </>
          )}
        </div>
      </header>
      <main className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-10 md:grid-cols-2 md:py-20">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-muted">{t('landing.kicker')}</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">{t('landing.title')}</h1>
          <p className="mt-4 max-w-md text-muted">{t('landing.text')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="rounded-2xl bg-accent px-5 py-3 text-sm font-medium text-on-accent">
              {t('landing.start')}
            </Link>
            <Link to="/explore" className="rounded-2xl bg-paper px-5 py-3 text-sm ring-1 ring-line">
              {t('landing.public')}
            </Link>
          </div>
        </div>
        <img src={hero} alt="" className="mx-auto w-full max-w-sm rounded-[2rem] bg-ink p-8" />
      </main>
    </div>
  )
}
