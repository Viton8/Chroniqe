import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { useToast } from '../context/ToastContext'
import { createList } from '../services/api'
import { blankSchema } from '../lib/templates'
import { defaultViewConfig } from '../lib/views'
import type { ListSchema } from '../types/domain'
import Button from '../components/ui/Button'
import { FieldWrap, Input, Textarea } from '../components/ui/Input'
import SchemaEditor from '../components/lists/SchemaEditor'

export default function NewCustomListPage() {
  const { user } = useAuth()
  const { t } = usePrefs()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('✨')
  const [schema, setSchema] = useState<ListSchema>(() => blankSchema(t('newList.defaultField')))

  return (
    <div>
      <Link to="/lists/new" className="text-sm text-muted hover:text-ink">
        ← {t('common.back')}
      </Link>
      <h1 className="mt-3 font-serif text-3xl">{t('newList.custom')}</h1>
      <p className="mt-1 text-sm text-muted">{t('newList.customLead')}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_5rem]">
        <FieldWrap label={t('newList.listTitle')}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('newList.listTitlePh')}
            maxLength={120}
          />
        </FieldWrap>
        <FieldWrap label={t('settingsModal.icon')}>
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} maxLength={16} />
        </FieldWrap>
      </div>
      <div className="mt-3">
        <FieldWrap label={t('settingsModal.description')}>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
        </FieldWrap>
      </div>
      <div className="mt-6">
        <SchemaEditor schema={schema} onChange={setSchema} />
      </div>
      <Button
        className="mt-5"
        disabled={busy || !title.trim()}
        onClick={async () => {
          if (!user) return
          const name = title.trim()
          if (!name || !schema.fields.length) return
          setBusy(true)
          try {
            const list = await createList({
              owner_id: user.id,
              title: name,
              description: description.trim() || undefined,
              icon: icon.trim() || '✨',
              schema,
              view_config: defaultViewConfig(schema),
              settings: {},
            })
            navigate(`/lists/${list.id}`)
          } catch (e) {
            toast(e instanceof Error ? e.message : t('common.error'), 'err')
          } finally {
            setBusy(false)
          }
        }}
      >
        {t('newList.createCustom')}
      </Button>
    </div>
  )
}
