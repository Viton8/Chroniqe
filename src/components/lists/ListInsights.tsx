import type { ItemRow, ListSchema } from '../../types/domain'
import { buildInsights } from '../../lib/insights'
import { formatDate, titleFromValues } from '../../lib/cn'
import { usePrefs } from '../../context/PrefsContext'
import EmptyState from '../ui/EmptyState'

export default function ListInsights({
  schema,
  items,
  ratings,
  onOpen,
}: {
  schema: ListSchema
  items: ItemRow[]
  ratings: import('../../types/domain').ItemRating[]
  onOpen: (item: ItemRow) => void
}) {
  const { t } = usePrefs()
  const data = buildInsights(schema, items, ratings)
  if (!data.total) {
    return <EmptyState icon="📊" title={t('insights.none')} text={t('insights.noneText')} />
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label={t('insights.total')} value={String(data.total)} />
        <Stat label={t('insights.open')} value={String(data.open)} />
        <Stat label={t('insights.done')} value={String(data.checked)} />
        <Stat label={t('insights.completion')} value={`${data.completion}%`} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t('insights.thisWeek')} value={String(data.addedThisWeek)} />
        <Stat label={t('insights.thisMonth')} value={String(data.addedThisMonth)} />
        <Stat
          label={t('insights.avgRating')}
          value={data.avgRating != null ? data.avgRating.toFixed(1) : '—'}
        />
      </div>
      {data.byGroup.length ? (
        <section className="rounded-2xl border border-line bg-paper p-4">
          <h3 className="font-serif text-xl">
            {t('insights.byGroup', { field: data.groupField?.name ?? '' })}
          </h3>
          <ul className="mt-3 space-y-2">
            {data.byGroup.map((row) => {
              const pct = Math.round((row.count / data.total) * 100)
              return (
                <li key={row.value}>
                  <div className="flex justify-between text-sm">
                    <span>{row.label}</span>
                    <span className="text-muted">
                      {row.count} · {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/10">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{
                        width: `${pct}%`,
                        background: row.color || undefined,
                      }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <DateList
          title={t('insights.overdue')}
          rows={data.overdue}
          schema={schema}
          empty={t('insights.noOverdue')}
          onOpen={onOpen}
        />
        <DateList
          title={t('insights.upcoming')}
          rows={data.upcoming}
          schema={schema}
          empty={t('insights.noUpcoming')}
          onOpen={onOpen}
        />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-4 shadow-lift">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-serif text-3xl">{value}</p>
    </div>
  )
}

function DateList({
  title,
  rows,
  schema,
  empty,
  onOpen,
}: {
  title: string
  rows: { item: ItemRow; date: string }[]
  schema: ListSchema
  empty: string
  onOpen: (item: ItemRow) => void
}) {
  return (
    <section className="rounded-2xl border border-line bg-paper p-4">
      <h3 className="font-serif text-xl">{title}</h3>
      {rows.length ? (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.item.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-ink/5"
                onClick={() => onOpen(row.item)}
              >
                <span className="truncate text-sm">
                  {titleFromValues(row.item.values, schema.titleFieldId)}
                </span>
                <span className="shrink-0 text-xs text-muted">{formatDate(row.date)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      )}
    </section>
  )
}
