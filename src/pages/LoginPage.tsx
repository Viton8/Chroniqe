import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ACCOUNT_BLOCKED, useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import Button from '../components/ui/Button'
import { FieldWrap, Input } from '../components/ui/Input'
import LanguageSwitch from '../components/ui/LanguageSwitch'
import ColorPalettePicker from '../components/ui/ColorPalettePicker'
import ThemeSwitch from '../components/ui/ThemeSwitch'

export default function LoginPage() {
  const { signIn } = useAuth()
  const { t } = usePrefs()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <AuthShell title={t('auth.loginTitle')} subtitle={t('auth.loginSub')}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError(null)
          try {
            await signIn(email, password)
            navigate(from, { replace: true })
          } catch (err) {
            setError(
              err instanceof Error && err.message === ACCOUNT_BLOCKED
                ? t('auth.blocked')
                : err instanceof Error
                  ? err.message
                  : t('auth.loginFail'),
            )
          } finally {
            setBusy(false)
          }
        }}
      >
        <FieldWrap label={t('auth.email')}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </FieldWrap>
        <FieldWrap label={t('auth.password')}>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </FieldWrap>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        <Button className="w-full" disabled={busy}>
          {t('nav.login')}
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted">
        <Link to="/forgot" className="text-accent hover:underline">
          {t('auth.forgot')}
        </Link>
        <span className="mx-2">·</span>
        <Link to="/register" state={{ from }} className="text-accent hover:underline">
          {t('auth.register')}
        </Link>
      </p>
    </AuthShell>
  )
}

export function AuthShell({
  title,
  subtitle,
  kicker,
  children,
}: {
  title: string
  subtitle?: string
  kicker?: string
  children: ReactNode
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LanguageSwitch />
        <ThemeSwitch />
        <ColorPalettePicker compact />
      </div>
      <div className="w-full max-w-md rounded-3xl border border-line bg-paper p-8 shadow-lift">
        <Link to="/" className="font-serif text-2xl hover:text-accent">
          Chroniqe
        </Link>
        {kicker ? <p className="mt-6 text-xs uppercase tracking-wide text-muted">{kicker}</p> : null}
        <h1 className={kicker ? 'mt-2 font-serif text-3xl' : 'mt-6 font-serif text-3xl'}>{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}
