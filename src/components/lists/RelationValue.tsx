import { type ReactNode, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Link2 } from 'lucide-react'
import type { FieldDef, ItemRow, ListRow, RelationDisplay } from '../../types/domain'
import { usePrefs } from '../../context/PrefsContext'
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
  const { t } = usePrefs()
  const href = relatedListId ? `/lists/${relatedListId}?item=${refItem.id}` : undefined
  const openHint = t('fields.openLinkedItem')
  const titleCls = cn(
    'min-w-0 font-medium',
    refItem.missing ? 'text-muted line-through' : 'text-ink',
    size === 'sm' ? 'text-xs' : 'text-sm',
  )

  if (mode === 'title') {
    const body = (
      <>
        {href ? <LinkGlyph size={size} /> : null}
        <span className={cn(titleCls, 'truncate')}>{refItem.title}</span>
      </>
    )
    return wrapRef(
      href,
      cn(
        'group/rel inline-flex max-w-full items-center gap-1 rounded-lg',
        size === 'md' ? 'px-1.5 py-0.5' : 'px-1 py-px',
        href && 'rel-link',
      ),
      body,
      refItem.title,
      openHint,
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
        <span className={cn(titleCls, 'truncate')}>{refItem.title}</span>
        {href ? <LinkGlyph size={size} /> : null}
      </>
    )
    return wrapRef(
      href,
      'group/rel inline-flex max-w-full items-center gap-1.5 rounded-xl border border-line/70 bg-paper/80 py-1 pl-1 pr-2 hover:border-ink/25 hover:bg-ink/[0.03]',
      inner,
      refItem.title,
      openHint,
    )
  }

  const card = (
    <>
      <span className="relative block w-full">
        <CoverSlot
          field={coverField}
          value={refItem.cover}
          alt={refItem.title}
          className={cn('aspect-[2/3] w-full', size === 'sm' ? 'rounded-lg' : 'rounded-xl')}
          fallback={<span className="line-clamp-3 p-2 font-serif text-xs">{refItem.title}</span>}
        />
        {href ? (
          <span className="pointer-events-none absolute right-1 top-1 rounded-md bg-paper p-0.5 text-muted shadow-sm">
            <Link2 size={size === 'sm' ? 10 : 11} strokeWidth={2} aria-hidden />
          </span>
        ) : null}
      </span>
      <span className={cn('mt-1 line-clamp-2 text-center', titleCls)}>{refItem.title}</span>
    </>
  )
  const box = cn('group/rel flex flex-col', size === 'sm' ? 'w-16' : 'w-20', href && 'hover:opacity-90')
  return wrapRef(href, box, card, refItem.title, openHint)
}

function LinkGlyph({ size }: { size: 'sm' | 'md' }) {
  return (
    <Link2
      size={size === 'sm' ? 12 : 13}
      strokeWidth={2}
      aria-hidden
      className="shrink-0 text-muted transition-colors group-hover/rel:text-ink"
    />
  )
}

function wrapRef(
  href: string | undefined,
  className: string,
  children: ReactNode,
  title: string,
  openHint: string,
) {
  if (!href) return <span className={className}>{children}</span>
  return (
    <Link
      to={href}
      onClick={(e) => e.stopPropagation()}
      className={className}
      title={openHint}
      aria-label={`${title}. ${openHint}`}
    >
      {children}
    </Link>
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
