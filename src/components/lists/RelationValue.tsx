import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { FieldDef, ItemRow, ListRow, RelationDisplay } from '../../types/domain'
import { cn } from '../../lib/cn'
import { refIds, refLabel } from '../../lib/refs'
import {
  loadRelatedItems,
  loadRelatedList,
  relatedCoverField,
  relatedItemCover,
  relatedItemTitle,
} from '../../lib/relationCache'
import CoverSlot from './CoverSlot'

type ResolvedRef = {
  id: string
  title: string
  cover: unknown
  missing?: boolean
}

export default function RelationValue({
  field,
  value,
  className,
  size = 'md',
}: {
  field: FieldDef
  value: unknown
  className?: string
  size?: 'sm' | 'md'
}) {
  const relatedListId = field.config?.relatedListId
  const mode: RelationDisplay = field.config?.relationDisplay ?? 'title'
  const ids = refIds(value)
  const [list, setList] = useState<ListRow | null>(null)
  const [byId, setById] = useState<Map<string, ItemRow>>(new Map())
  const [ready, setReady] = useState(!relatedListId || !ids.length)

  useEffect(() => {
    if (!relatedListId || !ids.length) {
      setReady(true)
      return
    }
    let cancelled = false
    setReady(false)
    void Promise.all([loadRelatedList(relatedListId), loadRelatedItems(relatedListId)]).then(
      ([nextList, items]) => {
        if (cancelled) return
        setList(nextList)
        setById(new Map(items.map((item) => [item.id, item])))
        setReady(true)
      },
    )
    return () => {
      cancelled = true
    }
    // ids joined — stable key for the selected set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relatedListId, ids.join('|')])

  if (!ids.length) {
    return <span className={cn('text-muted', className)}>—</span>
  }

  const refs: ResolvedRef[] = ids.map((id) => {
    const live = byId.get(id)
    if (live) {
      return {
        id,
        title: relatedItemTitle(live, list),
        cover: relatedItemCover(live, list),
      }
    }
    const snapshot = snapshotTitle(value, id)
    return {
      id,
      title: snapshot || id.slice(0, 8),
      cover: null,
      missing: ready,
    }
  })

  const coverField = relatedCoverField(list)
  const wrap = mode === 'media' ? 'flex flex-wrap gap-2' : 'inline-flex flex-wrap items-center gap-1.5'

  return (
    <span className={cn(wrap, className)}>
      {refs.map((ref) => (
        <RelationChip
          key={ref.id}
          refItem={ref}
          mode={mode}
          size={size}
          relatedListId={relatedListId}
          coverField={coverField}
        />
      ))}
    </span>
  )
}

function RelationChip({
  refItem,
  mode,
  size,
  relatedListId,
  coverField,
}: {
  refItem: ResolvedRef
  mode: RelationDisplay
  size: 'sm' | 'md'
  relatedListId?: string
  coverField?: FieldDef
}) {
  const href = relatedListId ? `/lists/${relatedListId}?item=${refItem.id}` : undefined
  const titleCls = cn(
    'truncate font-medium',
    refItem.missing ? 'text-muted line-through' : 'text-ink',
    size === 'sm' ? 'text-xs' : 'text-sm',
  )

  if (mode === 'title') {
    const body = <span className={titleCls}>{refItem.title}</span>
    return href ? (
      <Link
        to={href}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex max-w-full rounded-lg px-1.5 py-0.5 hover:bg-ink/5"
      >
        {body}
      </Link>
    ) : (
      body
    )
  }

  if (mode === 'title_cover') {
    const thumb = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'
    const inner = (
      <>
        <CoverSlot
          field={coverField}
          value={refItem.cover}
          alt={refItem.title}
          className={cn(thumb, 'shrink-0 rounded-md')}
          fallback={<span className="px-1 text-[10px] text-muted">·</span>}
        />
        <span className={titleCls}>{refItem.title}</span>
      </>
    )
    return href ? (
      <Link
        to={href}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex max-w-full items-center gap-2 rounded-xl border border-line/70 bg-paper/80 py-1 pl-1 pr-2 hover:border-ink/20"
      >
        {inner}
      </Link>
    ) : (
      <span className="inline-flex max-w-full items-center gap-2 rounded-xl border border-line/70 bg-paper/80 py-1 pl-1 pr-2">
        {inner}
      </span>
    )
  }

  // media
  const card = (
    <>
      <CoverSlot
        field={coverField}
        value={refItem.cover}
        alt={refItem.title}
        className={cn('aspect-[2/3] w-full', size === 'sm' ? 'rounded-lg' : 'rounded-xl')}
        fallback={<span className="line-clamp-3 p-2 font-serif text-xs">{refItem.title}</span>}
      />
      <span className={cn('mt-1 line-clamp-2 text-center', titleCls)}>{refItem.title}</span>
    </>
  )
  const box = cn('flex w-20 flex-col', size === 'sm' ? 'w-16' : 'w-20')
  return href ? (
    <Link to={href} onClick={(e) => e.stopPropagation()} className={cn(box, 'hover:opacity-90')}>
      {card}
    </Link>
  ) : (
    <span className={box}>{card}</span>
  )
}

function snapshotTitle(value: unknown, id: string): string {
  if (Array.isArray(value)) {
    for (const row of value) {
      if (refIdMatch(row, id)) return refLabel(row)
    }
    return ''
  }
  if (refIdMatch(value, id)) return refLabel(value)
  return ''
}

function refIdMatch(value: unknown, id: string): boolean {
  if (typeof value === 'string') return value === id
  if (value && typeof value === 'object' && 'id' in value) {
    return String((value as { id: unknown }).id) === id
  }
  return false
}
