import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  detectLocale,
  detectTheme,
  resolveTheme,
  translate,
  type Locale,
  type ThemePref,
} from '../lib/i18n'

interface PrefsValue {
  locale: Locale
  theme: ThemePref
  setLocale: (locale: Locale) => void
  setTheme: (theme: ThemePref) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const PrefsContext = createContext<PrefsValue | null>(null)

function applyDom(locale: Locale, theme: ThemePref): void {
  document.documentElement.lang = locale === 'en' ? 'en' : 'ru'
  document.documentElement.classList.toggle('dark', resolveTheme(theme) === 'dark')
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale())
  const [theme, setThemeState] = useState<ThemePref>(() => detectTheme())

  useEffect(() => {
    applyDom(locale, theme)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onScheme = () => {
      if (theme === 'system') applyDom(locale, theme)
    }
    mq.addEventListener('change', onScheme)
    return () => mq.removeEventListener('change', onScheme)
  }, [locale, theme])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    localStorage.setItem('chroniqe-lang', next)
  }, [])

  const setTheme = useCallback((next: ThemePref) => {
    setThemeState(next)
    localStorage.setItem('chroniqe-theme', next)
  }, [])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  )

  const value = useMemo<PrefsValue>(
    () => ({ locale, theme, setLocale, setTheme, t }),
    [locale, theme, setLocale, setTheme, t],
  )

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePrefs(): PrefsValue {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs must be used within PrefsProvider')
  return ctx
}
