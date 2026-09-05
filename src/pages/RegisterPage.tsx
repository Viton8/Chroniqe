import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import Button from '../components/ui/Button'
import { FieldWrap, Input } from '../components/ui/Input'
import LanguageSwitch from '../components/ui/LanguageSwitch'
import ColorPalettePicker from '../components/ui/ColorPalettePicker'
import ThemeSwitch from '../components/ui/ThemeSwitch'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const { t } = usePrefs()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LanguageSwitch />
        <ThemeSwitch />
        <ColorPalettePicker compact />
      </div>
      <div className="w-full max-w-md rounded-3xl border border-line bg-paper p-8 shadow-lift">
        <Link to="/" className="font-serif text-2xl">
          Chroniqe
        </Link>
        <h1 className="mt-6 font-serif text-3xl">{t('auth.registerTitle')}</h1>
        <p className="mt-1 text-sm text-muted">{t('auth.registerSub')}</p>
        <form
          className="mt-6 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError(null)
            try {
              const { needsConfirm } = await signUp({ email, password, username, displayName })
              if (needsConfirm) {
                setInfo(t('auth.confirmEmail'))
              } else {
                navigate('/lists/new')
              }
            } catch (err) {
              setError(err instanceof Error ? err.message : t('auth.signupFail'))
            } finally {
              setBusy(false)
            }
          }}
        >
          <FieldWrap label={t('auth.displayName')}>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </FieldWrap>
          <FieldWrap label={t('auth.username')} hint={t('auth.usernameHint')}>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              minLength={3}
              maxLength={24}
              required
            />
          </FieldWrap>
          <FieldWrap label={t('auth.email')}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </FieldWrap>
          <FieldWrap label={t('auth.password')} hint={t('auth.passwordHint')}>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </FieldWrap>
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          {info ? <p className="text-sm text-teal-800">{info}</p> : null}
          <Button className="w-full" disabled={busy}>
            {t('auth.create')}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="underline">
            {t('nav.login')}
          </Link>
        </p>
      </div>
    </div>
  )
}
