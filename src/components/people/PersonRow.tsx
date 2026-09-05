import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Profile } from '../../types/domain'
import Avatar from '../ui/Avatar'

export default function PersonRow({
  profile,
  meta,
  action,
}: {
  profile: Pick<Profile, 'username' | 'display_name' | 'avatar_url'>
  meta?: ReactNode
  action?: ReactNode
}) {
  const name = profile.display_name || profile.username
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper px-4 py-3 transition-colors hover:border-accent">
      <Link to={`/u/${profile.username}`} className="flex min-w-0 items-center gap-3">
        <Avatar name={name} url={profile.avatar_url} size={36} />
        <span className="min-w-0">
          <span className="block truncate">{name}</span>
          <span className="block text-xs text-muted">@{profile.username}</span>
          {meta ? <span className="mt-0.5 block text-xs text-muted">{meta}</span> : null}
        </span>
      </Link>
      {action ? <div className="shrink-0">{action}</div> : null}
    </li>
  )
}
