import { Check } from 'lucide-react'
import type { FieldDef, ItemRating, ItemRow, ListSchema, ViewConfig, ViewMode } from '../../types/domain'
import { displayValue } from '../../lib/display'
import { cn, formatDate, titleFromValues } from '../../lib/cn'
import { usePrefs } from '../../context/PrefsContext'

const MODE_IDS: ViewMode[] = ['table', 'cards', 'board', 'gallery', 'timeline', 'compact']

export function ViewSwitcher({
  mode,
  onChange,
}: {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}) {
  const { t } = usePrefs()
  return (
    <div className="flex gap-1 overflow-x-auto rounded-2xl bg-ink/5 p-1">
      {MODE_IDS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            'whitespace-nowrap rounded-xl px-3 py-1.5 text-xs',
            mode === id ? 'bg-paper font-medium shadow-sm' : 'text-muted',
          )}
        >
          {t(`views.${id}`)}
        </button>
      ))}
    </div>
  )
}

export default function ListViews({
  schema,
  items,
  ratings,
  view,
  enableCheck,
  onOpen,
  onToggle,
}: {
  schema: ListSchema
  items: ItemRow[]
  ratings: ItemRating[]
  view: ViewConfig
  enableCheck?: boolean
  onOpen: (item: ItemRow) => void
  onToggle?: (item: ItemRow, next: boolean) => void
}) {
  const { t } = usePrefs()
  const fields = visibleFields(schema, view)
  const titleId = schema.titleFieldId
  const groupId = view.groupFieldId ?? schema.groupFieldId
  const dateId = view.dateFieldId ?? schema.dateFieldId
  const imageId = view.imageFieldId ?? schema.imageFieldId

  if (view.mode === 'board' && groupId) {
    const field = schema.fields.find((f) => f.id === groupId)
    const groups = field?.config?.options ?? []
    const rest = items.filter((i) => !groups.some((g) => g.value === String(i.values[groupId] ?? '')))
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {groups.map((g) => (
          <div key={g.value} className="w-64 shrink-0 rounded-2xl bg-black/[0.03] p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{g.label}</h3>
            <div className="space-y-2">
              {items
                .filter((i) => String(i.values[groupId] ?? '') === g.value)
                .map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    schema={schema}
                    ratings={ratings}
                    enableCheck={enableCheck}
                    onOpen={onOpen}
                    onToggle={onToggle}
                  />
                ))}
            </div>
          </div>
        ))}
        {rest.length ? (
          <div className="w-64 shrink-0 rounded-2xl bg-black/[0.03] p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t('views.ungrouped')}</h3>
            {rest.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                schema={schema}
                ratings={ratings}
                enableCheck={enableCheck}
                onOpen={onOpen}
                onToggle={onToggle}
              />
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  if (view.mode === 'timeline' && dateId) {
    const sorted = [...items].sort((a, b) =>
      String(b.values[dateId] ?? '').localeCompare(String(a.values[dateId] ?? '')),
    )
    return (
      <ol className="relative ml-3 border-l border-line">
        {sorted.map((item) => (
          <li key={item.id} className="mb-5 ml-4">
            <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-accent" />
            <p className="text-xs text-muted">{formatDate(String(item.values[dateId] ?? ''))}</p>
            <button type="button" className="text-left" onClick={() => onOpen(item)}>
              <span className={cn('font-medium', item.is_checked && 'checked-out')}>
                {titleFromValues(item.values, titleId)}
              </span>
            </button>
          </li>
        ))}
      </ol>
    )
  }

  if (view.mode === 'gallery') {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(item)}
            className="overflow-hidden rounded-2xl border border-line bg-paper text-left shadow-lift"
          >
            <GalleryThumb value={item.values[imageId ?? '']} />
            <div className="p-3">
              <p className={cn('text-sm font-medium', item.is_checked && 'checked-out')}>
                {titleFromValues(item.values, titleId)}
              </p>
            </div>
          </button>
        ))}
      </div>
    )
  }

  if (view.mode === 'cards') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            schema={schema}
            ratings={ratings}
            enableCheck={enableCheck}
            onOpen={onOpen}
            onToggle={onToggle}
          />
        ))}
      </div>
    )
  }

  if (view.mode === 'compact') {
    return (
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
            {enableCheck && onToggle ? (
              <CheckToggle checked={item.is_checked} onChange={(n) => onToggle(item, n)} />
            ) : null}
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(item)}>
              <span className={cn('text-sm', item.is_checked && 'checked-out')}>
                {titleFromValues(item.values, titleId)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
          <tr>
            {enableCheck ? <th className="w-10 px-3 py-2" /> : null}
            {fields.map((f) => (
              <th key={f.id} className="px-3 py-2 font-medium">
                {f.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="cursor-pointer border-b border-line/70 last:border-0 hover:bg-black/[0.02]"
              onClick={() => onOpen(item)}
            >
              {enableCheck && onToggle ? (
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <CheckToggle checked={item.is_checked} onChange={(n) => onToggle(item, n)} />
                </td>
              ) : null}
              {fields.map((f) => (
                <td key={f.id} className={cn('px-3 py-2', item.is_checked && 'checked-out')}>
                  {displayValue(f, item.values[f.id], ratings, item.id)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function visibleFields(schema: ListSchema, view: ViewConfig): FieldDef[] {
  const hidden = new Set(view.hiddenFieldIds ?? [])
  return schema.fields.filter((f) => !f.hidden && !hidden.has(f.id))
}

function CheckToggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded-md border',
        checked ? 'border-accent bg-accent text-white' : 'border-line',
      )}
      aria-pressed={checked}
    >
      {checked ? <Check size={14} /> : null}
    </button>
  )
}

function ItemCard({
  item,
  schema,
  ratings,
  enableCheck,
  onOpen,
  onToggle,
}: {
  item: ItemRow
  schema: ListSchema
  ratings: ItemRating[]
  enableCheck?: boolean
  onOpen: (item: ItemRow) => void
  onToggle?: (item: ItemRow, next: boolean) => void
}) {
  const preview = schema.fields.filter((f) => f.id !== schema.titleFieldId).slice(0, 3)
  return (
    <article className="rounded-2xl border border-line bg-paper p-3 shadow-lift">
      <div className="flex items-start gap-2">
        {enableCheck && onToggle ? (
          <CheckToggle checked={item.is_checked} onChange={(n) => onToggle(item, n)} />
        ) : null}
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(item)}>
          <h3 className={cn('font-medium', item.is_checked && 'checked-out')}>
            {titleFromValues(item.values, schema.titleFieldId)}
          </h3>
          <dl className="mt-2 space-y-1 text-xs text-muted">
            {preview.map((f) => (
              <div key={f.id} className="flex justify-between gap-2">
                <dt>{f.name}</dt>
                <dd className="text-ink/80">{displayValue(f, item.values[f.id], ratings, item.id)}</dd>
              </div>
            ))}
          </dl>
        </button>
      </div>
    </article>
  )
}

function GalleryThumb({ value }: { value: unknown }) {
  return (
    <div className="flex aspect-[3/4] items-center justify-center bg-accent-soft text-2xl text-accent">
      {typeof value === 'object' && value && 'name' in value ? '🖼' : '·'}
    </div>
  )
}
