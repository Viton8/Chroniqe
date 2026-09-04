import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { useToast } from '../context/ToastContext'
import {
  fetchFriendships,
  fetchMyInvites,
  removeFriendship,
  respondFriend,
  respondInvite,
  searchProfiles,
  sendFriendRequest,
} from '../services/api'
import type { Friendship, ListInvite, Profile } from '../types/domain'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import Hint from '../components/ui/Hint'
import { Spinner } from '../components/ui/EmptyState'

export default function FriendsPage() {
  const { user } = useAuth()
  const { t } = usePrefs()
  const { toast } = useToast()
  const [q, setQ] = useState('')
  const [found, setFound] = useState<Profile[]>([])
  const [friends, setFriends] = useState<Friendship[]>([])
  const [invites, setInvites] = useState<ListInvite[]>([])
  const [loading, setLoading] = useState(true)

  const reload = async () => {
    if (!user) return
    setFriends(await fetchFriendships(user.id))
    setInvites(await fetchMyInvites(user.id))
  }

  useEffect(() => {
    if (!user) return
    let cancelled = false
    void (async () => {
      const nextFriends = await fetchFriendships(user.id)
      const nextInvites = await fetchMyInvites(user.id)
      if (cancelled) return
      setFriends(nextFriends)
      setInvites(nextInvites)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  if (loading) return <Spinner />

  const incoming = friends.filter((f) => f.status === 'pending' && f.addressee_id === user?.id)
  const accepted = friends.filter((f) => f.status === 'accepted')

  return (
    <div>
      <h1 className="font-serif text-3xl">{t('friends.title')}</h1>
      <Hint className="mt-3" title={t('friends.hint')} example={t('friends.hintEx')} />
      <Input
        className="mt-4 max-w-sm"
        placeholder={t('friends.find')}
        value={q}
        onChange={async (e) => {
          setQ(e.target.value)
          setFound(await searchProfiles(e.target.value))
        }}
      />
      <ul className="mt-3 space-y-2">
        {found.map((p) => (
          <li key={p.id} className="flex items-center justify-between rounded-2xl bg-paper px-4 py-2">
            <Link to={`/u/${p.username}`}>
              {p.display_name} <span className="text-muted">@{p.username}</span>
            </Link>
            {p.id !== user?.id ? (
              <Button
                size="sm"
                variant="soft"
                onClick={async () => {
                  if (!user) return
                  try {
                    await sendFriendRequest(user.id, p.id)
                    toast(t('friends.sent'))
                    await reload()
                  } catch (err) {
                    toast(err instanceof Error ? err.message : t('common.error'), 'err')
                  }
                }}
              >
                {t('friends.add')}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      <h2 className="mt-8 font-serif text-2xl">{t('friends.requests')}</h2>
      <ul className="mt-2 space-y-2">
        {incoming.map((f) => (
          <li key={f.id} className="flex items-center justify-between rounded-2xl bg-paper px-4 py-2">
            @{f.requester?.username}
            <span className="flex gap-2">
              <Button size="sm" onClick={() => void respondFriend(f.id, true).then(reload)}>
                {t('friends.accept')}
              </Button>
              <Button size="sm" variant="soft" onClick={() => void respondFriend(f.id, false).then(reload)}>
                {t('friends.no')}
              </Button>
            </span>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 font-serif text-2xl">{t('friends.invites')}</h2>
      <ul className="mt-2 space-y-2">
        {invites.map((i) => (
          <li key={i.id} className="flex items-center justify-between rounded-2xl bg-paper px-4 py-2 text-sm">
            {t('friends.listInvite')} {i.list_id.slice(0, 8)}…
            <span className="flex gap-2">
              <Button size="sm" onClick={() => void respondInvite(i, true).then(reload)}>
                {t('friends.join')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void respondInvite(i, false).then(reload)}>
                {t('friends.decline')}
              </Button>
            </span>
          </li>
        ))}
      </ul>

      <h2 className="mt-8 font-serif text-2xl">{t('friends.friends')}</h2>
      <ul className="mt-2 space-y-2">
        {accepted.map((f) => {
          const other = f.requester_id === user?.id ? f.addressee : f.requester
          return (
            <li key={f.id} className="flex items-center justify-between rounded-2xl bg-paper px-4 py-2">
              {other?.username ? (
                <Link to={`/u/${other.username}`}>@{other.username}</Link>
              ) : (
                '@'
              )}
              <Button size="sm" variant="ghost" onClick={() => void removeFriendship(f.id).then(reload)}>
                {t('friends.remove')}
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
