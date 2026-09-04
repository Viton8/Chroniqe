import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePrefs } from '../context/PrefsContext'
import { supabase } from '../services/supabase'
import Button from '../components/ui/Button'
import { FieldWrap, Input } from '../components/ui/Input'
import { AuthShell } from './LoginPage'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { t } = usePrefs()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <AuthShell title={t('auth.resetTitle')} subtitle={t('auth.resetSub')}>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault()
          const { error: err } = await supabase.auth.updateUser({ password })
          if (err) setError(err.message)
          else navigate('/dashboard')
        }}
      >
        <FieldWrap label={t('auth.password')}>
          <Input
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </FieldWrap>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        <Button className="w-full">{t('common.save')}</Button>
      </form>
    </AuthShell>
  )
}
