import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Notebook, Pencil, StickyNote, Trash2, X } from 'lucide-react'
import { usePrefs } from '../../context/PrefsContext'
import { useToast } from '../../context/ToastContext'
import { addComment, deleteComment, updateComment } from '../../services/api'
import type { ItemComment, ItemRow, NoteColorId } from '../../types/domain'
import { NOTE_COLOR_IDS } from '../../types/domain'
import { cn, formatDateTime } from '../../lib/cn'
import Avatar from '../ui/Avatar'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { FieldWrap, Textarea } from '../ui/Input'

const NOTE_COLOR_HEX: Record<NoteColorId, string> = {
  violet: '#7c3aed',
  rose: '#e11d48',
  amber: '#d97706',
  teal: '#0d9488',
  sky: '#0284c7',
  emerald: '#059669',
  slate: '#64748b',
}

const PREVIEW = 2
const ICON = 28
const GAP = 2
const SLOT = ICON + GAP

type NoteDraft = {
  body: string
  color: NoteColorId
  showAuthor: boolean
  showTime: boolean
}

function noteColor(value?: string | null): string {
  if (value && value in NOTE_COLOR_HEX) return NOTE_COLOR_HEX[value as NoteColorId]
  return NOTE_COLOR_HEX.violet
}

function showsAuthor(note: ItemComment): boolean {
  return note.show_author !== false
}

function showsTime(note: ItemComment): boolean {
  return note.show_time !== false
}

function panelStyle(anchor: DOMRect): CSSProperties {
  const width = Math.min(320, window.innerWidth - 16)
  const gap = 8
  const spaceBelow = window.innerHeight - anchor.bottom - gap
  const spaceAbove = anchor.top - gap
  const above = spaceBelow < 220 && spaceAbove > spaceBelow
  const left = Math.min(Math.max(8, anchor.right - width), window.innerWidth - width - 8)
  const maxHeight = Math.min(360, Math.max(160, (above ? spaceAbove : spaceBelow) - 8))
  if (above) {
    return { left, width, bottom: window.innerHeight - anchor.top + gap, maxHeight }
  }
  return { left, width, top: anchor.bottom + gap, maxHeight }
}

function authorName(note: ItemComment, fallback: string): string {
  return note.profile?.display_name || note.profile?.username || fallback
}

function slotsThatFit(width: number, hasAdd: boolean): number {
  const add = hasAdd ? SLOT : 0
  const room = width - add
  if (room < ICON) return 1
  return Math.max(1, Math.floor((room + GAP) / SLOT))
}

function contentRight(el: HTMLElement): number {
  const kids = [...el.children] as HTMLElement[]
  if (kids.length) {
    return Math.max(...kids.map((k) => k.getBoundingClientRect().right))
  }
  const range = document.createRange()
  range.selectNodeContents(el)
  const rects = [...range.getClientRects()]
  if (rects.length) return Math.max(...rects.map((r) => r.right))
  return el.getBoundingClientRect().left
}

function leftoverWidth(el: HTMLElement): number {
  const row = el.closest('tr, li, article')
  const host = el.offsetParent instanceof HTMLElement ? el.offsetParent : el.parentElement
  if (!row || !host) return el.clientWidth
  const rowBox = row.getBoundingClientRect()
  const prev = host.previousElementSibling
  const start = prev instanceof HTMLElement ? contentRight(prev) + 8 : host.getBoundingClientRect().left
  const avail = rowBox.right - 12 - start
  return Math.max(ICON, avail)
}

