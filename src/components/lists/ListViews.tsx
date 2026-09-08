import type { DragEvent, ReactNode } from 'react'
import {
  CalendarDays,
  Check,
  Columns3,
  LayoutGrid,
  Plus,
  Table2,
  Waypoints,
} from 'lucide-react'
import CalendarMonth from './CalendarMonth'
import type {
  FieldDef,
  FieldViewStyle,
  ItemComment,
  ItemRating,
  ItemRow,
  ListSchema,
  NamedView,
} from '../../types/domain'
import { collectedTags } from '../../lib/filters'
import { fileMeta, hasCoverVisual, isImageFile } from '../../lib/files'
import {
  fieldsWithRole,
  resolveViewSlots,
  styleForField,
} from '../../lib/views'
import { cn, formatDate, titleFromValues } from '../../lib/cn'
import { usePrefs } from '../../context/PrefsContext'
import FileThumb from './FileThumb'
import CoverSlot from './CoverSlot'
import ItemNotesMarker from './ItemNotes'
import StyledValue from './StyledValue'

const KIND_ICON = {
  table: Table2,
  cards: LayoutGrid,
  board: Columns3,
  timeline: Waypoints,
  calendar: CalendarDays,
} as const

export function ViewSwitcher({
  views,
  activeId,
  onChange,
}: {
  views: NamedView[]
  activeId: string
  onChange: (id: string) => void
}) {
  if (views.length < 2) return null
  return (
    <div className="bg-ink/5 flex min-w-0 flex-1 flex-wrap gap-1 rounded-2xl p-1">
      {views.map((view) => {
        const Icon = KIND_ICON[view.kind] ?? Table2
        return (
          <button
            key={view.id}
            type="button"
            onClick={() => onChange(view.id)}
            className={cn(
              'inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs',
              view.id === activeId
                ? 'bg-paper font-medium shadow-sm'
                : 'text-muted hover:text-ink',
            )}
          >
            <Icon size={13} className="shrink-0" />
            <span className="truncate">{view.name}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function ListViews({
  schema,
  items,
  ratings,
  view,
  enableCheck,
  notesByItem = {},
  userId,
  canAddNote,
  canManageNotes,
  onOpen,
  onToggle,
  onNoteCreated,
  onNoteUpdated,
  onNoteDeleted,
  selectMode,
  selectedIds,
  highlightedId,
  onToggleSelect,
  canEdit,
  onCreateOnDate,
  onMoveDate,
  onMoveGroup,
  onCreateInGroup,
}: {
  schema: ListSchema
  items: ItemRow[]
  ratings: ItemRating[]
  view: NamedView
  enableCheck?: boolean
  notesByItem?: Record<string, ItemComment[]>
  userId?: string
  canAddNote?: boolean
  canManageNotes?: boolean
  onOpen: (item: ItemRow) => void
  onToggle?: (item: ItemRow, next: boolean) => void
  onNoteCreated?: (row: ItemComment) => void
  onNoteUpdated?: (row: ItemComment) => void
  onNoteDeleted?: (id: string) => void
  selectMode?: boolean
  selectedIds?: Set<string>
  highlightedId?: string
  onToggleSelect?: (item: ItemRow) => void
  canEdit?: boolean
  onCreateOnDate?: (iso: string) => void
  onMoveDate?: (item: ItemRow, iso: string) => void
  onMoveGroup?: (item: ItemRow, value: string) => void
  onCreateInGroup?: (value: string) => void
}) {
  const { t } = usePrefs()
  const slots = resolveViewSlots(schema, view)
  const titleStyles = fieldsWithRole(view, 'title')
  const titleId = titleStyles[0]?.fieldId ?? slots.titleFieldId
  const coverId = slots.coverFieldId
  const groupId = view.groupFieldId ?? schema.groupFieldId
  const dateId = view.dateFieldId ?? schema.dateFieldId

  const notesOf = (item: ItemRow, variant: 'plain' | 'overlay' = 'plain') => (
    <ItemNotesMarker
      item={item}
      notes={notesByItem[item.id] ?? []}
      userId={userId}
      canAdd={canAddNote}
      canManage={canManageNotes}
      variant={variant}
      onCreated={onNoteCreated ?? (() => undefined)}
      onUpdated={onNoteUpdated ?? (() => undefined)}
      onDeleted={onNoteDeleted ?? (() => undefined)}
    />
  )

  const renderField = (item: ItemRow, style: FieldViewStyle) => {
    const field = schema.fields.find((f) => f.id === style.fieldId)
    if (!field) return '—'
    return (
      <StyledValue
        field={field}
        value={item.values[field.id]}
        style={style}
        ratings={ratings}
        itemId={item.id}
        values={item.values}
        schema={schema}
      />
    )
  }

  if (view.kind === 'board' && !groupId) {
    return <p className="text-sm text-muted">{t('viewEditor.groupField')}</p>
  }

  if (view.kind === 'board' && groupId) {
    const field = schema.fields.find((f) => f.id === groupId)
    const groups = boardGroups(field, items, t)
    const rest =
      field && (field.type === 'boolean' || field.type === 'checkbox')
        ? []
        : items.filter(
            (i) =>
              !groups.some((g) =>
                field ? itemInGroup(i, field, g.value) : false,
              ),
          )
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {groups.map((g) => (
          <BoardColumn
            key={g.value}
            title={g.label}
            color={g.color}
            onDropItem={(item) => onMoveGroup?.(item, g.value)}
            canDrop={Boolean(canEdit && onMoveGroup)}
            items={items}
          >
            {items
              .filter((i) => (field ? itemInGroup(i, field, g.value) : false))
              .map((item) => (
                <ConfiguredCard
                  key={item.id}
                  item={item}
                  schema={schema}
                  view={{ ...view, cardLayout: 'compact' }}
                  titleId={titleId}
                  coverId={coverId}
                  enableCheck={enableCheck}
                  notes={notesOf(item, 'overlay')}
                  renderField={renderField}
                  onOpen={onOpen}
                  onToggle={onToggle}
                  selectMode={selectMode}
                  selected={selectedIds?.has(item.id)}
                  highlighted={highlightedId === item.id}
                  onToggleSelect={onToggleSelect}
                  draggable={Boolean(canEdit && onMoveGroup)}
                />
              ))}
            {canEdit && onCreateInGroup ? (
              <button
                type="button"
                className="hover:bg-ink/5 flex w-full items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs text-muted hover:text-ink"
                onClick={() => onCreateInGroup(g.value)}
              >
                <Plus size={12} /> {t('board.addInColumn')}
              </button>
            ) : null}
          </BoardColumn>
        ))}
        {rest.length || (canEdit && onCreateInGroup) ? (
          <BoardColumn
            title={t('views.ungrouped')}
            onDropItem={(item) => onMoveGroup?.(item, '')}
            canDrop={Boolean(canEdit && onMoveGroup)}
            items={items}
          >
            {rest.map((item) => (
              <ConfiguredCard
                key={item.id}
                item={item}
                schema={schema}
                view={{ ...view, cardLayout: 'compact' }}
                titleId={titleId}
                coverId={coverId}
                enableCheck={enableCheck}
                notes={notesOf(item, 'overlay')}
                renderField={renderField}
                onOpen={onOpen}
                onToggle={onToggle}
                selectMode={selectMode}
                selected={selectedIds?.has(item.id)}
                highlighted={highlightedId === item.id}
                onToggleSelect={onToggleSelect}
                draggable={Boolean(canEdit && onMoveGroup)}
              />
            ))}
          </BoardColumn>
        ) : null}
      </div>
    )
  }

  if (view.kind === 'timeline' && !dateId) {
    return <p className="text-sm text-muted">{t('viewEditor.dateField')}</p>
  }

  if (view.kind === 'timeline' && dateId) {
    const sorted = [...items].sort((a, b) =>
      String(b.values[dateId] ?? '').localeCompare(
        String(a.values[dateId] ?? ''),
      ),
    )
    const badges = fieldsWithRole(view, 'badge')
    const meta = fieldsWithRole(view, 'meta')
    return (
      <ol className="relative ml-3 border-l border-line">
        {sorted.map((item) => (
          <li
            key={item.id}
            className={cn(
              'group relative mb-5 ml-4',
              highlightedId === item.id && 'bg-accent-soft/60 rounded-xl p-2',
            )}
          >
            <span className="absolute -left-[1.375rem] top-1.5 h-3 w-3 rounded-full bg-accent" />
            <p className="text-xs text-muted">
              {formatDate(String(item.values[dateId] ?? ''))}
            </p>
            <div className="mt-1 flex items-start gap-2">
              {coverId && hasCoverVisual(item.values[coverId]) ? (
                <CoverSlot
                  field={schema.fields.find((f) => f.id === coverId)}
                  value={item.values[coverId]}
                  className="h-12 w-9 shrink-0 rounded-lg"
                  fallback={renderField(
                    item,
                    styleForField(view, coverId) ?? {
                      fieldId: coverId,
                      role: 'cover',
                    },
                  )}
                />
              ) : null}
              {selectMode && onToggleSelect ? (
                <SelectBox
                  selected={Boolean(selectedIds?.has(item.id))}
                  onChange={() => onToggleSelect(item)}
                />
              ) : null}
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => onOpen(item)}
              >
                <span
                  className={cn(
                    'font-medium',
                    item.is_checked && 'checked-out',
                  )}
                >
                  <ItemTitle
                    item={item}
                    styles={titleStyles}
                    titleId={titleId}
                    renderField={renderField}
                  />
                </span>
                {badges.length ? (
                  <BadgeRow
                    item={item}
                    badges={badges}
                    schema={schema}
                    className="mt-1"
                    renderField={renderField}
                  />
                ) : null}
                {meta.length ? (
                  <p className="mt-1 text-xs text-muted">
                    <JoinedFields
                      item={item}
                      styles={meta}
                      renderField={renderField}
                    />
                  </p>
                ) : null}
              </button>
              <div className="relative h-7 w-7 shrink-0">{notesOf(item)}</div>
            </div>
          </li>
        ))}
      </ol>
    )
  }

  if (view.kind === 'calendar') {
    if (!dateId)
      return <p className="text-sm text-muted">{t('viewEditor.dateField')}</p>
    return (
      <CalendarMonth
        schema={schema}
        items={items}
        view={view}
        dateId={dateId}
        highlightedId={highlightedId}
        selectedIds={selectedIds}
        selectMode={selectMode}
        canEdit={canEdit}
        onOpen={onOpen}
        onToggleSelect={onToggleSelect}
        onCreateOnDate={onCreateOnDate}
        onMoveDate={onMoveDate}
      />
    )
  }

  if (view.kind === 'cards') {
    const layout = view.cardLayout ?? 'grid'
    const cols =
      layout === 'media'
        ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
        : layout === 'compact'
          ? 'grid-cols-1'
          : 'grid-cols-1 sm:grid-cols-2'
    return (
      <div className={cn('grid gap-3', cols)}>
        {items.map((item) => (
          <ConfiguredCard
            key={item.id}
            item={item}
            schema={schema}
            view={view}
            titleId={titleId}
            coverId={coverId}
            enableCheck={enableCheck}
            notes={notesOf(item, 'overlay')}
            renderField={renderField}
            onOpen={onOpen}
            onToggle={onToggle}
            selectMode={selectMode}
            selected={selectedIds?.has(item.id)}
            highlighted={highlightedId === item.id}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>
    )
  }

  const columns = view.fields
    .filter((s) => s.role === 'column')
    .map((s) => schema.fields.find((f) => f.id === s.fieldId))
    .filter((f): f is FieldDef => Boolean(f))
  const dense = view.density === 'compact'
  const pad = dense ? 'px-2 py-1.5' : 'px-3 py-2'

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
          <tr>
            {selectMode ? <th className={cn('w-10', pad)} /> : null}
            {enableCheck ? <th className={cn('w-10', pad)} /> : null}
            {columns.map((f) => (
              <th key={f.id} className={cn(pad, 'font-medium')}>
                {f.name}
              </th>
            ))}
            <th className={cn('w-16', pad)} />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className={cn(
                'border-line/70 hover:bg-ink/[0.04] group cursor-pointer border-b last:border-0',
                highlightedId === item.id && 'bg-accent-soft/70',
                selectedIds?.has(item.id) && 'bg-accent-soft/40',
              )}
              onClick={() => onOpen(item)}
            >
              {selectMode && onToggleSelect ? (
                <td className={pad} onClick={(e) => e.stopPropagation()}>
                  <SelectBox
                    selected={Boolean(selectedIds?.has(item.id))}
                    onChange={() => onToggleSelect(item)}
                  />
                </td>
              ) : null}
              {enableCheck && onToggle ? (
                <td className={pad} onClick={(e) => e.stopPropagation()}>
                  <CheckToggle
                    checked={item.is_checked}
                    onChange={(n) => onToggle(item, n)}
                  />
                </td>
              ) : null}
              {columns.map((f) => (
                <td
                  key={f.id}
                  className={cn(pad, item.is_checked && 'checked-out')}
                >
                  <FieldCell
                    field={f}
                    value={item.values[f.id]}
                    style={styleForField(view, f.id)}
                    ratings={ratings}
                    item={item}
                    schema={schema}
                  />
                </td>
              ))}
              <td
                className={cn('relative w-16', pad)}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="h-7 w-7" aria-hidden />
                {notesOf(item)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FieldCell({
  field,
  value,
  style,
  ratings,
  item,
  schema,
}: {
  field: FieldDef
  value: unknown
  style?: FieldViewStyle
  ratings: ItemRating[]
  item: ItemRow
  schema: ListSchema
}) {
  const meta = fileMeta(value)
  if (
    meta &&
    (field.type === 'image' || (field.type === 'file' && isImageFile(meta)))
  ) {
    return <FileThumb value={value} className="h-14 w-10 rounded-lg" alt="" />
  }
  if (field.type === 'select') {
    const opt = field.config?.options?.find(
      (o) => o.value === String(value ?? ''),
    )
    if (opt) {
      return (
        <span className="inline-flex items-center gap-1.5">
          {opt.color ? (
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: opt.color }}
            />
          ) : null}
          {opt.label}
        </span>
      )
    }
  }
  return (
    <StyledValue
      field={field}
      value={value}
      style={style}
      ratings={ratings}
      itemId={item.id}
      values={item.values}
      schema={schema}
    />
  )
}

function SelectBox({
  selected,
  onChange,
}: {
  selected: boolean
  onChange: () => void
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        'flex h-5 w-5 items-center justify-center rounded border',
        selected ? 'border-accent bg-accent text-on-accent' : 'border-line',
      )}
      aria-pressed={selected}
    >
      {selected ? <Check size={12} /> : null}
    </button>
  )
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
        checked ? 'border-accent bg-accent text-on-accent' : 'border-line',
      )}
      aria-pressed={checked}
    >
      {checked ? <Check size={14} /> : null}
    </button>
  )
}

function ConfiguredCard({
  item,
  schema,
  view,
  titleId,
  coverId,
  enableCheck,
  notes,
  renderField,
  onOpen,
  onToggle,
  selectMode,
  selected,
  highlighted,
  onToggleSelect,
  draggable,
}: {
  item: ItemRow
  schema: ListSchema
  view: NamedView
  titleId?: string
  coverId?: string
  enableCheck?: boolean
  notes: ReactNode
  renderField: (item: ItemRow, style: FieldViewStyle) => ReactNode
  onOpen: (item: ItemRow) => void
  onToggle?: (item: ItemRow, next: boolean) => void
  selectMode?: boolean
  selected?: boolean
  highlighted?: boolean
  onToggleSelect?: (item: ItemRow) => void
  draggable?: boolean
}) {
  const layout = view.cardLayout ?? 'grid'
  const cover = coverId ? item.values[coverId] : undefined
  const coverField = coverId
    ? schema.fields.find((f) => f.id === coverId)
    : undefined
  const hasCover = Boolean(coverId && hasCoverVisual(cover))
  const titles = fieldsWithRole(view, 'title')
  const subtitle = fieldsWithRole(view, 'subtitle')
  const badges = fieldsWithRole(view, 'badge')
  const meta = fieldsWithRole(view, 'meta')
  const titleText = titleFromValues(
    item.values,
    titles.length ? titles.map((s) => s.fieldId) : titleId,
  )
  const titleNode = (
    <ItemTitle
      item={item}
      styles={titles}
      titleId={titleId}
      renderField={renderField}
    />
  )
  const coverNode = (className: string) =>
    coverId ? (
      <CoverSlot
        field={coverField}
        value={cover}
        className={className}
        alt={titleText}
        fallback={renderField(
          item,
          styleForField(view, coverId) ?? { fieldId: coverId, role: 'cover' },
        )}
      />
    ) : null

  const ring = cn(
    highlighted && 'ring-2 ring-accent',
    selected && 'ring-1 ring-accent',
  )

  const dragProps = draggable
    ? {
        draggable: true,
        onDragStart: (event: DragEvent) => {
          event.dataTransfer.setData('text/chroniqe-item', item.id)
          event.dataTransfer.effectAllowed = 'move'
        },
      }
    : {}

  if (layout === 'compact') {
    return (
      <article
        {...dragProps}
        className={cn(
          'group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-line bg-paper px-3 py-2.5 shadow-lift',
          ring,
        )}
      >
        {selectMode && onToggleSelect ? (
          <SelectBox
            selected={Boolean(selected)}
            onChange={() => onToggleSelect(item)}
          />
        ) : null}
        {enableCheck && onToggle ? (
          <CheckToggle
            checked={item.is_checked}
            onChange={(n) => onToggle(item, n)}
          />
        ) : null}
        {hasCover ? coverNode('h-10 w-8 shrink-0 rounded-md') : null}
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpen(item)}
        >
          <p
            className={cn(
              'text-sm font-medium',
              item.is_checked && 'checked-out',
            )}
          >
            {titleNode}
          </p>
          {subtitle.length ? (
            <p className="truncate text-xs text-muted">
              <JoinedFields
                item={item}
                styles={subtitle}
                renderField={renderField}
              />
            </p>
          ) : null}
        </button>
        <BadgeRow
          item={item}
          badges={badges}
          schema={schema}
          renderField={renderField}
          className="max-w-[9rem] justify-end"
        />
        <div className="relative h-7 w-7 shrink-0">{notes}</div>
      </article>
    )
  }

  if (layout === 'media') {
    return (
      <article
        className={cn(
          'group relative overflow-hidden rounded-2xl border border-line bg-paper text-left shadow-lift',
          ring,
        )}
      >
        {selectMode && onToggleSelect ? (
          <div className="absolute left-2 top-2 z-10">
            <SelectBox
              selected={Boolean(selected)}
              onChange={() => onToggleSelect(item)}
            />
          </div>
        ) : null}
        <button
          type="button"
          className="block w-full text-left"
          onClick={() => onOpen(item)}
        >
          {coverNode('aspect-[3/4] w-full')}
          <div className="p-3">
            <p
              className={cn(
                'text-sm font-medium',
                item.is_checked && 'checked-out',
              )}
            >
              {titleNode}
            </p>
            {subtitle.length ? (
              <p className="mt-0.5 text-xs text-muted">
                <JoinedFields
                  item={item}
                  styles={subtitle}
                  renderField={renderField}
                />
              </p>
            ) : null}
            <BadgeRow
              item={item}
              badges={badges}
              schema={schema}
              className="mt-2"
              renderField={renderField}
            />
          </div>
        </button>
        <div className="absolute right-2 top-2 z-10 w-[min(70%,16rem)]">
          {notes}
        </div>
      </article>
    )
  }

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-line bg-paper shadow-lift',
        ring,
      )}
    >
      <div className="absolute right-2 top-2 z-10 w-[min(70%,16rem)]">
        {notes}
      </div>
      {hasCover ? coverNode('aspect-[16/10] w-full') : null}
      <div className={hasCover ? 'p-3' : 'p-3 pr-12'}>
        <div className="flex items-start gap-2">
          {selectMode && onToggleSelect ? (
            <SelectBox
              selected={Boolean(selected)}
              onChange={() => onToggleSelect(item)}
            />
          ) : null}
          {enableCheck && onToggle ? (
            <CheckToggle
              checked={item.is_checked}
              onChange={(n) => onToggle(item, n)}
            />
          ) : null}
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => onOpen(item)}
          >
            <h3 className={cn('font-medium', item.is_checked && 'checked-out')}>
              {titleNode}
            </h3>
            {subtitle.length ? (
              <p className="mt-0.5 text-sm text-muted">
                <JoinedFields
                  item={item}
                  styles={subtitle}
                  renderField={renderField}
                />
              </p>
            ) : null}
            <BadgeRow
              item={item}
              badges={badges}
              schema={schema}
              className="mt-2"
              renderField={renderField}
            />
          </button>
        </div>
        {meta.length ? (
          <dl className="mt-2 space-y-1 text-xs text-muted">
            {meta.map((s) => {
              const field = schema.fields.find((f) => f.id === s.fieldId)
              if (!field) return null
              return (
                <div key={s.fieldId} className="flex justify-between gap-2">
                  <dt>{field.name}</dt>
                  <dd className="text-ink/80">{renderField(item, s)}</dd>
                </div>
              )
            })}
          </dl>
        ) : null}
      </div>
    </article>
  )
}

