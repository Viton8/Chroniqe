import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

export type DropOption = {
  value: string
  label: string
  disabled?: boolean
}

export type DropGroup = {
  label?: string
  options: DropOption[]
}

export default function DropSelect({
  className,
  value,
  onChange,
  groups,
  options,
  placeholder,
  'aria-label': ariaLabel,
}: {
  className?: string
  value: string
  onChange: (value: string) => void
  groups?: DropGroup[]
  options?: DropOption[]
  placeholder?: string
  'aria-label'?: string
}) {
  const listId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 240 })

  const list = (groups ?? [{ options: options ?? [] }]).filter((group) => group.options.length)
  const flat = list.flatMap((group) => group.options)
  const selected = flat.find((row) => row.value === value && !row.disabled)

  const place = () => {
    const node = triggerRef.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    const width = Math.max(rect.width, 180)
    const spaceBelow = window.innerHeight - rect.bottom - 8
    const spaceAbove = rect.top - 8
    const openUp = spaceBelow < 168 && spaceAbove > spaceBelow
    const maxHeight = Math.min(320, Math.max(120, openUp ? spaceAbove : spaceBelow))
    let left = rect.left
    if (left + width > window.innerWidth - 8) left = window.innerWidth - 8 - width
    if (left < 8) left = 8
    const top = openUp ? Math.max(8, rect.top - maxHeight - 4) : rect.bottom + 4
    setPos({ top, left, width, maxHeight })
  }

  useLayoutEffect(() => {
    if (!open) return
    place()
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        className={cn(
          'flex w-full max-w-full items-center justify-between gap-2 rounded-xl border border-line bg-paper px-3 py-2 text-left text-sm text-ink focus:border-accent focus:ring-2 focus:ring-accent/20',
          open && 'border-accent ring-2 ring-accent/20',
          className,
        )}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen((prev) => !prev)
        }}
      >
        <span className={cn('min-w-0 truncate', !selected && 'text-muted')}>
          {selected?.label ?? placeholder ?? ''}
        </span>
        <ChevronDown size={16} className={cn('shrink-0 text-muted', open && 'rotate-180')} />
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              id={listId}
              role="listbox"
              style={{
                top: pos.top,
                left: pos.left,
                width: pos.width,
                maxHeight: pos.maxHeight,
              }}
              className="fixed z-[80] overflow-y-auto rounded-xl border border-line bg-paper py-1 shadow-lift"
            >
              {list.map((group, index) => (
                <div key={group.label ?? index} className={index ? 'mt-1 border-t border-line pt-1' : undefined}>
                  {group.label ? (
                    <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {group.label}
                    </p>
                  ) : null}
                  {group.options.map((row) => (
                    <button
                      key={row.value}
                      type="button"
                      role="option"
                      aria-selected={row.value === value}
                      disabled={row.disabled}
                      className={cn(
                        'flex w-full px-3 py-2 text-left text-sm',
                        row.disabled && 'cursor-default text-muted',
                        !row.disabled && row.value === value && 'bg-ink text-paper',
                        !row.disabled && row.value !== value && 'text-ink hover:bg-ink/5',
                      )}
                      onClick={() => {
                        if (row.disabled) return
                        onChange(row.value)
                        setOpen(false)
                      }}
                    >
                      {row.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
