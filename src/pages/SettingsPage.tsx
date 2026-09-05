import { Link } from 'react-router-dom'
import ColorPalettePicker from '../components/ui/ColorPalettePicker'
import Hint from '../components/ui/Hint'
import LanguageSwitch from '../components/ui/LanguageSwitch'
import ThemeSwitch from '../components/ui/ThemeSwitch'
import PageHeader from '../components/ui/PageHeader'
import { usePrefs } from '../context/PrefsContext'

export default function SettingsPage() {
  const { t } = usePrefs()
  return (
    <div className="max-w-xl">
      <PageHeader title={t('settings.title')} />
      <div className="mt-4 space-y-3">
        <section className="rounded-2xl border border-line bg-paper p-4 shadow-lift">
          <p className="text-sm font-medium">{t('settings.appearance')}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <LanguageSwitch />
            <ThemeSwitch />
          </div>
          <div className="mt-4 border-t border-line pt-4">
            <ColorPalettePicker />
          </div>
        </section>
        <Hint title={t('settings.files')} example={t('settings.filesEx')} />
        <p className="text-sm text-muted">
          {t('settings.profileLinkBefore')}
          <Link className="text-accent hover:underline" to="/profile">
            {t('settings.profileLinkName')}
          </Link>
          {t('settings.profileLinkAfter')}
        </p>
        <p className="text-sm text-muted">{t('settings.publicNote')}</p>
      </div>
    </div>
  )
}
