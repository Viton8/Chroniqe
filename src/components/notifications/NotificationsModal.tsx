import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { usePrefs } from '../../context/PrefsContext'
import { fetchNotifications, markNotificationsRead } from '../../services/api'
import type { AppNotification } from '../../types/domain'
import { formatDateTime } from '../../lib/cn'
import Button from '../ui/Button'

const PREVIEW = 8

export function NotificationsFeed({
  rows,
  onNavigate,
}: {
  rows: AppNotification[]
  onNavigate?: () => void
}) {
  const { t } = usePrefs()
  if (!rows.length) {
    return <p className="text-sm text-muted">{t('notes.empty')}</p>
  }
  return (
    <ul className="space-y-2">
      {rows.map((n) => {
        const listId = typeof n.payload.list_id === 'string' ? n.payload.list_id : null
        return (
          <li key={n.id} className={`rounded-2xl px-4 py-3 text-sm ${n.read_at ? 'bg-bg' : 'bg-accent-soft'}`}>
            <p className="font-medium">{n.title}</p>
            {n.body ? <p className="mt-0.5 text-sm text-muted">{n.body}</p> : null}
            <p className="text-xs text-muted">{formatDateTime(n.created_at)}</p>
            {listId ? (
              <Link to={`/lists/${listId}`} className="text-xs text-accent" onClick={onNavigate}>
                {t('notes.openList')}
              </Link>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function panelStyle(anchor: DOMRect): CSSProperties {
  const width = Math.min(380, window.innerWidth - 16)
  const gap = 8
  const spaceBelow = window.innerHeight - anchor.bottom - gap
  const spaceAbove = anchor.top - gap
  const above = spaceBelow < 260 && spaceAbove > spaceBelow
  const left = Math.min(Math.max(8, anchor.right - width), window.innerWidth - width - 8)
  const maxHeight = Math.min(480, Math.max(200, (above ? spaceAbove : spaceBelow) - 8))
  if (above) {
    return { left, width, bottom: window.innerHeight - anchor.top + gap, maxHeight }
  }
  return { left, width, top: anchor.bottom + gap, maxHeight }
}

export default function NotificationsModal({
  open,
  onClose,
  anchorEl,
}: {
  open: boolean
  onClose: () => void
  anchorEl: HTMLElement | null
}) {
  const { user } = useAuth()
  const { t } = usePrefs()
  const navigate = useNavigate()
  const [rows, setRows] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [style, setStyle] = useState<CSSProperties>({})

  useLayoutEffect(() => {
    if (!open || !anchorEl) return
    const place = () => setStyle(panelStyle(anchorEl.getBoundingClientRect()))
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, anchorEl])

  useEffect(() => {
    if (!open || !user) return
    let active = true
    setLoading(true)
    void fetchNotifications(user.id)
      .then((data) => {
        if (active) setRows(data)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, user])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70]">
      <button type="button" className="absolute inset-0" aria-label={t('common.close')} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('notes.title')}
        className="absolute z-10 flex flex-col overflow-hidden rounded-2xl border border-line bg-paper p-4 shadow-lift"
        style={{
          ...style,
          visibility: style.top != null || style.bottom != null ? 'visible' : 'hidden',
        }}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="font-serif text-xl">{t('notes.title')}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label={t('common.close')}>
            <X size={18} />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {user && rows.some((n) => !n.read_at) ? (
            <div className="mb-3 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  void markNotificationsRead(user.id).then(() =>
                    setRows((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))),
                  )
                }
              >
                {t('notes.readAll')}
              </Button>
            </div>
          ) : null}
          {loading ? (
            <p className="py-6 text-sm text-muted">{t('common.loading')}</p>
          ) : (
            <NotificationsFeed rows={rows.slice(0, PREVIEW)} onNavigate={onClose} />
          )}
        </div>
        <Button
          variant="soft"
          className="mt-3 w-full"
          onClick={() => {
            onClose()
            navigate('/notifications')
          }}
        >
          {t('notes.openPage')}
        </Button>
      </div>
    </div>
  )
}