function JoinedFields({
  item,
  styles,
  renderField,
}: {
  item: ItemRow
  styles: FieldViewStyle[]
  renderField: (item: ItemRow, style: FieldViewStyle) => ReactNode
}) {
  if (!styles.length) return null
  return (
    <>
      {styles.map((s, i) => (
        <span key={s.fieldId}>
          {i > 0 ? ' · ' : null}
          {renderField(item, s)}
        </span>
      ))}
    </>
  )
}

function ItemTitle({
  item,
  styles,
  titleId,
  renderField,
}: {
  item: ItemRow
  styles: FieldViewStyle[]
  titleId?: string
  renderField: (item: ItemRow, style: FieldViewStyle) => ReactNode
}) {
  if (!styles.length) return <>{titleFromValues(item.values, titleId)}</>
  return <JoinedFields item={item} styles={styles} renderField={renderField} />
}

function BadgeRow({
  item,
  badges,
  schema,
  className,
  renderField,
}: {
  item: ItemRow
  badges: FieldViewStyle[]
  schema: ListSchema
  className?: string
  renderField: (item: ItemRow, style: FieldViewStyle) => ReactNode
}) {
  if (!badges.length) return null
  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {badges.map((s) => {
        const field = schema.fields.find((f) => f.id === s.fieldId)
        if (!field) return null
        const raw = item.values[field.id]
        const opt = field.config?.options?.find(
          (o) => o.value === String(raw ?? ''),
        )
        return (
          <span
            key={s.fieldId}
            className="bg-ink/5 text-ink/80 rounded-full px-2 py-0.5 text-[11px]"
            style={
              opt?.color
                ? { background: `${opt.color}22`, color: opt.color }
                : undefined
            }
          >
            {opt?.label ?? renderField(item, s)}
          </span>
        )
      })}
    </div>
  )
}

