import { useRef, useState } from 'react'
import { usePrefs } from '../../context/PrefsContext'
import { useToast } from '../../context/ToastContext'
import { uploadListFile } from '../../services/api'
import Button from '../ui/Button'
import CoverSlot from './CoverSlot'

export default function ListCoverEditor({
  listId,
  userId,
  value,
  onChange,
}: {
  listId: string
  userId: string
  value: string | null
  onChange: (next: string | null) => void
}) {
  const { t } = usePrefs()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{t('settingsModal.cover')}</p>
      {value ? (
        <CoverSlot
          value={value}
          className="mb-2 h-32 w-full max-w-md rounded-2xl"
          alt={t('settingsModal.cover')}
        />
      ) : (
        <div className="mb-2 flex h-32 max-w-md items-center justify-center rounded-2xl border border-dashed border-line bg-ink/5 text-xs text-muted">
          {t('settingsModal.coverEmpty')}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="soft" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          {t('settingsModal.uploadCover')}
        </Button>
        {value ? (
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onChange(null)}>
            {t('settingsModal.removeCover')}
          </Button>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted">{t('settingsModal.coverHint')}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          setBusy(true)
          try {
            const uploaded = await uploadListFile({
              userId,
              listId,
              file,
              imagesOnly: true,
              maxMb: 5,
            })
            onChange(uploaded.path)
          } catch (ex) {
            toast(ex instanceof Error ? ex.message : t('fields.uploadFail'), 'err')
          } finally {
            setBusy(false)
          }
        }}
      />
    </div>
  )
}
