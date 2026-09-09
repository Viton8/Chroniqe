import { Link, useNavigate } from 'react-router-dom'
import { usePrefs } from '../../context/PrefsContext'
import type { HomeBlock } from '../../lib/homeLayout'
import { normalizeViewConfig } from '../../lib/views'
import type { ItemRating, ItemRow, ListRow } from '../../types/domain'
import EmptyState, { Spinner } from '../ui/EmptyState'
import ListViews, { ViewSwitcher } from '../lists/ListViews'

export default function HomeListPanel({
  block,
  list,
  items,
  ratings,
  loading,
  onViewChange,
}: {
  block: HomeBlock
  list?: ListRow
  items?: ItemRow[]
  ratings?: ItemRating[]
  loading?: boolean
  onViewChange: (viewId: string) => void
}) {
  const { t } = usePrefs()
  const navigate = useNavigate()

  if (!block.listId) {
    return (
      <section className="rounded-2xl border border-line bg-paper p-4 shadow-lift">
        <h2 className="font-serif text-2xl">{t('home.kind.list')}</h2>
        <div className="mt-3">
          <EmptyState compact title={t('home.chooseList')} />
        </div>
      </section>
    )
  }

  if (loading || items === undefined) {
    return (
      <section className="rounded-2xl border border-line bg-paper p-4 shadow-lift">
        <Spinner />
      </section>
    )
  }

  if (!list) {
    return (
      <section className="rounded-2xl border border-line bg-paper p-4 shadow-lift">
        <h2 className="font-serif text-2xl">{t('home.kind.list')}</h2>
        <div className="mt-3">
          <EmptyState compact title={t('home.emptyList')} />
        </div>
      </section>
    )
  }

  const resolved = normalizeViewConfig(list.view_config, list.schema)
  const view =
    (block.viewId ? resolved.views.find((row) => row.id === block.viewId) : undefined) ?? resolved.active
  const limit = block.limit ?? 8
  const shown = items.slice(0, limit)

  return (
    <section className="rounded-2xl border border-line bg-paper p-4 shadow-lift">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="min-w-0 truncate font-serif text-2xl">
          {list.icon ? `${list.icon} ` : ''}
          {list.title}
        </h2>
        <Link to={`/lists/${list.id}`} className="shrink-0 text-sm text-accent hover:underline">
          {t('home.openList')}
        </Link>
      </div>
      {resolved.views.length > 1 ? (
        <div className="mt-3">
          <ViewSwitcher
            views={resolved.views}
            activeId={view.id}
            onChange={onViewChange}
          />
        </div>
      ) : null}
      {shown.length ? (
        <div className="mt-3 max-h-[32rem] overflow-auto">
          <ListViews
            schema={list.schema}
            items={shown}
            ratings={ratings ?? []}
            view={view}
            enableCheck={list.settings?.enableCheck}
            preview
            highlightRules={list.settings?.highlightRules}
            onOpen={(item) => navigate(`/lists/${list.id}?item=${item.id}`)}
          />
        </div>
      ) : (
        <div className="mt-3">
          <EmptyState compact title={t('lists.emptyTitle')} />
        </div>
      )}
    </section>
  )
}
