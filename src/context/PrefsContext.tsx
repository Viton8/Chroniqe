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
  htmlLang,
  resolveTheme,
  translate,
  type Locale,
  type ThemePref,
} from '../lib/i18n'
import {
  applyPaletteAttr,
  detectPalette,
  PALETTE_STORAGE_KEY,
  type PaletteId,
  type ThemeMode,
} from '../lib/themes'

interface PrefsValue {
  locale: Locale
  theme: ThemePref
  palette: PaletteId
  setLocale: (locale: Locale) => void
  setTheme: (theme: ThemePref) => void
  setPalette: (palette: PaletteId) => void
  applyColorTheme: (palette: PaletteId, mode: ThemeMode) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const PrefsContext = createContext<PrefsValue | null>(null)

function applyDom(locale: Locale, theme: ThemePref, palette: PaletteId): void {
  document.documentElement.lang = htmlLang(locale)
  document.documentElement.classList.toggle('dark', resolveTheme(theme) === 'dark')
  applyPaletteAttr(palette)
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale())
  const [theme, setThemeState] = useState<ThemePref>(() => detectTheme())
  const [palette, setPaletteState] = useState<PaletteId>(() => detectPalette())

  useEffect(() => {
    applyDom(locale, theme, palette)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onScheme = () => {
      if (theme === 'system') applyDom(locale, theme, palette)
    }
    mq.addEventListener('change', onScheme)
    return () => mq.removeEventListener('change', onScheme)
  }, [locale, theme, palette])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    localStorage.setItem('chroniqe-lang', next)
  }, [])

  const setTheme = useCallback((next: ThemePref) => {
    setThemeState(next)
    localStorage.setItem('chroniqe-theme', next)
  }, [])

  const setPalette = useCallback((next: PaletteId) => {
    setPaletteState(next)
    localStorage.setItem(PALETTE_STORAGE_KEY, next)
  }, [])

  const applyColorTheme = useCallback((nextPalette: PaletteId, mode: ThemeMode) => {
    setPaletteState(nextPalette)
    setThemeState(mode)
    localStorage.setItem(PALETTE_STORAGE_KEY, nextPalette)
    localStorage.setItem('chroniqe-theme', mode)
  }, [])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  )

  const value = useMemo<PrefsValue>(
    () => ({ locale, theme, palette, setLocale, setTheme, setPalette, applyColorTheme, t }),
    [locale, theme, palette, setLocale, setTheme, setPalette, applyColorTheme, t],
  )

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePrefs(): PrefsValue {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs must be used within PrefsProvider')
  return ctx
}
