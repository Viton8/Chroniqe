import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '../../lib/cn'
import { usePrefs } from '../../context/PrefsContext'
import type { ThemePref } from '../../lib/i18n'

const options: { code: ThemePref; icon: typeof Sun }[] = [
  { code: 'light', icon: Sun },
  { code: 'dark', icon: Moon },
  { code: 'system', icon: Monitor },
]

export default function ThemeSwitch({ compact }: { compact?: boolean }) {
  const { theme, setTheme, t } = usePrefs()

  return (
    <div
      className="inline-flex items-center rounded-xl bg-paper/80 p-0.5 ring-1 ring-line"
      role="group"
      aria-label={t('theme.label')}
    >
      {options.map(({ code, icon: Icon }) => (
        <button
          key={code}
          type="button"
          onClick={() => setTheme(code)}
          aria-pressed={theme === code}
          aria-label={t(`theme.${code}`)}
          title={t(`theme.${code}`)}
          className={cn(
            'rounded-lg transition',
            compact ? 'p-1.5' : 'px-2 py-1.5',
            theme === code ? 'bg-ink text-paper' : 'text-muted hover:text-ink',
          )}
        >
          <Icon size={compact ? 14 : 16} strokeWidth={2} />
        </button>
      ))}
    </div>
  )
}
