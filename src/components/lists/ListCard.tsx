import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { ListRow } from '../../types/domain'
import FavoriteButton from './FavoriteButton'

export default function ListCard({
  list,
  badge,
  meta,
  aside,
  favorite,
  onFav,
}: {
  list: ListRow
  badge?: string
  meta?: ReactNode
  aside?: ReactNode
  favorite?: boolean
  onFav?: () => void
}) {
  return (
    <li className="relative overflow-hidden rounded-2xl border border-line bg-paper shadow-lift transition-colors hover:border-accent">
      <Link to={`/lists/${list.id}`} className={`block p-4 ${favorite ? 'pr-12' : ''}`}>
        <p className="text-lg">
          {list.icon} {list.title}
        </p>
        {list.description ? <p className="mt-1 text-xs text-muted line-clamp-2">{list.description}</p> : null}
        {badge || meta ? (
          <p className="mt-2 text-xs text-muted">
            {badge}
            {badge && meta ? <span className="mx-1.5">·</span> : null}
            {meta}
          </p>
        ) : null}
      </Link>
      {favorite ? (
        <div className="absolute right-2 top-2">
          <FavoriteButton id={list.id} onChange={onFav} />
        </div>
      ) : null}
      {aside ? <div className="border-t border-line/80 px-4 py-2.5 text-xs text-muted">{aside}</div> : null}
    </li>
  )
}
