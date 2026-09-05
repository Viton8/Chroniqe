import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { acceptInviteByToken, peekInvite } from '../services/api'
import type { MemberRole } from '../types/domain'
import Button from '../components/ui/Button'
import { AuthShell } from './LoginPage'

export default function JoinPage() {
  const { token } = useParams()
  const { user } = useAuth()
  const { t } = usePrefs()
  const navigate = useNavigate()
  const [info, setInfo] = useState<{
    list_id: string
    list_title: string
    list_icon: string | null
    role: MemberRole
    status: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) return
    void peekInvite(token)
      .then((row) => setInfo(row))
      .catch((err) => setError(err instanceof Error ? err.message : t('common.error')))
      .finally(() => setLoading(false))
  }, [token, t])

  const join = async () => {
    if (!token) return
    if (!user) {
      navigate('/login', { state: { from: `/join/${token}` } })
      return
    }
    setBusy(true)
    try {
      const listId = await acceptInviteByToken(token)
      navigate(`/lists/${listId}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <AuthShell title={t('common.loading')}>
        <p className="text-sm text-muted">{t('share.joinKicker')}</p>
      </AuthShell>
    )
  }

  if (!token || !info) {
    return (
      <AuthShell title={t('share.joinMissing')} subtitle={error ?? t('share.joinMissingText')}>
        <Link to="/explore" className="text-sm text-accent hover:underline">
          {t('nav.explore')}
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      kicker={t('share.joinKicker')}
      title={`${info.list_icon ?? ''} ${info.list_title}`.trim()}
      subtitle={t(`share.joinRole.${info.role}`)}
    >
      {info.status === 'accepted' ? (
        <Button className="w-full" onClick={() => navigate(`/lists/${info.list_id}`)}>
          {t('notes.openList')}
        </Button>
      ) : info.status !== 'pending' ? (
        <p className="text-sm text-rose-700">{t('share.joinClosed')}</p>
      ) : (
        <Button className="w-full" disabled={busy} onClick={() => void join()}>
          {user ? t('friends.join') : t('share.joinLogin')}
        </Button>
      )}
      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      <p className="mt-6 text-sm">
        <Link to="/explore" className="text-accent hover:underline">
          {t('nav.explore')}
        </Link>
      </p>
    </AuthShell>
  )
}
