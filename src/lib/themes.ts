export const PALETTE_IDS = ['violet', 'ocean', 'forest', 'rose', 'amber', 'slate'] as const

export type PaletteId = (typeof PALETTE_IDS)[number]
export type ThemeMode = 'light' | 'dark'

export const DEFAULT_PALETTE: PaletteId = 'violet'
export const PALETTE_STORAGE_KEY = 'chroniqe-palette'

export interface PalettePreview {
  bg: string
  paper: string
  accent: string
}

export const palettePreview: Record<PaletteId, Record<ThemeMode, PalettePreview>> = {
  violet: {
    light: { bg: '#f3efe6', paper: '#fffcf7', accent: '#6d28d9' },
    dark: { bg: '#14111a', paper: '#1c1826', accent: '#a78bfa' },
  },
  ocean: {
    light: { bg: '#e7eef3', paper: '#f6fbfd', accent: '#0369a1' },
    dark: { bg: '#0c141a', paper: '#131c24', accent: '#7dd3fc' },
  },
  forest: {
    light: { bg: '#e7eee6', paper: '#f6faf4', accent: '#3f6b45' },
    dark: { bg: '#101610', paper: '#171e17', accent: '#86c48a' },
  },
  rose: {
    light: { bg: '#f4ebe8', paper: '#fff8f6', accent: '#be123c' },
    dark: { bg: '#1a1114', paper: '#24181c', accent: '#fb7185' },
  },
  amber: {
    light: { bg: '#f3eee4', paper: '#fffbf3', accent: '#b45309' },
    dark: { bg: '#16130e', paper: '#1f1b14', accent: '#fbbf24' },
  },
  slate: {
    light: { bg: '#eceef1', paper: '#f8f9fb', accent: '#334155' },
    dark: { bg: '#121418', paper: '#1a1d23', accent: '#94a3b8' },
  },
}

export const namedThemes: { palette: PaletteId; mode: ThemeMode; nameKey: string }[] = [
  { palette: 'violet', mode: 'light', nameKey: 'theme.named.parchment' },
  { palette: 'ocean', mode: 'light', nameKey: 'theme.named.mist' },
  { palette: 'forest', mode: 'light', nameKey: 'theme.named.sage' },
  { palette: 'rose', mode: 'light', nameKey: 'theme.named.blush' },
  { palette: 'amber', mode: 'light', nameKey: 'theme.named.sand' },
  { palette: 'slate', mode: 'light', nameKey: 'theme.named.snow' },
  { palette: 'violet', mode: 'dark', nameKey: 'theme.named.ink' },
  { palette: 'ocean', mode: 'dark', nameKey: 'theme.named.deep' },
  { palette: 'forest', mode: 'dark', nameKey: 'theme.named.moss' },
  { palette: 'rose', mode: 'dark', nameKey: 'theme.named.wine' },
  { palette: 'amber', mode: 'dark', nameKey: 'theme.named.ember' },
  { palette: 'slate', mode: 'dark', nameKey: 'theme.named.graphite' },
]

export function isPaletteId(value: string | null | undefined): value is PaletteId {
  return PALETTE_IDS.includes(value as PaletteId)
}

export function detectPalette(): PaletteId {
  try {
    const saved = localStorage.getItem(PALETTE_STORAGE_KEY)
    if (isPaletteId(saved)) return saved
  } catch {
    /* ignore */
  }
  return DEFAULT_PALETTE
}

export function applyPaletteAttr(palette: PaletteId): void {
  document.documentElement.setAttribute('data-palette', palette)
}

export function readCssColor(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}
