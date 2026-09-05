import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import Button from '../components/ui/Button'
import { FieldWrap, Input } from '../components/ui/Input'
import { AuthShell } from './LoginPage'

export default function RegisterPage() {
  const { signUp } = useAuth()
  const { t } = usePrefs()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <AuthShell title={t('auth.registerTitle')} subtitle={t('auth.registerSub')}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError(null)
          try {
            const { needsConfirm } = await signUp({ email, password, username, displayName })
            if (needsConfirm) {
              setInfo(t('auth.confirmEmail'))
            } else {
              navigate(from ?? '/lists/new')
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
        <Link to="/login" state={from ? { from } : undefined} className="text-accent hover:underline">
          {t('nav.login')}
        </Link>
      </p>
    </AuthShell>
  )
}