function NoteCard({
  note,
  someone,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  note: ItemComment
  someone: string
  canEdit?: boolean
  canDelete?: boolean
  onEdit?: () => void
  onDelete?: () => void
}) {
  const { t } = usePrefs()
  const author = showsAuthor(note)
  const time = showsTime(note)
  return (
    <article className="rounded-xl bg-ink/[0.04] px-3 py-2 text-sm">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="h-1 w-8 rounded-full" style={{ background: noteColor(note.color) }} />
        {canEdit || canDelete ? (
          <div className="flex items-center gap-0.5">
            {canEdit && onEdit ? (
              <button
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-ink/5 hover:text-ink"
                aria-label={t('itemNotes.edit')}
                title={t('itemNotes.edit')}
                onClick={onEdit}
              >
                <Pencil size={13} />
              </button>
            ) : null}
            {canDelete && onDelete ? (
              <button
                type="button"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted hover:bg-ink/5 hover:text-rose-700"
                aria-label={t('common.delete')}
                title={t('common.delete')}
                onClick={onDelete}
              >
                <Trash2 size={13} />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <p className="whitespace-pre-wrap break-words">{note.body}</p>
      {author || time ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
          {author ? (
            <>
              <Avatar name={authorName(note, someone)} url={note.profile?.avatar_url} size={16} />
              <span>{authorName(note, someone)}</span>
            </>
          ) : null}
          {author && time ? <span>·</span> : null}
          {time ? <span>{formatDateTime(note.created_at)}</span> : null}
        </p>
      ) : null}
    </article>
  )
}

function NoteIconButton({
  color,
  count,
  label,
  onHover,
  onLeave,
  onClick,
}: {
  color: string
  count?: number
  label: string
  onHover: (el: HTMLElement) => void
  onLeave: () => void
  onClick: (el: HTMLElement) => void
}) {
  return (
    <button
      type="button"
      className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg hover:bg-ink/5"
      style={{ color }}
      aria-label={label}
      onMouseEnter={(e) => onHover(e.currentTarget)}
      onMouseLeave={onLeave}
      onClick={(e) => onClick(e.currentTarget)}
    >
      <StickyNote size={16} fill="currentColor" />
      {count && count > 1 ? (
        <span className="absolute -right-1 -top-1 min-w-3.5 rounded-full bg-paper px-0.5 text-[10px] font-semibold text-ink ring-1 ring-line">
          {count}
        </span>
      ) : null}
    </button>
  )
}

export default function ItemNotesMarker({
  item,
  notes,
  userId,
  canAdd,
  canManage,
  variant = 'plain',
  onCreated,
  onUpdated,
  onDeleted,
}: {
  item: ItemRow
  notes: ItemComment[]
  userId?: string
  canAdd?: boolean
  canManage?: boolean
  variant?: 'plain' | 'overlay'
  onCreated: (row: ItemComment) => void
  onUpdated: (row: ItemComment) => void
  onDeleted: (id: string) => void
}) {
  const { t } = usePrefs()
  const { toast } = useToast()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [slots, setSlots] = useState(() => Math.max(notes.length, 1))
  const [plainWidth, setPlainWidth] = useState<number>()
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<ItemComment | null>(null)
  const [allOpen, setAllOpen] = useState(false)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [openNote, setOpenNote] = useState<ItemComment | null>(null)
  const [style, setStyle] = useState<CSSProperties>({})
  const leaveTimer = useRef<number>(0)

  const overflow = notes.length > slots
  const shown = overflow ? Math.max(0, slots - 1) : notes.length
  const visibleNotes = shown ? notes.slice(-shown) : []
  const overflowNotes = overflow ? notes.slice(0, notes.length - shown) : []
  const preview = (openNote ? [openNote] : overflowNotes).slice(-PREVIEW).reverse()
  const hiddenCount = openNote ? 0 : Math.max(0, overflowNotes.length - PREVIEW)

  const closeSoon = () => {
    window.clearTimeout(leaveTimer.current)
    leaveTimer.current = window.setTimeout(() => {
      if (!pinned) setOpen(false)
    }, 400)
  }

  const keepOpen = () => {
    window.clearTimeout(leaveTimer.current)
    if (notes.length) setOpen(true)
  }

  const closePreview = () => {
    setOpen(false)
    setPinned(false)
    setOpenNote(null)
    setAnchor(null)
  }

  const openFrom = (el: HTMLElement, note: ItemComment | null) => {
    window.clearTimeout(leaveTimer.current)
    setAnchor(el)
    setOpenNote(note)
    setOpen(true)
  }

  const removeNote = async (note: ItemComment) => {
    try {
      await deleteComment(note.id)
      onDeleted(note.id)
      if (notes.length <= 1) {
        closePreview()
        setAllOpen(false)
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : t('common.error'), 'err')
    }
  }

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const row = el.closest('tr, li, article')
    const measure = () => {
      const width = variant === 'plain' ? leftoverWidth(el) : el.clientWidth
      if (variant === 'plain') setPlainWidth(width)
      setSlots(slotsThatFit(width, Boolean(canAdd)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (row) ro.observe(row)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [canAdd, notes.length, variant])

  useLayoutEffect(() => {
    if (!open || !anchor) return
    const place = () => setStyle(panelStyle(anchor.getBoundingClientRect()))
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, anchor, openNote])

  useEffect(() => {
    return () => window.clearTimeout(leaveTimer.current)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePreview()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!notes.length && !canAdd) return null

  const renderCard = (note: ItemComment) => (
    <NoteCard
      key={note.id}
      note={note}
      someone={t('list.someone')}
      canEdit={note.user_id === userId}
      canDelete={canManage || note.user_id === userId}
      onEdit={() => {
        closePreview()
        setAllOpen(false)
        setEditing(note)
      }}
      onDelete={() => void removeNote(note)}
    />
  )

  return (
    <div
      ref={wrapRef}
      className={cn(
        'flex min-w-0 items-center justify-end',
        variant === 'overlay' && 'w-full',
        variant === 'plain' && 'absolute right-0 top-1/2 z-[1] -translate-y-1/2',
      )}
      style={variant === 'plain' && plainWidth ? { width: plainWidth } : undefined}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div
        className={cn(
          'flex items-center gap-0.5',
          variant === 'overlay' && 'rounded-xl bg-paper/90 p-0.5 shadow-sm ring-1 ring-line/80 backdrop-blur-sm',
        )}
      >
      {overflowNotes.length ? (
        <NoteIconButton
          color={noteColor(overflowNotes[overflowNotes.length - 1]?.color)}
          count={overflowNotes.length}
          label={t('itemNotes.title')}
          onHover={(el) => openFrom(el, null)}
          onLeave={closeSoon}
          onClick={(el) => {
            openFrom(el, null)
            setPinned(true)
          }}
        />
      ) : null}
      {visibleNotes.map((note) => (
        <NoteIconButton
          key={note.id}
          color={noteColor(note.color)}
          label={t('itemNotes.one')}
          onHover={(el) => openFrom(el, note)}
          onLeave={closeSoon}
          onClick={(el) => {
            openFrom(el, note)
            setPinned(true)
          }}
        />
      ))}

      {canAdd ? (
        <button
          type="button"
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-ink/5 hover:text-ink',
            notes.length
              ? 'opacity-0 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100'
              : 'opacity-70 group-hover:opacity-100',
          )}
          aria-label={t('itemNotes.add')}
          title={t('itemNotes.add')}
          onClick={() => setAdding(true)}
        >
          <Notebook size={15} />
        </button>
      ) : null}
      </div>

      {open && notes.length
        ? createPortal(
            <div className="pointer-events-none fixed inset-0 z-[60]">
              {pinned ? (
                <button
                  type="button"
                  className="pointer-events-auto absolute inset-0"
                  aria-label={t('common.close')}
                  onClick={closePreview}
                />
              ) : null}
              <div
                role="dialog"
                aria-label={t('itemNotes.title')}
                className="pointer-events-auto absolute z-10 flex flex-col overflow-hidden rounded-2xl border border-line bg-paper p-3 shadow-lift"
                style={{
                  ...style,
                  visibility: style.top != null || style.bottom != null ? 'visible' : 'hidden',
                }}
                onMouseEnter={keepOpen}
                onMouseLeave={closeSoon}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{t('itemNotes.title')}</p>
                  <Button variant="ghost" size="sm" aria-label={t('common.close')} onClick={closePreview}>
                    <X size={16} />
                  </Button>
                </div>
                <div className="min-h-0 space-y-2 overflow-y-auto">{preview.map(renderCard)}</div>
                {hiddenCount > 0 ? (
                  <Button
                    variant="soft"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => {
                      closePreview()
                      setAllOpen(true)
                    }}
                  >
                    {t('itemNotes.seeAll')} · {t('itemNotes.more', { n: hiddenCount })}
                  </Button>
                ) : null}
                {canAdd ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 w-full"
                    onClick={() => {
                      closePreview()
                      setAdding(true)
                    }}
                  >
                    <Notebook size={14} /> {t('itemNotes.add')}
                  </Button>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}

      {adding && userId ? (
        <NoteFormModal
          title={t('itemNotes.add')}
          submitLabel={t('itemNotes.add')}
          onClose={() => setAdding(false)}
          onSave={async (draft) => {
            try {
              const row = await addComment({
                item_id: item.id,
                user_id: userId,
                body: draft.body,
                color: draft.color,
                show_author: draft.showAuthor,
                show_time: draft.showTime,
              })
              onCreated(row)
              setAdding(false)
            } catch (e) {
              toast(e instanceof Error ? e.message : t('common.error'), 'err')
            }
          }}
        />
      ) : null}

      {editing ? (
        <NoteFormModal
          title={t('itemNotes.edit')}
          submitLabel={t('common.save')}
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={async (draft) => {
            try {
              const row = await updateComment(editing.id, {
                body: draft.body,
                color: draft.color,
                show_author: draft.showAuthor,
                show_time: draft.showTime,
              })
              onUpdated(row)
              setEditing(null)
            } catch (e) {
              toast(e instanceof Error ? e.message : t('common.error'), 'err')
            }
          }}
        />
      ) : null}

      {allOpen ? (
        <Modal open title={t('itemNotes.all')} onClose={() => setAllOpen(false)}>
          <div className="space-y-2">{notes.map(renderCard)}</div>
          {canAdd ? (
            <Button
              variant="soft"
              className="mt-4 w-full"
              onClick={() => {
                setAllOpen(false)
                setAdding(true)
              }}
            >
              <Notebook size={14} /> {t('itemNotes.add')}
            </Button>
          ) : null}
        </Modal>
      ) : null}
    </div>
  )
}

function NoteFormModal({
  title,
  submitLabel,
  initial,
  onClose,
  onSave,
}: {
  title: string
  submitLabel: string
  initial?: ItemComment
  onClose: () => void
  onSave: (draft: NoteDraft) => Promise<void>
}) {
  const { t } = usePrefs()
  const [body, setBody] = useState(initial?.body ?? '')
  const [color, setColor] = useState<NoteColorId>(
    initial?.color && initial.color in NOTE_COLOR_HEX ? (initial.color as NoteColorId) : 'violet',
  )
  const [showAuthor, setShowAuthor] = useState(initial ? showsAuthor(initial) : true)
  const [showTime, setShowTime] = useState(initial ? showsTime(initial) : true)
  const [busy, setBusy] = useState(false)

  return (
    <Modal open title={title} onClose={onClose}>
      <FieldWrap label={t('itemNotes.one')}>
        <Textarea
          value={body}
          maxLength={4000}
          placeholder={t('itemNotes.placeholder')}
          onChange={(e) => setBody(e.target.value)}
        />
      </FieldWrap>
      <div className="mt-4">
        <p className="mb-2 text-sm font-medium">{t('itemNotes.color')}</p>
        <div className="flex flex-wrap gap-2">
          {NOTE_COLOR_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-label={id}
              aria-pressed={color === id}
              className={cn(
                'h-7 w-7 rounded-full ring-offset-2 ring-offset-paper',
                color === id ? 'ring-2 ring-ink' : 'ring-1 ring-line',
              )}
              style={{ background: NOTE_COLOR_HEX[id] }}
              onClick={() => setColor(id)}
            />
          ))}
        </div>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showAuthor} onChange={(e) => setShowAuthor(e.target.checked)} />
        {t('itemNotes.showAuthor')}
      </label>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showTime} onChange={(e) => setShowTime(e.target.checked)} />
        {t('itemNotes.showTime')}
      </label>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          {t('common.close')}
        </Button>
        <Button
          disabled={!body.trim() || busy}
          onClick={() => {
            const text = body.trim()
            if (!text) return
            setBusy(true)
            void onSave({ body: text, color, showAuthor, showTime }).finally(() => setBusy(false))
          }}
        >
          {submitLabel}
        </Button>
      </div>
    </Modal>
  )
}

export function ItemNotesPanel({
  item,
  notes,
  userId,
  canAdd,
  canManage,
  onCreated,
  onUpdated,
  onDeleted,
}: {
  item: ItemRow
  notes: ItemComment[]
  userId?: string
  canAdd?: boolean
  canManage?: boolean
  onCreated: (row: ItemComment) => void
  onUpdated: (row: ItemComment) => void
  onDeleted: (id: string) => void
}) {
  const { t } = usePrefs()
  const { toast } = useToast()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<ItemComment | null>(null)

  return (
    <section className="mt-5 border-t border-line pt-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium">{t('itemNotes.title')}</h3>
        {canAdd && userId ? (
          <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
            <Notebook size={14} /> {t('itemNotes.add')}
          </Button>
        ) : null}
      </div>
      {notes.length ? (
        <div className="space-y-2">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              someone={t('list.someone')}
              canEdit={note.user_id === userId}
              canDelete={Boolean(canManage || note.user_id === userId)}
              onEdit={() => setEditing(note)}
              onDelete={() => {
                void deleteComment(note.id)
                  .then(() => onDeleted(note.id))
                  .catch((error) => toast(error instanceof Error ? error.message : t('common.error'), 'err'))
              }}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">{t('itemNotes.empty')}</p>
      )}
      {adding && userId ? (
        <NoteFormModal
          title={t('itemNotes.add')}
          submitLabel={t('itemNotes.add')}
          onClose={() => setAdding(false)}
          onSave={async (draft) => {
            const row = await addComment({
              item_id: item.id,
              user_id: userId,
              body: draft.body,
              color: draft.color,
              show_author: draft.showAuthor,
              show_time: draft.showTime,
            })
            onCreated(row)
            setAdding(false)
          }}
        />
      ) : null}
      {editing ? (
        <NoteFormModal
          title={t('itemNotes.edit')}
          submitLabel={t('common.save')}
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={async (draft) => {
            const row = await updateComment(editing.id, {
              body: draft.body,
              color: draft.color,
              show_author: draft.showAuthor,
              show_time: draft.showTime,
            })
            onUpdated(row)
            setEditing(null)
          }}
        />
      ) : null}
    </section>
  )
}
