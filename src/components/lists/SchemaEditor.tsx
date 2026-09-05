import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from 'lucide-react'
import Hint from '../ui/Hint'
import Button from '../ui/Button'
import { FieldWrap, Input, Textarea } from '../ui/Input'
import { FIELD_TYPES, type FieldDef, type FieldType, type ListSchema } from '../../types/domain'
import { newField } from '../../lib/templates'
import { cn, uid } from '../../lib/cn'
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
  const [openIds, setOpenIds] = useState<string[]>(() => schema.fields.slice(0, 2).map((field) => field.id))

  const updateField = (id: string, patch: Partial<FieldDef>) => {
    onChange({
      ...schema,
      fields: schema.fields.map((field) => (field.id === id ? { ...field, ...patch } : field)),
    })
  }

  const moveField = (id: string, dir: -1 | 1) => {
    const index = schema.fields.findIndex((field) => field.id === id)
    const nextIndex = index + dir
    if (index < 0 || nextIndex < 0 || nextIndex >= schema.fields.length) return
    const fields = [...schema.fields]
    const [row] = fields.splice(index, 1)
    fields.splice(nextIndex, 0, row)
    onChange({ ...schema, fields })
  }

  const duplicateField = (field: FieldDef) => {
    const id = uid()
    const copy: FieldDef = {
      ...structuredClone(field),
      id,
      key: id.slice(0, 8),
      name: `${field.name} 2`,
    }
    const index = schema.fields.findIndex((row) => row.id === field.id)
    const fields = [...schema.fields]
    fields.splice(index + 1, 0, copy)
    onChange({ ...schema, fields })
    setOpenIds((prev) => [...prev, id])
  }

  return (
    <div className="space-y-4">
      <Hint title={t('schema.hint')} example={t('schema.hintEx')} />
      <div className="space-y-3">
        {schema.fields.map((field, index) => {
          const open = openIds.includes(field.id)
          return (
            <article key={field.id} className="rounded-2xl border border-line bg-paper p-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-sm font-medium"
                  onClick={() =>
                    setOpenIds((prev) =>
                      prev.includes(field.id) ? prev.filter((id) => id !== field.id) : [...prev, field.id],
                    )
                  }
                >
                  {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  <span>
                    {index + 1}. {field.name || t('schema.newField')}
                  </span>
                  <span className="text-xs font-normal text-muted">{t(`fieldTypes.${field.type}`)}</span>
                </button>
                <div className="ml-auto flex flex-wrap gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => moveField(field.id, -1)}
                    aria-label={t('schema.moveUp')}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={index === schema.fields.length - 1}
                    onClick={() => moveField(field.id, 1)}
                    aria-label={t('schema.moveDown')}
                  >
                    ↓
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => duplicateField(field)}>
                    <Copy size={14} /> {t('schema.duplicateField')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      onChange({ ...schema, fields: schema.fields.filter((row) => row.id !== field.id) })
                    }
                  >
                    <Trash2 size={14} /> {t('schema.deleteField')}
                  </Button>
                </div>
              </div>
              {open ? (
                <div className="mt-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FieldWrap label={t('schema.name')}>
                      <Input value={field.name} onChange={(e) => updateField(field.id, { name: e.target.value })} />
                    </FieldWrap>
                    <FieldWrap label={t('schema.type')}>
                      <select
                        className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm"
                        value={field.type}
                        onChange={(e) =>
                          updateField(field.id, {
                            type: e.target.value as FieldType,
                            config: { ...field.config, defaultValue: undefined },
                          })
                        }
                      >
                        {FIELD_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {t(`fieldTypes.${type}`)}
                          </option>
                        ))}
                      </select>
                    </FieldWrap>
                  </div>
                  <FieldWrap label={t('schema.description')} hint={t('schema.descriptionHint')}>
                    <Textarea
                      value={field.description ?? ''}
                      onChange={(e) => updateField(field.id, { description: e.target.value || undefined })}
                    />
                  </FieldWrap>
                  <DefaultValueEditor
                    field={field}
                    onChange={(defaultValue) =>
                      updateField(field.id, { config: { ...field.config, defaultValue } })
                    }
                  />
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(field.required)}
                        onChange={(e) => updateField(field.id, { required: e.target.checked })}
                      />
                      {t('schema.required')}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(field.unique)}
                        onChange={(e) => updateField(field.id, { unique: e.target.checked })}
                      />
                      {t('schema.unique')}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(field.hidden)}
                        onChange={(e) => updateField(field.id, { hidden: e.target.checked })}
                      />
                      {t('schema.hidden')}
                    </label>
                  </div>
                  <Constraints field={field} onChange={(config) => updateField(field.id, { config })} />
                  {HINT_TYPES.includes(field.type) ? (
                    <Hint compact title={t(`typeHint.${field.type}`)} example={t(`typeHint.${field.type}Ex`)} />
                  ) : null}
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
      <Button
        variant="soft"
        onClick={() => {
          const field = newField('text')
          onChange({ ...schema, fields: [...schema.fields, field] })
          setOpenIds((prev) => [...prev, field.id])
        }}
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
        <MetaSelect
          label={t('schema.dateField')}
          value={schema.dateFieldId ?? ''}
          fields={schema.fields.filter((field) => field.type === 'date' || field.type === 'datetime')}
          onChange={(dateFieldId) => onChange({ ...schema, dateFieldId })}
        />
        <MetaSelect
          label={t('schema.groupField')}
          value={schema.groupFieldId ?? ''}
          fields={schema.fields.filter((field) =>
            ['select', 'multiselect', 'tags', 'boolean', 'checkbox'].includes(field.type),
          )}
          onChange={(groupFieldId) => onChange({ ...schema, groupFieldId })}
        />
      </div>
    </div>
  )
}

