import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import type { FieldDef, HighlightCondition, HighlightOp, HighlightRule, ListSchema } from '../../types/domain'
import { HIGHLIGHT_COLORS, HIGHLIGHT_OPS } from '../../types/domain'
import { usePrefs } from '../../context/PrefsContext'
import Hint from '../ui/Hint'
import Button from '../ui/Button'
import { FieldWrap, Input, Select } from '../ui/Input'
import {
  HIGHLIGHT_CHECKED_ID,
  emptyHighlightCondition,
  emptyHighlightRule,
  highlightSwatch,
} from '../../lib/highlight'
import { usesItemRatings } from '../../lib/ratings'
import { scoreFields } from '../../lib/filters'
import { asDateInputValue } from '../../lib/cn'

export default function HighlightRulesEditor({
  schema,
  rules,
  enableCheck,
  onChange,
}: {
  schema: ListSchema
  rules: HighlightRule[]
  enableCheck?: boolean
  onChange: (rules: HighlightRule[]) => void
}) {
  const { t } = usePrefs()
  const defaultField = scoreFields(schema)[0]?.id ?? schema.fields[0]?.id ?? ''

  return (
    <section className="space-y-3">
      <h3 className="font-medium">{t('highlight.rules')}</h3>
      <Hint title={t('highlight.rulesHint')} example={t('highlight.rulesEx')} />
      {rules.map((rule, index) => (
        <article key={rule.id} className="space-y-3 rounded-2xl border border-line p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              className="min-w-36"
              value={rule.match}
              onChange={(e) =>
                patch(rules, onChange, index, { match: e.target.value as HighlightRule['match'] })
              }
            >
              <option value="all">{t('highlight.matchAll')}</option>
              <option value="any">{t('highlight.matchAny')}</option>
            </Select>
            <ColorSelect
              value={rule.color}
              onChange={(color) => patch(rules, onChange, index, { color })}
            />
            <div className="ml-auto flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={index === 0}
                onClick={() => onChange(move(rules, index, -1))}
              >
                <ChevronUp size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={index === rules.length - 1}
                onClick={() => onChange(move(rules, index, 1))}
              >
                <ChevronDown size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange(rules.filter((row) => row.id !== rule.id))}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {rule.conditions.map((condition, cIndex) => (
              <ConditionRow
                key={`${rule.id}-${cIndex}`}
                schema={schema}
                enableCheck={enableCheck}
                condition={condition}
                onChange={(next) =>
                  patch(rules, onChange, index, {
                    conditions: rule.conditions.map((row, i) => (i === cIndex ? next : row)),
                  })
                }
                onRemove={() =>
                  patch(rules, onChange, index, {
                    conditions: rule.conditions.filter((_, i) => i !== cIndex),
                  })
                }
              />
            ))}
          </div>
          <Button
            variant="soft"
            size="sm"
            onClick={() =>
              patch(rules, onChange, index, {
                conditions: [...rule.conditions, emptyHighlightCondition(defaultField)],
              })
            }
          >
            <Plus size={14} /> {t('highlight.addCondition')}
          </Button>
        </article>
      ))}
      <Button
        variant="soft"
        size="sm"
        disabled={!defaultField && !enableCheck}
        onClick={() =>
          onChange([...rules, emptyHighlightRule(defaultField || HIGHLIGHT_CHECKED_ID)])
        }
      >
        <Plus size={14} /> {t('highlight.addRule')}
      </Button>
    </section>
  )
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
      <FieldWrap label={t('highlight.field')}>
        <Select
          className="min-w-40"
          value={condition.fieldId}
          onChange={(e) => onChange({ ...condition, fieldId: e.target.value, value: undefined })}
        >
          {enableCheck ? <option value={HIGHLIGHT_CHECKED_ID}>{t('highlight.checked')}</option> : null}
          {schema.fields
            .filter((row) => !row.hidden)
            .map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
        </Select>
      </FieldWrap>
      <FieldWrap label={t('highlight.operator')}>
        <Select
          className="min-w-36"
          value={condition.op}
          onChange={(e) => onChange({ ...condition, op: e.target.value as HighlightOp })}
        >
          {HIGHLIGHT_OPS.map((op) => (
            <option key={op} value={op}>
              {t(`highlight.op.${op}`)}
            </option>
          ))}
        </Select>
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
      <FieldWrap label={t('highlight.value')}>
        <Select
          value={condition.value === false || condition.value === 'false' ? 'false' : 'true'}
          onChange={(e) => onChange({ ...condition, value: e.target.value === 'true' })}
        >
          <option value="true">{t('highlight.yes')}</option>
          <option value="false">{t('highlight.no')}</option>
        </Select>
      </FieldWrap>
    )
  }
  if (!field) {
    return (
      <FieldWrap label={t('highlight.value')}>
        <Input
          value={condition.value == null ? '' : String(condition.value)}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
        />
      </FieldWrap>
    )
  }
  if (field.type === 'boolean' || field.type === 'checkbox') {
    return (
      <FieldWrap label={t('highlight.value')}>
        <Select
          value={condition.value ? 'true' : 'false'}
          onChange={(e) => onChange({ ...condition, value: e.target.value === 'true' })}
        >
          <option value="true">{t('highlight.yes')}</option>
          <option value="false">{t('highlight.no')}</option>
        </Select>
      </FieldWrap>
    )
  }
  if (field.type === 'select' && field.config?.options?.length) {
    return (
      <FieldWrap label={t('highlight.value')}>
        <Select
          value={String(condition.value ?? '')}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
        >
          <option value="" />
          {field.config.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </FieldWrap>
    )
  }
  if (field.type === 'date' || field.type === 'datetime') {
    return (
      <FieldWrap label={t('highlight.value')}>
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
      <FieldWrap label={t('highlight.value')}>
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
    <FieldWrap label={t('highlight.value')}>
      <Input
        value={condition.value == null ? '' : String(condition.value)}
        onChange={(e) => onChange({ ...condition, value: e.target.value })}
      />
    </FieldWrap>
  )
}

function ColorSelect({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const { t } = usePrefs()
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-6 w-6 shrink-0 rounded-full border border-line"
        style={{ background: highlightSwatch(value) }}
      />
      <Select value={isNamed(value) ? value : 'custom'} onChange={(e) => {
        if (e.target.value === 'custom') onChange('#6d28d9')
        else onChange(e.target.value)
      }}>
        {HIGHLIGHT_COLORS.map((color) => (
          <option key={color} value={color}>
            {t(`highlight.color.${color}`)}
          </option>
        ))}
        <option value="custom">{t('highlight.custom')}</option>
      </Select>
      {!isNamed(value) ? (
        <input
          type="color"
          className="h-8 w-10 cursor-pointer rounded-lg border border-line"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#6d28d9'}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : null}
    </div>
  )
}

function isNamed(value: string): boolean {
  return (HIGHLIGHT_COLORS as readonly string[]).includes(value)
}

function patch(
  rules: HighlightRule[],
  onChange: (rules: HighlightRule[]) => void,
  index: number,
  next: Partial<HighlightRule>,
) {
  onChange(rules.map((row, i) => (i === index ? { ...row, ...next } : row)))
}

function move(rules: HighlightRule[], index: number, dir: number): HighlightRule[] {
  const next = [...rules]
  const target = index + dir
  if (target < 0 || target >= next.length) return rules
  const [row] = next.splice(index, 1)
  next.splice(target, 0, row)
  return next
}
