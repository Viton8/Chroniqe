import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface ToastAction {
  label: string
  onClick: () => void
}

interface Toast {
  id: number
  message: string
  tone: 'ok' | 'err'
  action?: ToastAction
}

interface ToastContextValue {
  toast: (message: string, tone?: 'ok' | 'err', action?: ToastAction) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])

  const toast = useCallback((message: string, tone: 'ok' | 'err' = 'ok', action?: ToastAction) => {
    const id = Date.now() + Math.random()
    setItems((prev) => [...prev, { id, message, tone, action }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((row) => row.id !== id))
    }, action ? 8000 : 3800)
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-20 right-4 z-[80] flex w-[min(92vw,22rem)] flex-col gap-2 md:bottom-6">
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-2xl px-4 py-3 text-sm shadow-lift ${
              t.tone === 'err'
                ? 'bg-rose-700 text-white'
                : 'bg-ink text-paper'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span>{t.message}</span>
              {t.action ? (
                <button
                  type="button"
                  className="shrink-0 font-medium underline decoration-white/50 underline-offset-2"
                  onClick={() => {
                    t.action?.onClick()
                    setItems((prev) => prev.filter((row) => row.id !== t.id))
                  }}
                >
                  {t.action.label}
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
