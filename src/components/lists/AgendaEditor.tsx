import { useEffect, useRef } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { AgendaConfig, FieldDef, HighlightCondition, HighlightOp, ListSchema } from '../../types/domain'
import { HIGHLIGHT_OPS } from '../../types/domain'
import { usePrefs } from '../../context/PrefsContext'
import Hint from '../ui/Hint'
import Button from '../ui/Button'
import DropSelect from '../ui/DropSelect'
import { FieldWrap, Input } from '../ui/Input'
import { asDateInputValue } from '../../lib/cn'
import { filterDateFields } from '../../lib/filters'
import { HIGHLIGHT_CHECKED_ID } from '../../lib/highlight'
import { usesItemRatings } from '../../lib/ratings'
import { agendaDoneMode, CHECKED_DONE } from '../../lib/agenda'

const NONE = 'none'
const CHECKED = 'checked'

export default function AgendaEditor({
  schema,
  value,
  enableCheck,
  onChange,
}: {
  schema: ListSchema
  value: AgendaConfig | undefined
  enableCheck?: boolean
  onChange: (agenda: AgendaConfig) => void
}) {
  const { t } = usePrefs()
  const dateFields = filterDateFields(schema)
  const dateFieldId = value?.dateFieldId ?? ''
  const done = value?.done ?? []
  const mode = agendaDoneMode(done)
  const match = value?.doneMatch === 'any' ? 'any' : 'all'
  const leaveValue = leaveSelectValue(done, mode)
  const matchFields = schema.fields.filter((row) => !row.hidden)
  const first = mode === 'field' ? done[0] : undefined
  const conditionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (mode !== 'field') return
    conditionRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [mode, leaveValue])

  const patch = (next: Partial<AgendaConfig> & { done: HighlightCondition[] }) => {
    onChange({ ...value, dateFieldId, doneMatch: match, ...next })
  }

  const setDate = (nextId: string) => {
    if (!nextId) {
      onChange({ dateFieldId: '', done: [], doneMatch: 'all' })
      return
    }
    const nextDone =
      !value?.dateFieldId && enableCheck && (!value?.done || agendaDoneMode(value.done) === 'none')
        ? [CHECKED_DONE]
        : done
    onChange({ ...value, dateFieldId: nextId, done: nextDone })
  }

  const setLeave = (next: string) => {
    if (next === NONE) {
      patch({ done: [], doneMatch: 'all' })
      return
    }
    if (next === CHECKED) {
      patch({ done: [CHECKED_DONE], doneMatch: 'all' })
      return
    }
    const fieldId = next.startsWith('f:') ? next.slice(2) : next
    const rest = mode === 'field' ? done.slice(1) : []
    patch({ done: [conditionForField(schema, fieldId), ...rest] })
  }

  return (
    <section className="space-y-3">
      <h3 className="font-medium">{t('agenda.title')}</h3>
      <Hint title={t('agenda.hint')} example={t('agenda.hintEx')} />
      <FieldWrap label={t('agenda.dateField')} hint={t('agenda.dateHint')}>
        <DropSelect
          className="w-full"
          value={dateFieldId}
          placeholder={t('agenda.dateOff')}
          onChange={setDate}
          options={[
            { value: '', label: t('agenda.dateOff') },
            ...dateFields.map((field) => ({ value: field.id, label: field.name })),
          ]}
        />
      </FieldWrap>
      {!dateFields.length ? <p className="text-xs text-muted">{t('agenda.needDateField')}</p> : null}
      {dateFieldId ? (
        <>
          <FieldWrap label={t('agenda.done')} hint={t('agenda.doneHint')}>
            <DropSelect
              className="w-full"
              value={leaveValue}
              onChange={setLeave}
              groups={[
                {
                  options: [
                    { value: NONE, label: t('agenda.doneNone') },
                    ...(enableCheck ? [{ value: CHECKED, label: t('agenda.doneChecked') }] : []),
                  ],
                },
                {
                  label: t('agenda.doneField'),
                  options: matchFields.map((field) => ({ value: `f:${field.id}`, label: field.name })),
                },
              ]}
            />
          </FieldWrap>
          {mode === 'field' && first ? (
            <div ref={conditionRef} className="space-y-2 rounded-2xl border border-line p-3">
              {done.length > 1 ? (
                <FieldWrap label={t('agenda.match')}>
                  <DropSelect
                    value={match}
                    onChange={(next) => patch({ done, doneMatch: next as 'all' | 'any' })}
                    options={[
                      { value: 'all', label: t('agenda.matchAll') },
                      { value: 'any', label: t('agenda.matchAny') },
                    ]}
                  />
                </FieldWrap>
              ) : null}
              <div className="flex flex-wrap items-end gap-2">
                <FieldWrap label={t('agenda.operator')}>
                  <DropSelect
                    className="min-w-36"
                    value={first.op}
                    onChange={(op) =>
                      patch({
                        done: done.map((row, i) =>
                          i === 0 ? { ...row, op: op as HighlightOp } : row,
                        ),
                      })
                    }
                    options={HIGHLIGHT_OPS.map((op) => ({ value: op, label: t(`agenda.op.${op}`) }))}
                  />
                </FieldWrap>
                {first.op !== 'empty' && first.op !== 'not_empty' ? (
                  <div className="min-w-36 flex-1">
                    <ConditionValue
                      field={schema.fields.find((row) => row.id === first.fieldId)}
                      condition={first}
                      onChange={(next) => patch({ done: done.map((row, i) => (i === 0 ? next : row)) })}
                    />
                  </div>
                ) : null}
              </div>
              {done.slice(1).map((condition, index) => (
                <ConditionRow
                  key={`${condition.fieldId}-${index + 1}`}
                  schema={schema}
                  enableCheck={enableCheck}
                  condition={condition}
                  onChange={(next) =>
                    patch({
                      done: done.map((row, i) => (i === index + 1 ? next : row)),
                    })
                  }
                  onRemove={() => patch({ done: done.filter((_, i) => i !== index + 1) })}
                />
              ))}
              <Button
                variant="soft"
                size="sm"
                onClick={() =>
                  patch({
                    done: [...done, conditionForField(schema, defaultMatchFieldId(schema, dateFieldId))],
                  })
                }
              >
                <Plus size={14} /> {t('agenda.addCondition')}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

function leaveSelectValue(done: HighlightCondition[], mode: 'none' | 'checked' | 'field'): string {
  if (mode === 'none') return NONE
  if (mode === 'checked') return CHECKED
  const fieldId = done[0]?.fieldId
  if (!fieldId || fieldId === HIGHLIGHT_CHECKED_ID) return CHECKED
  return `f:${fieldId}`
}

function defaultMatchFieldId(schema: ListSchema, dateFieldId: string): string {
  return conditionForField(schema, guessMatchField(schema, dateFieldId)?.id ?? '').fieldId
}

function guessMatchField(schema: ListSchema, dateFieldId: string): FieldDef | undefined {
  const visible = schema.fields.filter((row) => !row.hidden)
  return (
    visible.find((row) => row.type === 'select') ??
    visible.find((row) => row.type === 'boolean' || row.type === 'checkbox') ??
    visible.find((row) => row.type === 'multiselect' || row.type === 'tags') ??
    visible.find((row) => row.id !== dateFieldId) ??
    visible[0] ??
    schema.fields[0]
  )
}

function conditionForField(schema: ListSchema, fieldId: string): HighlightCondition {
  if (fieldId === HIGHLIGHT_CHECKED_ID) return CHECKED_DONE
  const field = schema.fields.find((row) => row.id === fieldId) ?? guessMatchField(schema, '')
  if (!field) return { fieldId: fieldId || '', op: 'not_empty' }
  if (field.type === 'date' || field.type === 'datetime') {
    return { fieldId: field.id, op: 'not_empty' }
  }
  if (field.type === 'boolean' || field.type === 'checkbox') {
    return { fieldId: field.id, op: 'eq', value: true }
  }
  if (field.type === 'select') {
    const options = field.config?.options ?? []
    const doneish = options.find((opt) =>
      /done|complete|read|finish|bought|closed|ready|прочитан|готов|купл|закрыт/i.test(
        `${opt.value} ${opt.label}`,
      ),
    )
    return { fieldId: field.id, op: 'eq', value: doneish?.value ?? options[0]?.value ?? '' }
  }
  if (field.type === 'number' || field.type === 'integer' || field.type === 'rating') {
    return { fieldId: field.id, op: 'gt', value: 0 }
  }
  return { fieldId: field.id, op: 'not_empty' }
}

function ConditionRow({
  schema,
  enableCheck,
  condition,
  onChange,
  onRemove,
}: {
  schema: ListSchema
  enableCheck?: boolean
  condition: HighlightCondition
  onChange: (next: HighlightCondition) => void
  onRemove: () => void
}) {
  const { t } = usePrefs()
  const field =
    condition.fieldId === HIGHLIGHT_CHECKED_ID
      ? undefined
      : schema.fields.find((row) => row.id === condition.fieldId)
  const needsValue = condition.op !== 'empty' && condition.op !== 'not_empty'

  return (
    <div className="flex flex-wrap items-end gap-2">
      <FieldWrap label={t('agenda.field')}>
        <DropSelect
          className="min-w-40"
          value={condition.fieldId}
          onChange={(fieldId) => onChange(conditionForField(schema, fieldId))}
          options={[
            ...(enableCheck ? [{ value: HIGHLIGHT_CHECKED_ID, label: t('agenda.checked') }] : []),
            ...schema.fields
              .filter((row) => !row.hidden)
              .map((row) => ({ value: row.id, label: row.name })),
          ]}
        />
      </FieldWrap>
      <FieldWrap label={t('agenda.operator')}>
        <DropSelect
          className="min-w-36"
          value={condition.op}
          onChange={(op) => onChange({ ...condition, op: op as HighlightOp })}
          options={HIGHLIGHT_OPS.map((op) => ({ value: op, label: t(`agenda.op.${op}`) }))}
        />
      </FieldWrap>
      {needsValue ? (
        <div className="min-w-36 flex-1">
          <ConditionValue field={field} condition={condition} onChange={onChange} />
        </div>
      ) : null}
      <Button variant="ghost" size="sm" onClick={onRemove}>
        <Trash2 size={14} />
      </Button>
    </div>
  )
}

function ConditionValue({
  field,
  condition,
  onChange,
}: {
  field?: FieldDef
  condition: HighlightCondition
  onChange: (next: HighlightCondition) => void
}) {
  const { t } = usePrefs()
  if (condition.fieldId === HIGHLIGHT_CHECKED_ID) {
    return (
      <FieldWrap label={t('agenda.value')}>
        <DropSelect
          value={condition.value === false || condition.value === 'false' ? 'false' : 'true'}
          onChange={(next) => onChange({ ...condition, value: next === 'true' })}
          options={[
            { value: 'true', label: t('agenda.yes') },
            { value: 'false', label: t('agenda.no') },
          ]}
        />
      </FieldWrap>
    )
  }
  if (!field) {
    return (
      <FieldWrap label={t('agenda.value')}>
        <Input
          value={condition.value == null ? '' : String(condition.value)}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
        />
      </FieldWrap>
    )
  }
  if (field.type === 'boolean' || field.type === 'checkbox') {
    return (
      <FieldWrap label={t('agenda.value')}>
        <DropSelect
          value={condition.value ? 'true' : 'false'}
          onChange={(next) => onChange({ ...condition, value: next === 'true' })}
          options={[
            { value: 'true', label: t('agenda.yes') },
            { value: 'false', label: t('agenda.no') },
          ]}
        />
      </FieldWrap>
    )
  }
  if (field.type === 'select' && field.config?.options?.length) {
    return (
      <FieldWrap label={t('agenda.value')}>
        <DropSelect
          value={String(condition.value ?? '')}
          onChange={(next) => onChange({ ...condition, value: next })}
          options={[
            { value: '', label: '—' },
            ...field.config.options.map((opt) => ({ value: opt.value, label: opt.label })),
          ]}
        />
      </FieldWrap>
    )
  }
  if (field.type === 'date' || field.type === 'datetime') {
    return (
      <FieldWrap label={t('agenda.value')}>
        <Input
          type="date"
          value={asDateInputValue(condition.value)}
          onChange={(e) => onChange({ ...condition, value: e.target.value || undefined })}
        />
      </FieldWrap>
    )
  }
  if (
    field.type === 'number' ||
    field.type === 'integer' ||
    field.type === 'rating' ||
    usesItemRatings(field)
  ) {
    return (
      <FieldWrap label={t('agenda.value')}>
        <Input
          type="number"
          value={condition.value == null || condition.value === '' ? '' : String(condition.value)}
          onChange={(e) =>
            onChange({
              ...condition,
              value: e.target.value === '' ? undefined : Number(e.target.value),
            })
          }
        />
      </FieldWrap>
    )
  }
  return (
    <FieldWrap label={t('agenda.value')}>
      <Input
        value={condition.value == null ? '' : String(condition.value)}
        onChange={(e) => onChange({ ...condition, value: e.target.value })}
      />
    </FieldWrap>
  )
}
