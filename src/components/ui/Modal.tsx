import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import Button from './Button'
import { usePrefs } from '../../context/PrefsContext'

export default function Modal({
  open,
  title,
  onClose,
  children,
  wide,
  description,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean | 'xl'
  description?: string
}) {
  const { t } = usePrefs()
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    const frame = window.requestAnimationFrame(() => panelRef.current?.focus())
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
      window.cancelAnimationFrame(frame)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="chroniqe-backdrop absolute inset-0 bg-ink/40"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`chroniqe-panel relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-paper p-5 shadow-lift outline-none sm:rounded-3xl sm:p-6 ${
          wide === 'xl' ? 'sm:max-w-6xl' : wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="font-serif text-2xl">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-muted">
                {description}
              </p>
            ) : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('common.close')}>
            <X size={18} />
          </Button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
