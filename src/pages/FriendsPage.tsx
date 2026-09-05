import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
import { SearchField } from '../components/ui/Input'
import Hint from '../components/ui/Hint'
import EmptyState, { Spinner } from '../components/ui/EmptyState'
import PageHeader from '../components/ui/PageHeader'
import PersonRow from '../components/people/PersonRow'
import { friendRelation, otherFriend } from '../lib/friends'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

export default function FriendsPage() {
  const { user } = useAuth()
  const { t } = usePrefs()
  const { toast } = useToast()
  const [q, setQ] = useState('')
  const [found, setFound] = useState<Profile[]>([])
  const [foundFor, setFoundFor] = useState('')
  const [friends, setFriends] = useState<Friendship[]>([])
  const [invites, setInvites] = useState<ListInvite[]>([])
  const [loading, setLoading] = useState(true)
  const debounced = useDebouncedValue(q)
  const searchKey = debounced.trim()
  const visibleFound = searchKey.length < 2 || foundFor !== searchKey ? [] : found
  const searching = searchKey.length >= 2 && foundFor !== searchKey

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

  useEffect(() => {
    if (searchKey.length < 2) return
    let cancelled = false
    void searchProfiles(searchKey).then((rows) => {
      if (cancelled) return
      setFound(rows)
      setFoundFor(searchKey)
    })
    return () => {
      cancelled = true
    }
  }, [searchKey])

  const incoming = useMemo(
    () => friends.filter((f) => f.status === 'pending' && f.addressee_id === user?.id),
    [friends, user?.id],
  )
  const outgoing = useMemo(
    () => friends.filter((f) => f.status === 'pending' && f.requester_id === user?.id),
    [friends, user?.id],
  )
  const accepted = useMemo(() => friends.filter((f) => f.status === 'accepted'), [friends])

  if (loading) return <Spinner />
  if (!user) return null

  const addFriend = async (profile: Profile) => {
    try {
      await sendFriendRequest(user.id, profile.id)
      toast(t('friends.sent'))
      await reload()
    } catch (err) {
      toast(err instanceof Error ? err.message : t('common.error'), 'err')
    }
  }

  return (
    <div>
      <PageHeader
        title={t('friends.title')}
        action={
          <Link to="/feed" className="text-sm text-accent hover:underline">
            {t('feed.openFeed')}
          </Link>
        }
      />
      <Hint className="mt-3" title={t('friends.hint')} example={t('friends.hintEx')} />
      <SearchField
        className="mt-4"
        placeholder={t('friends.find')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {q.trim().length > 0 && q.trim().length < 2 ? (
        <p className="mt-3 text-sm text-muted">{t('friends.emptySearch')}</p>
      ) : null}
      {searching ? <p className="mt-3 text-sm text-muted">{t('common.loading')}</p> : null}
      {searchKey.length >= 2 && !searching && !visibleFound.length ? (
        <div className="mt-3">
          <EmptyState compact title={t('friends.noUsers')} />
        </div>
      ) : null}
      <ul className="mt-3 space-y-2">
        {visibleFound.map((p) => {
          const relation = friendRelation(user.id, p.id, friends)
          return (
            <PersonRow
              key={p.id}
              profile={p}
              action={
                relation === 'self' ? (
                  <span className="text-xs text-muted">{t('friends.you')}</span>
                ) : relation === 'friends' ? (
                  <span className="rounded-full bg-ink/5 px-2.5 py-1 text-xs text-muted">{t('friends.already')}</span>
                ) : relation === 'outgoing' ? (
                  <span className="rounded-full bg-ink/5 px-2.5 py-1 text-xs text-muted">{t('friends.pending')}</span>
                ) : relation === 'incoming' ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      const row = incoming.find((f) => f.requester_id === p.id)
                      if (row) void respondFriend(row.id, true).then(reload)
                    }}
                  >
                    {t('friends.accept')}
                  </Button>
                ) : (
                  <Button size="sm" variant="soft" onClick={() => void addFriend(p)}>
                    {t('friends.add')}
                  </Button>
                )
              }
            />
          )
        })}
      </ul>

      <PeopleSection title={t('friends.requests')} emptyLabel={t('friends.emptyRequests')} empty={!incoming.length}>
        {incoming.map((f) =>
              f.requester ? (
                <PersonRow
                  key={f.id}
                  profile={f.requester}
                  action={
                    <span className="flex gap-2">
                      <Button size="sm" onClick={() => void respondFriend(f.id, true).then(reload)}>
                        {t('friends.accept')}
                      </Button>
                      <Button size="sm" variant="soft" onClick={() => void respondFriend(f.id, false).then(reload)}>
                        {t('friends.no')}
                      </Button>
                    </span>
                  }
                />
              ) : null,
            )}
      </PeopleSection>

      <PeopleSection title={t('friends.outgoing')} emptyLabel={t('friends.emptyOutgoing')} empty={!outgoing.length}>
        {outgoing.map((f) =>
              f.addressee ? (
                <PersonRow
                  key={f.id}
                  profile={f.addressee}
                  meta={t('friends.pending')}
                  action={
                    <Button size="sm" variant="ghost" onClick={() => void removeFriendship(f.id).then(reload)}>
                      {t('common.cancel')}
                    </Button>
                  }
                />
              ) : null,
            )}
      </PeopleSection>

      <PeopleSection title={t('friends.invites')} emptyLabel={t('friends.emptyInvites')} empty={!invites.length}>
        {invites.map((i) => (
              <li
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-4 py-3 text-sm transition-colors hover:border-accent"
              >
                <span className="min-w-0">
                  {i.list ? (
                    <Link to={`/lists/${i.list.id}`} className="font-medium text-accent hover:underline">
                      {`${i.list.icon ?? ''} ${i.list.title}`.trim()}
                    </Link>
                  ) : (
                    t('friends.inviteUnknown')
                  )}
                  <span className="mt-0.5 block text-xs text-muted">
                    {t(`settingsModal.${i.role}`)}
                    {i.inviter?.username ? ` · ${t('friends.invitedBy', { name: i.inviter.username })}` : ''}
                  </span>
                </span>
                <span className="flex shrink-0 flex-wrap gap-2">
                  <Button size="sm" onClick={() => void respondInvite(i, true).then(reload)}>
                    {t('friends.join')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void respondInvite(i, false).then(reload)}>
                    {t('friends.decline')}
                  </Button>
                </span>
              </li>
        ))}
      </PeopleSection>

      <section className="mt-8">
        <h2 className="font-serif text-2xl">{t('friends.friends')}</h2>
        {accepted.length ? (
          <ul className="mt-3 space-y-2">
            {accepted.map((f) => {
              const other = otherFriend(user.id, f)
              if (!other) return null
              return (
                <PersonRow
                  key={f.id}
                  profile={other}
                  action={
                    <Button size="sm" variant="ghost" onClick={() => void removeFriendship(f.id).then(reload)}>
                      {t('friends.remove')}
                    </Button>
                  }
                />
              )
            })}
          </ul>
        ) : (
          <div className="mt-3">
            <EmptyState icon="👋" title={t('friends.emptyFriends')} text={t('friends.emptyFriendsText')} />
          </div>
        )}
      </section>
    </div>
  )
}

function PeopleSection({
  title,
  empty,
  emptyLabel,
  children,
}: {
  title: string
  empty: boolean
  emptyLabel: string
  children: ReactNode
}) {
  return (
    <section className="mt-8">
      <h2 className="font-serif text-2xl">{title}</h2>
      {empty ? (
        <div className="mt-3">
          <EmptyState compact title={emptyLabel} />
        </div>
      ) : (
        <ul className="mt-3 space-y-2">{children}</ul>
      )}
    </section>
  )
}
