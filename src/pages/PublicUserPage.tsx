import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { useToast } from '../context/ToastContext'
import { fetchFriendships, fetchProfileByUsername, fetchPublicListsByOwner, respondFriend, sendFriendRequest } from '../services/api'
import type { Friendship, ListRow, Profile } from '../types/domain'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import EmptyState, { Spinner } from '../components/ui/EmptyState'
import ListCard from '../components/lists/ListCard'
import ForkListButton from '../components/lists/ForkListButton'
import { friendRelation } from '../lib/friends'
import { appUrl } from '../lib/share'

export default function PublicUserPage() {
  const { username } = useParams()
  const { user } = useAuth()
  const { t } = usePrefs()
  const { toast } = useToast()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [lists, setLists] = useState<ListRow[]>([])
  const [friends, setFriends] = useState<Friendship[]>([])
  const loadKey = `${username ?? ''}:${user?.id ?? ''}`
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const loading = loadedFor !== loadKey

  const reloadFriends = async () => {
    if (!user) return
    setFriends(await fetchFriendships(user.id))
  }

  useEffect(() => {
    if (!username) return
    let cancelled = false
    void (async () => {
      try {
        const row = await fetchProfileByUsername(username)
        if (cancelled) return
        const nextLists = row ? await fetchPublicListsByOwner(row.id) : []
        if (cancelled) return
        const nextFriends = user ? await fetchFriendships(user.id).catch(() => []) : []
        if (cancelled) return
        setProfile(row)
        setLists(nextLists)
        setFriends(nextFriends)
      } catch {
        if (cancelled) return
        setProfile(null)
        setLists([])
      } finally {
        if (!cancelled) setLoadedFor(loadKey)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [username, user, loadKey])

  if (loading) return <Spinner />
  if (!profile) {
    return <EmptyState icon="?" title={t('profile.notFound')} />
  }

  const mine = user?.id === profile.id
  const relation = user ? friendRelation(user.id, profile.id, friends) : 'none'
  const incoming = friends.find((row) => row.status === 'pending' && row.requester_id === profile.id)

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-line bg-paper p-5 shadow-lift">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={profile.display_name || profile.username} url={profile.avatar_url} size={64} />
          <div className="min-w-0">
            <h1 className="break-words font-serif text-3xl">{profile.display_name || profile.username}</h1>
            <p className="text-sm text-muted">@{profile.username}</p>
            <p className="mt-1 text-xs text-muted">{t('profile.listsCount', { n: lists.length })}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {mine ? (
            <>
              <Link to="/profile">
                <Button size="sm" variant="soft">
                  {t('profile.edit')}
                </Button>
              </Link>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  void navigator.clipboard.writeText(appUrl(`u/${profile.username}`)).then(() => toast(t('common.copied')))
                }}
              >
                {t('profile.copyLink')}
              </Button>
            </>
          ) : user ? (
            relation === 'friends' ? (
              <span className="rounded-full bg-ink/5 px-3 py-1 text-sm text-muted">{t('friends.already')}</span>
            ) : relation === 'outgoing' ? (
              <span className="rounded-full bg-ink/5 px-3 py-1 text-sm text-muted">{t('profile.pending')}</span>
            ) : relation === 'incoming' && incoming ? (
              <Button size="sm" onClick={() => void respondFriend(incoming.id, true).then(reloadFriends)}>
                {t('friends.accept')}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    await sendFriendRequest(user.id, profile.id)
                    toast(t('friends.sent'))
                    await reloadFriends()
                  } catch (err) {
                    toast(err instanceof Error ? err.message : t('common.error'), 'err')
                  }
                }}
              >
                {t('profile.addFriend')}
              </Button>
            )
          ) : (
            <Link to="/login" state={{ from: `/u/${profile.username}` }}>
              <Button size="sm">{t('profile.addFriend')}</Button>
            </Link>
          )}
        </div>
      </div>
      {profile.bio ? <p className="mt-4 max-w-xl text-sm text-muted">{profile.bio}</p> : null}
      <h2 className="mt-8 font-serif text-2xl">{t('profile.publicLists')}</h2>
      {lists.length ? (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {lists.map((l) => (
            <ListCard
              key={l.id}
              list={l}
              favorite={Boolean(user)}
              aside={<ForkListButton list={l} />}
            />
          ))}
        </ul>
      ) : (
        <div className="mt-4">
          <EmptyState compact icon="📋" title={t('profile.noPublic')} />
        </div>
      )}
    </div>
  )
}
