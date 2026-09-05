import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ItemRow, ListSchema, NamedView } from '../../types/domain'
import { itemDateIso } from '../../lib/filters'
import { cn, titleFromValues } from '../../lib/cn'
import { usePrefs } from '../../context/PrefsContext'
import Button from '../ui/Button'

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0]

const ITEM_MIME = 'text/chroniqe-item'

export default function CalendarMonth({
  schema,
  items,
  view,
  dateId,
  highlightedId,
  selectedIds,
  selectMode,
  canEdit,
  onOpen,
  onToggleSelect,
  onCreateOnDate,
  onMoveDate,
}: {
  schema: ListSchema
  items: ItemRow[]
  view: NamedView
  dateId: string
  highlightedId?: string
  selectedIds?: Set<string>
  selectMode?: boolean
  canEdit?: boolean
  onOpen: (item: ItemRow) => void
  onToggleSelect?: (item: ItemRow) => void
  onCreateOnDate?: (iso: string) => void
  onMoveDate?: (item: ItemRow, iso: string) => void
}) {
  const { t, locale } = usePrefs()
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const label = cursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  const byDay = useMemo(() => {
    const map = new Map<string, ItemRow[]>()
    for (const item of items) {
      const iso = itemDateIso(item.values[dateId])
      if (!iso) continue
      const list = map.get(iso) ?? []
      list.push(item)
      map.set(iso, list)
    }
    return map
  }, [items, dateId])

  const cells = useMemo(() => buildCells(year, month), [year, month])
  const weekdayLabels = WEEKDAYS.map((day) =>
    new Date(2024, 0, day === 0 ? 7 : day).toLocaleDateString(locale, { weekday: 'short' }),
  )
  const undated = items.filter((item) => !itemDateIso(item.values[dateId]))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          aria-label={t('calendar.prev')}
        >
          <ChevronLeft size={16} />
        </Button>
        <div className="flex items-center gap-2">
          <h3 className="font-serif text-xl capitalize">{label}</h3>
          <Button
            variant="soft"
            size="sm"
            onClick={() => {
              const now = new Date()
              setCursor(new Date(now.getFullYear(), now.getMonth(), 1))
            }}
          >
            {t('calendar.today')}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          aria-label={t('calendar.next')}
        >
          <ChevronRight size={16} />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wide text-muted">
        {weekdayLabels.map((name, index) => (
          <div key={index}>{name}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, index) => {
          if (!cell) return <div key={`e-${index}`} />
          const iso = toIso(year, month, cell)
          const dayItems = byDay.get(iso) ?? []
          const today = isToday(year, month, cell)
          return (
            <div
              key={iso}
              className={cn(
                'min-h-24 rounded-xl border border-line bg-paper p-1.5',
                today && 'ring-1 ring-accent',
                canEdit && onCreateOnDate && 'cursor-pointer',
              )}
              onDragOver={(event) => {
                if (canEdit && onMoveDate) event.preventDefault()
              }}
              onDrop={(event) => {
                event.preventDefault()
                const id = event.dataTransfer.getData(ITEM_MIME)
                const item = items.find((row) => row.id === id)
                if (item && onMoveDate) onMoveDate(item, iso)
              }}
              onClick={(event) => {
                if ((event.target as HTMLElement).closest('button')) return
                if (canEdit && onCreateOnDate) onCreateOnDate(iso)
              }}
            >
              <p className={cn('text-xs', today ? 'font-semibold text-accent' : 'text-muted')}>{cell}</p>
              <div className="mt-1 space-y-1">
                {dayItems.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    draggable={Boolean(canEdit && onMoveDate)}
                    className={cn(
                      'block w-full truncate rounded-md px-1 py-0.5 text-left text-[11px] hover:bg-ink/5',
                      item.is_checked && 'checked-out',
                      highlightedId === item.id && 'bg-accent-soft',
                      selectedIds?.has(item.id) && 'ring-1 ring-accent',
                    )}
                    onDragStart={(event) => {
                      event.dataTransfer.setData(ITEM_MIME, item.id)
                      event.dataTransfer.effectAllowed = 'move'
                    }}
                    onClick={() => {
                      if (selectMode && onToggleSelect) onToggleSelect(item)
                      else onOpen(item)
                    }}
                  >
                    {titleFromValues(item.values, view.titleFieldId ?? schema.titleFieldId)}
                  </button>
                ))}
                {dayItems.length > 3 ? (
                  <p className="px-1 text-[10px] text-muted">{t('calendar.more', { n: dayItems.length - 3 })}</p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
      {undated.length ? (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            {t('insights.noDate')}
          </p>
          <div className="flex flex-wrap gap-2">
            {undated.map((item) => (
              <button
                key={item.id}
                type="button"
                className="rounded-full bg-ink/5 px-3 py-1 text-xs hover:bg-ink/10"
                draggable={Boolean(canEdit && onMoveDate)}
                onDragStart={(event) => {
                  event.dataTransfer.setData(ITEM_MIME, item.id)
                  event.dataTransfer.effectAllowed = 'move'
                }}
                onClick={() => onOpen(item)}
              >
                {titleFromValues(item.values, schema.titleFieldId)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function buildCells(year: number, month: number): Array<number | null> {
  const first = new Date(year, month, 1)
  const days = new Date(year, month + 1, 0).getDate()
  const mondayBased = (first.getDay() + 6) % 7
  const cells: Array<number | null> = Array.from({ length: mondayBased }, () => null)
  for (let day = 1; day <= days; day += 1) cells.push(day)
  while (cells.length % 7) cells.push(null)
  return cells
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function isToday(year: number, month: number, day: number): boolean {
  const now = new Date()
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day
}

