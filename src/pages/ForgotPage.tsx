import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import Button from '../components/ui/Button'
import { FieldWrap, Input } from '../components/ui/Input'
import { AuthShell } from './LoginPage'

export default function ForgotPage() {
  const { resetPassword } = useAuth()
  const { t } = usePrefs()
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <AuthShell title={t('auth.forgotTitle')} subtitle={t('auth.forgotSub')}>
      {done ? (
        <p className="text-sm text-muted">{t('auth.forgotDone')}</p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            setError(null)
            try {
              await resetPassword(email)
              setDone(true)
            } catch (err) {
              setError(err instanceof Error ? err.message : t('common.error'))
            }
          }}
        >
          <FieldWrap label={t('auth.email')}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </FieldWrap>
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          <Button className="w-full">{t('common.send')}</Button>
        </form>
      )}
      <Link to="/login" className="mt-4 inline-block text-sm text-muted underline">
        {t('common.back')}
      </Link>
    </AuthShell>
  )
}