function DefaultValueEditor({
  field,
  onChange,
}: {
  field: FieldDef
  onChange: (value: unknown) => void
}) {
  const { t } = usePrefs()
  const value = field.config?.defaultValue
  if (['image', 'file', 'sublist', 'relation', 'user', 'multi_rating'].includes(field.type)) {
    return null
  }
  if (field.type === 'boolean' || field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        {t('schema.default')}
      </label>
    )
  }
  if (field.type === 'select') {
    return (
      <FieldWrap label={t('schema.default')}>
        <select
          className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm"
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value || undefined)}
        >
          <option value="">—</option>
          {(field.config?.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FieldWrap>
    )
  }
  if (field.type === 'multiselect' || field.type === 'tags') {
    const text = Array.isArray(value) ? value.join(', ') : ''
    return (
      <FieldWrap label={t('schema.default')} hint={t('schema.defaultListHint')}>
        <Input
          value={text}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(',')
                .map((part) => part.trim())
                .filter(Boolean),
            )
          }
        />
      </FieldWrap>
    )
  }
  if (['number', 'integer', 'rating'].includes(field.type)) {
    return (
      <FieldWrap label={t('schema.default')}>
        <Input
          type="number"
          value={value == null || value === '' ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        />
      </FieldWrap>
    )
  }
  if (field.type === 'date' || field.type === 'datetime') {
    return (
      <FieldWrap label={t('schema.default')}>
        <Input
          type={field.type === 'date' ? 'date' : 'datetime-local'}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      </FieldWrap>
    )
  }
  return (
    <FieldWrap label={t('schema.default')}>
      <Input value={String(value ?? '')} onChange={(e) => onChange(e.target.value || undefined)} />
    </FieldWrap>
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
        {fields.map((field) => (
          <option key={field.id} value={field.id}>
            {field.name}
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
        <FieldWrap label={t('schema.placeholder')}>
          <Input
            value={cfg.placeholder ?? ''}
            onChange={(e) => set({ placeholder: e.target.value || undefined })}
          />
        </FieldWrap>
        <FieldWrap label={t('schema.pattern')}>
          <Input
            value={cfg.pattern ?? ''}
            placeholder={t('schema.patternPh')}
            onChange={(e) => set({ pattern: e.target.value || undefined })}
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
