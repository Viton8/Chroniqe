import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { usePrefs } from '../context/PrefsContext'
import { fetchProfileByUsername, fetchPublicListsByOwner } from '../services/api'
import type { ListRow, Profile } from '../types/domain'
import Avatar from '../components/ui/Avatar'
import EmptyState, { Spinner } from '../components/ui/EmptyState'

export default function PublicUserPage() {
  const { username } = useParams()
  const { t } = usePrefs()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [lists, setLists] = useState<ListRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!username) return
    let cancelled = false
    void (async () => {
      const row = await fetchProfileByUsername(username)
      if (cancelled) return
      setProfile(row)
      if (row) setLists(await fetchPublicListsByOwner(row.id))
    })().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [username])

  if (loading) return <Spinner />
  if (!profile) {
    return <EmptyState icon="?" title={t('profile.notFound')} text="" />
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <Avatar name={profile.display_name || profile.username} url={profile.avatar_url} size={64} />
        <div>
          <h1 className="font-serif text-3xl">{profile.display_name || profile.username}</h1>
          <p className="text-sm text-muted">@{profile.username}</p>
        </div>
      </div>
      {profile.bio ? <p className="mt-4 max-w-xl text-sm text-muted">{profile.bio}</p> : null}
      <h2 className="mt-8 font-serif text-2xl">{t('profile.publicLists')}</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {lists.map((l) => (
          <li key={l.id}>
            <Link to={`/lists/${l.id}`} className="block rounded-2xl border border-line bg-paper p-4 shadow-lift">
              <p>
                {l.icon} {l.title}
              </p>
              {l.description ? <p className="mt-1 text-xs text-muted">{l.description}</p> : null}
            </Link>
          </li>
        ))}
      </ul>
      {!lists.length ? <p className="mt-4 text-sm text-muted">{t('profile.noPublic')}</p> : null}
    </div>
  )
}
