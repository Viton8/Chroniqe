import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { ListSchema } from '../../types/domain'
import { titleFieldId } from '../../lib/filters'
import { usePrefs } from '../../context/PrefsContext'
import Button from '../ui/Button'
import { Input } from '../ui/Input'

export default function QuickAdd({
  schema,
  disabled,
  onCreate,
}: {
  schema: ListSchema
  disabled?: boolean
  onCreate: (title: string) => Promise<void> | void
}) {
  const { t } = usePrefs()
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const fieldId = titleFieldId(schema)
  if (!fieldId) return null

  const submit = async () => {
    const next = title.trim()
    if (!next || busy || disabled) return
    setBusy(true)
    try {
      await onCreate(next)
      setTitle('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="flex min-w-0 flex-1 gap-2 sm:max-w-md"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <Input
        value={title}
        disabled={disabled || busy}
        placeholder={t('quickAdd.placeholder')}
        onChange={(event) => setTitle(event.target.value)}
      />
      <Button type="submit" size="sm" disabled={disabled || busy || !title.trim()}>
        <Plus size={14} /> {t('quickAdd.add')}
      </Button>
    </form>
  )
}
