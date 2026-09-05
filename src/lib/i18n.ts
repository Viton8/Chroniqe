import ru from '../locales/ru.json' with { type: 'json' }
import en from '../locales/en.json' with { type: 'json' }
import pl from '../locales/pl.json' with { type: 'json' }
import es from '../locales/es.json' with { type: 'json' }
import zh from '../locales/zh.json' with { type: 'json' }
import de from '../locales/de.json' with { type: 'json' }
import fr from '../locales/fr.json' with { type: 'json' }
import uk from '../locales/uk.json' with { type: 'json' }
import be from '../locales/be.json' with { type: 'json' }
import it from '../locales/it.json' with { type: 'json' }

export const LOCALES = ['ru', 'en', 'pl', 'es', 'zh', 'de', 'fr', 'uk', 'be', 'it'] as const

export type Locale = (typeof LOCALES)[number]

export const messages = { ru, en, pl, es, zh, de, fr, uk, be, it } satisfies Record<
  Locale,
  typeof ru
>

const DATE_LOCALES: Record<Locale, string> = {
  ru: 'ru-RU',
  en: 'en-US',
  pl: 'pl-PL',
  es: 'es-ES',
  zh: 'zh-CN',
  de: 'de-DE',
  fr: 'fr-FR',
  uk: 'uk-UA',
  be: 'be-BY',
  it: 'it-IT',
}

const HTML_LANG: Record<Locale, string> = {
  ru: 'ru',
  en: 'en',
  pl: 'pl',
  es: 'es',
  zh: 'zh-CN',
  de: 'de',
  fr: 'fr',
  uk: 'uk',
  be: 'be',
  it: 'it',
}

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value)
}

export function htmlLang(locale: Locale): string {
  return HTML_LANG[locale]
}

export type MessageKey = string

type Leaf = string | { [k: string]: Leaf }

function lookup(tree: Leaf, path: string): string | undefined {
  const parts = path.split('.')
  let cur: Leaf = tree
  for (const part of parts) {
    if (typeof cur === 'string' || !(part in cur)) return undefined
    cur = cur[part]
  }
  return typeof cur === 'string' ? cur : undefined
}

export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const catalog = messages[locale] as Leaf
  let text = lookup(catalog, key) ?? lookup(messages.ru as Leaf, key) ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v))
    }
  }
  return text
}

function matchNavigator(tag: string): Locale | undefined {
  const lower = tag.toLowerCase()
  if (lower.startsWith('zh')) return 'zh'
  if (lower.startsWith('uk')) return 'uk'
  if (lower.startsWith('be')) return 'be'
  if (lower.startsWith('pl')) return 'pl'
  if (lower.startsWith('es')) return 'es'
  if (lower.startsWith('de')) return 'de'
  if (lower.startsWith('fr')) return 'fr'
  if (lower.startsWith('it')) return 'it'
  if (lower.startsWith('en')) return 'en'
  if (lower.startsWith('ru')) return 'ru'
  return undefined
}

export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem('chroniqe-lang')
    if (isLocale(saved)) return saved
  } catch {
    /* ignore */
  }
  if (typeof navigator !== 'undefined') {
    const tags = navigator.languages?.length ? navigator.languages : [navigator.language]
    for (const tag of tags) {
      const hit = matchNavigator(tag)
      if (hit) return hit
    }
  }
  return 'ru'
}

export function msg(key: string, vars?: Record<string, string | number>): string {
  return translate(detectLocale(), key, vars)
}

export function dateLocale(): string {
  return DATE_LOCALES[detectLocale()]
}

export type ThemePref = 'light' | 'dark' | 'system'

export function detectTheme(): ThemePref {
  try {
    const saved = localStorage.getItem('chroniqe-theme')
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved
  } catch {
    /* ignore */
  }
  return 'system'
}

export function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return pref
}
