import { Plus, Trash2 } from 'lucide-react'
import Hint from '../ui/Hint'
import Button from '../ui/Button'
import { FieldWrap, Input } from '../ui/Input'
import { FIELD_TYPES, type FieldDef, type FieldType, type ListSchema } from '../../types/domain'
import { newField } from '../../lib/templates'
import { cn } from '../../lib/cn'
import { usePrefs } from '../../context/PrefsContext'

const HINT_TYPES: FieldType[] = ['text', 'number', 'integer', 'multi_rating', 'image', 'sublist', 'select']

export default function SchemaEditor({
  schema,
  onChange,
}: {
  schema: ListSchema
  onChange: (schema: ListSchema) => void
}) {
  const { t } = usePrefs()
  const updateField = (id: string, patch: Partial<FieldDef>) => {
    onChange({
      ...schema,
      fields: schema.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    })
  }

  return (
    <div className="space-y-4">
      <Hint title={t('schema.hint')} example={t('schema.hintEx')} />
      <div className="space-y-3">
        {schema.fields.map((field) => (
          <article key={field.id} className="rounded-2xl border border-line bg-paper p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldWrap label={t('schema.name')}>
                <Input value={field.name} onChange={(e) => updateField(field.id, { name: e.target.value })} />
              </FieldWrap>
              <FieldWrap label={t('schema.type')}>
                <select
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm"
                  value={field.type}
                  onChange={(e) => updateField(field.id, { type: e.target.value as FieldType })}
                >
                  {FIELD_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`fieldTypes.${type}`)}
                    </option>
                  ))}
                </select>
              </FieldWrap>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(field.required)}
                onChange={(e) => updateField(field.id, { required: e.target.checked })}
              />
              {t('schema.required')}
            </label>
            <Constraints field={field} onChange={(config) => updateField(field.id, { config })} />
            {HINT_TYPES.includes(field.type) ? (
              <div className="mt-3">
                <Hint compact title={t(`typeHint.${field.type}`)} example={t(`typeHint.${field.type}Ex`)} />
              </div>
            ) : null}
            <div className="mt-3 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  onChange({ ...schema, fields: schema.fields.filter((f) => f.id !== field.id) })
                }
              >
                <Trash2 size={14} /> {t('schema.deleteField')}
              </Button>
            </div>
          </article>
        ))}
      </div>
      <Button
        variant="soft"
        onClick={() => onChange({ ...schema, fields: [...schema.fields, newField('text')] })}
      >
        <Plus size={16} /> {t('schema.addField')}
      </Button>
      <div className="grid gap-3 sm:grid-cols-2">
        <MetaSelect
          label={t('schema.titleField')}
          value={schema.titleFieldId ?? ''}
          fields={schema.fields}
          onChange={(titleFieldId) => onChange({ ...schema, titleFieldId })}
        />
        <MetaSelect
          label={t('schema.imageField')}
          value={schema.imageFieldId ?? ''}
          fields={schema.fields}
          onChange={(imageFieldId) => onChange({ ...schema, imageFieldId })}
        />
      </div>
    </div>
  )
}

function MetaSelect({
  label,
  value,
  fields,
  onChange,
}: {
  label: string
  value: string
  fields: FieldDef[]
  onChange: (id: string | undefined) => void
}) {
  return (
    <FieldWrap label={label}>
      <select
        className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value || undefined)}
      >
        <option value="">—</option>
        {fields.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
    </FieldWrap>
  )
}

function Constraints({
  field,
  onChange,
}: {
  field: FieldDef
  onChange: (config: FieldDef['config']) => void
}) {
  const { t } = usePrefs()
  const cfg = field.config ?? {}
  const set = (patch: FieldDef['config']) => onChange({ ...cfg, ...patch })

  if (['text', 'textarea', 'url', 'email'].includes(field.type)) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-2">
        <FieldWrap label={t('schema.minChars')}>
          <Input
            type="number"
            value={cfg.minLength ?? ''}
            onChange={(e) => set({ minLength: e.target.value ? Number(e.target.value) : undefined })}
          />
        </FieldWrap>
        <FieldWrap label={t('schema.maxChars')}>
          <Input
            type="number"
            value={cfg.maxLength ?? ''}
            onChange={(e) => set({ maxLength: e.target.value ? Number(e.target.value) : undefined })}
          />
        </FieldWrap>
      </div>
    )
  }
  if (['number', 'integer', 'rating', 'multi_rating'].includes(field.type)) {
    return (
      <div className="mt-3 grid grid-cols-3 gap-2">
        <FieldWrap label={t('schema.from')}>
          <Input
            type="number"
            value={cfg.min ?? ''}
            onChange={(e) => set({ min: e.target.value ? Number(e.target.value) : undefined })}
          />
        </FieldWrap>
        <FieldWrap label={t('schema.to')}>
          <Input
            type="number"
            value={cfg.max ?? ''}
            onChange={(e) => set({ max: e.target.value ? Number(e.target.value) : undefined })}
          />
        </FieldWrap>
        {field.type.includes('rating') ? (
          <FieldWrap label={t('schema.scale')}>
            <Input
              type="number"
              value={cfg.ratingMax ?? 10}
              onChange={(e) => set({ ratingMax: Number(e.target.value) || 10 })}
            />
          </FieldWrap>
        ) : (
          <div />
        )}
      </div>
    )
  }
  if (field.type === 'select' || field.type === 'multiselect') {
    return (
      <FieldWrap label={t('schema.options')}>
        <Input
          value={(cfg.options ?? []).map((o) => o.label).join(', ')}
          onChange={(e) =>
            set({
              options: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((label) => ({ value: label.toLowerCase().replaceAll(' ', '_'), label })),
            })
          }
        />
      </FieldWrap>
    )
  }
  if (field.type === 'image' || field.type === 'file') {
    return (
      <FieldWrap label={t('schema.maxMb')}>
        <Input
          type="number"
          value={cfg.maxSizeMb ?? (field.type === 'image' ? 2 : 10)}
          onChange={(e) => set({ maxSizeMb: Number(e.target.value) || 2 })}
        />
      </FieldWrap>
    )
  }
  if (field.type === 'sublist') {
    const sub = cfg.subfields ?? []
    return (
      <div className="mt-3 space-y-2">
        <p className="text-xs text-muted">{t('schema.subfields')}</p>
        {sub.map((sf, i) => (
          <div key={sf.id} className="flex gap-2">
            <Input
              value={sf.name}
              onChange={(e) => {
                const next = sub.map((s, idx) => (idx === i ? { ...s, name: e.target.value } : s))
                set({ subfields: next })
              }}
            />
            <button
              type="button"
              className={cn('text-xs text-rose-700')}
              onClick={() => set({ subfields: sub.filter((_, idx) => idx !== i) })}
            >
              ×
            </button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const nf = newField('text')
            set({ subfields: [...sub, { id: nf.id, key: nf.key, name: t('schema.addField'), type: 'text' }] })
          }}
        >
          {t('schema.subfield')}
        </Button>
      </div>
    )
  }
  return null
}
