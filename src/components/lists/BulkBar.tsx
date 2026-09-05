import { Check, Copy, Download, Trash2, X } from 'lucide-react'
import Button from '../ui/Button'
import { usePrefs } from '../../context/PrefsContext'

export default function BulkBar({
  count,
  enableCheck,
  onSelectAll,
  onClear,
  onCheck,
  onUncheck,
  onDuplicate,
  onExport,
  onDelete,
}: {
  count: number
  enableCheck?: boolean
  onSelectAll: () => void
  onClear: () => void
  onCheck: () => void
  onUncheck: () => void
  onDuplicate: () => void
  onExport: () => void
  onDelete: () => void
}) {
  const { t } = usePrefs()
  if (!count) return null
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-paper px-3 py-2">
      <p className="text-sm font-medium">{t('bulk.selected', { n: count })}</p>
      <Button variant="ghost" size="sm" onClick={onSelectAll}>
        {t('bulk.selectAll')}
      </Button>
      <Button variant="ghost" size="sm" onClick={onClear}>
        <X size={14} /> {t('bulk.clear')}
      </Button>
      {enableCheck ? (
        <>
          <Button variant="soft" size="sm" onClick={onCheck}>
            <Check size={14} /> {t('bulk.check')}
          </Button>
          <Button variant="soft" size="sm" onClick={onUncheck}>
            {t('bulk.uncheck')}
          </Button>
        </>
      ) : null}
      <Button variant="soft" size="sm" onClick={onDuplicate}>
        <Copy size={14} /> {t('bulk.duplicate')}
      </Button>
      <Button variant="soft" size="sm" onClick={onExport}>
        <Download size={14} /> {t('bulk.export')}
      </Button>
      <Button variant="danger" size="sm" onClick={onDelete}>
        <Trash2 size={14} /> {t('bulk.delete')}
      </Button>
    </div>
  )
}