function boardGroups(
  field: FieldDef | undefined,
  items: ItemRow[],
  t: (key: string) => string,
): Array<{ value: string; label: string; color?: string }> {
  if (!field) return []
  if (field.type === 'boolean' || field.type === 'checkbox') {
    return [
      { value: 'true', label: t('fields.yes') },
      { value: 'false', label: t('fields.no') },
    ]
  }
  if (field.type === 'select' || field.type === 'multiselect') {
    const options = field.config?.options ?? []
    if (options.length)
      return options.map((o) => ({
        value: o.value,
        label: o.label,
        color: o.color,
      }))
  }
  if (field.type === 'tags' || field.type === 'multiselect') {
    return collectedTags(items, field).map((tag) => ({
      value: tag,
      label: tag,
    }))
  }
  return (field.config?.options ?? []).map((o) => ({
    value: o.value,
    label: o.label,
    color: o.color,
  }))
}

function itemInGroup(
  item: ItemRow,
  field: FieldDef,
  groupValue: string,
): boolean {
  const raw = item.values[field.id]
  if (field.type === 'boolean' || field.type === 'checkbox') {
    return Boolean(raw) === (groupValue === 'true')
  }
  if (Array.isArray(raw)) {
    return raw.map(String).includes(groupValue)
  }
  return String(raw ?? '') === groupValue
}

function BoardColumn({
  title,
  color,
  children,
  items,
  canDrop,
  onDropItem,
}: {
  title: string
  color?: string
  children: ReactNode
  items: ItemRow[]
  canDrop?: boolean
  onDropItem?: (item: ItemRow) => void
}) {
  return (
    <div
      className="bg-ink/[0.04] w-72 shrink-0 rounded-2xl p-3"
      onDragOver={(event) => {
        if (canDrop) event.preventDefault()
      }}
      onDrop={(event) => {
        event.preventDefault()
        const id = event.dataTransfer.getData('text/chroniqe-item')
        const item = items.find((row) => row.id === id)
        if (item && onDropItem) onDropItem(item)
      }}
    >
      <h3
        className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted"
        style={color ? { color } : undefined}
      >
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
