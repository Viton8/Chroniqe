import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { usePrefs } from '../../context/PrefsContext'
import { useToast } from '../../context/ToastContext'
import {
  createAutomation,
  deleteAutomation,
  fetchAutomations,
  fetchMyLists,
  updateAutomation,
} from '../../services/api'
import type {
  AutomationAction,
  FieldDef,
  ListAutomation,
  ListRow,
  TransferAction,
} from '../../types/domain'
import Button from '../ui/Button'
import Hint from '../ui/Hint'
import { FieldWrap, Input } from '../ui/Input'
import FieldInput from '../fields/FieldInput'

const selectClass = 'w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm'

export default function FlowEditor({
  list,
  userId,
  onChange,
  onSaveSettings,
}: {
  list: ListRow
  userId: string
  onChange: (list: ListRow) => void
  onSaveSettings: () => Promise<void>
}) {
  const { t } = usePrefs()
  const { toast } = useToast()
  const [lists, setLists] = useState<ListRow[]>([])
  const [rules, setRules] = useState<ListAutomation[]>([])
  const fields = list.schema.fields

  useEffect(() => {
    let cancelled = false
    void Promise.all([fetchMyLists(userId), fetchAutomations(list.id)]).then(([mine, autos]) => {
      if (cancelled) return
      setLists(mine.filter((row) => row.id !== list.id))
      setRules(autos)
    })
    return () => {
      cancelled = true
    }
  }, [list.id, userId])

  const patchSettings = (next: ListRow['settings']) => {
    onChange({ ...list, settings: next })
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="font-medium">{t('flow.moves')}</h3>
        <Hint title={t('flow.movesHint')} example={t('settingsModal.flowEx')} />
        {(list.settings?.transferActions ?? []).map((action) => (
          <TransferCard
            key={action.id}
            action={action}
            lists={lists}
            sourceFields={fields}
            onChange={(next) =>
              patchSettings({
                ...list.settings,
                transferActions: (list.settings?.transferActions ?? []).map((row) =>
                  row.id === next.id ? next : row,
                ),
              })
            }
            onRemove={() =>
              patchSettings({
                ...list.settings,
                transferActions: (list.settings?.transferActions ?? []).filter((row) => row.id !== action.id),
              })
            }
          />
        ))}
        <Button
          variant="soft"
          size="sm"
          disabled={!lists.length}
          onClick={() => {
            const target = lists[0]
            if (!target) return
            const action: TransferAction = {
              id: crypto.randomUUID(),
              label: t('settingsModal.move'),
              targetListId: target.id,
              fieldMap: guessFieldMap(fields, target.schema.fields),
              deleteSource: true,
            }
            patchSettings({
              ...list.settings,
              transferActions: [...(list.settings?.transferActions ?? []), action],
            })
          }}
        >
          <Plus size={14} /> {t('settingsModal.addButton')}
        </Button>
        {!lists.length ? <p className="text-xs text-muted">{t('flow.noLists')}</p> : null}
      </section>

      <section className="space-y-3">
        <h3 className="font-medium">{t('flow.onCheck')}</h3>
        <Hint title={t('flow.automationsHint')} example={t('flow.automationsEx')} />
        <ActionEditor
          actions={list.settings?.onCheck ?? []}
          fields={fields}
          onChange={(onCheck) => patchSettings({ ...list.settings, onCheck })}
        />
        <h3 className="pt-2 font-medium">{t('flow.onUncheck')}</h3>
        <p className="text-xs text-muted">{t('flow.onUncheckHint')}</p>
        <ActionEditor
          actions={list.settings?.onUncheck ?? []}
          fields={fields}
          onChange={(onUncheck) => patchSettings({ ...list.settings, onUncheck })}
        />
      </section>

      <section className="space-y-3">
        <h3 className="font-medium">{t('flow.named')}</h3>
        <Hint title={t('flow.namedHint')} example={t('flow.namedEx')} />
        {rules.map((rule) => (
          <article key={rule.id} className="space-y-3 rounded-2xl border border-line p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="min-w-0 flex-1"
                value={rule.name}
                onChange={(e) =>
                  setRules((prev) => prev.map((row) => (row.id === rule.id ? { ...row, name: e.target.value } : row)))
                }
              />
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) =>
                    setRules((prev) =>
                      prev.map((row) => (row.id === rule.id ? { ...row, enabled: e.target.checked } : row)),
                    )
                  }
                />
                {t('flow.enabled')}
              </label>
              <button
                type="button"
                className="text-rose-700"
                onClick={() => {
                  void deleteAutomation(rule.id)
                    .then(() => setRules((prev) => prev.filter((row) => row.id !== rule.id)))
                    .catch((error) => toast(error instanceof Error ? error.message : t('common.error'), 'err'))
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <FieldWrap label={t('flow.trigger')} hint={t(`flow.triggerHint.${rule.trigger.type}`)}>
              <select
                className={selectClass}
                value={rule.trigger.type}
                onChange={(e) => {
                  const type = e.target.value
                  setRules((prev) =>
                    prev.map((row) => {
                      if (row.id !== rule.id) return row
                      if (type === 'button') {
                        return {
                          ...row,
                          trigger: {
                            type: 'button',
                            actionId: (list.settings?.transferActions ?? [])[0]?.id ?? '',
                          },
                        }
                      }
                      if (type === 'field_equals') {
                        return {
                          ...row,
                          trigger: { type: 'field_equals', fieldId: fields[0]?.id ?? '', value: '' },
                        }
                      }
                      return { ...row, trigger: { type: type as 'checked' | 'unchecked' } }
                    }),
                  )
                }}
              >
                <option value="checked">{t('flow.checked')}</option>
                <option value="unchecked">{t('flow.unchecked')}</option>
                <option value="button" disabled={!(list.settings?.transferActions ?? []).length}>
                  {t('flow.button')}
                </option>
                <option value="field_equals">{t('flow.fieldEquals')}</option>
              </select>
            </FieldWrap>
            {rule.trigger.type === 'button' ? (
              <FieldWrap label={t('flow.pickButton')}>
                <select
                  className={selectClass}
                  value={rule.trigger.actionId}
                  onChange={(e) =>
                    setRules((prev) =>
                      prev.map((row) =>
                        row.id === rule.id
                          ? { ...row, trigger: { type: 'button', actionId: e.target.value } }
                          : row,
                      ),
                    )
                  }
                >
                  {(list.settings?.transferActions ?? []).map((action) => (
                    <option key={action.id} value={action.id}>
                      {action.label}
                    </option>
                  ))}
                </select>
              </FieldWrap>
            ) : null}
            {rule.trigger.type === 'field_equals' ? (
              <FieldEqualsTrigger
                listId={list.id}
                userId={userId}
                fields={fields}
                fieldId={rule.trigger.fieldId}
                value={rule.trigger.value}
                onFieldId={(fieldId) =>
                  setRules((prev) =>
                    prev.map((row) =>
                      row.id === rule.id && row.trigger.type === 'field_equals'
                        ? { ...row, trigger: { ...row.trigger, fieldId } }
                        : row,
                    ),
                  )
                }
                onValue={(value) =>
                  setRules((prev) =>
                    prev.map((row) =>
                      row.id === rule.id && row.trigger.type === 'field_equals'
                        ? { ...row, trigger: { ...row.trigger, value } }
                        : row,
                    ),
                  )
                }
              />
            ) : null}
            <ActionEditor
              actions={rule.actions}
              fields={fields}
              onChange={(actions) =>
                setRules((prev) => prev.map((row) => (row.id === rule.id ? { ...row, actions } : row)))
              }
            />
            <Button
              size="sm"
              variant="soft"
              onClick={() => {
                if (rule.trigger.type === 'button' && !rule.trigger.actionId) {
                  toast(t('flow.pickButton'), 'err')
                  return
                }
                void updateAutomation(rule.id, {
                  name: rule.name,
                  enabled: rule.enabled,
                  trigger: rule.trigger,
                  actions: rule.actions,
                })
                  .then(() => toast(t('settingsModal.saved')))
                  .catch((error) => toast(error instanceof Error ? error.message : t('common.error'), 'err'))
              }}
            >
              {t('common.save')}
            </Button>
          </article>
        ))}
        <Button
          variant="soft"
          size="sm"
          onClick={() => {
            const dateField = fields.find((field) => field.type === 'date' || field.type === 'datetime')
            void createAutomation({
              list_id: list.id,
              name: t('flow.ruleName'),
              trigger: { type: 'checked' },
              actions: dateField ? [{ type: 'set_now', fieldId: dateField.id }] : [],
            })
              .then((row) => setRules((prev) => [...prev, row]))
              .catch((error) => toast(error instanceof Error ? error.message : t('common.error'), 'err'))
          }}
        >
          <Plus size={14} /> {t('flow.addRule')}
        </Button>
      </section>

      <Button onClick={() => void onSaveSettings()}>{t('flow.save')}</Button>
    </div>
  )
}

function FieldEqualsTrigger({
  listId,
  userId,
  fields,
  fieldId,
  value,
  onFieldId,
  onValue,
}: {
  listId: string
  userId: string
  fields: FieldDef[]
  fieldId: string
  value: unknown
  onFieldId: (fieldId: string) => void
  onValue: (value: unknown) => void
}) {
  const { t } = usePrefs()
  const field = fields.find((row) => row.id === fieldId)
  return (
    <>
      <FieldWrap label={t('flow.pickField')}>
        <select className={selectClass} value={fieldId} onChange={(e) => onFieldId(e.target.value)}>
          {fields.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
      </FieldWrap>
      {field ? (
        <FieldInput field={field} value={value} listId={listId} userId={userId} onChange={onValue} />
      ) : null}
    </>
  )
}

function TransferCard({
  action,
  lists,
  sourceFields,
  onChange,
  onRemove,
}: {
  action: TransferAction
  lists: ListRow[]
  sourceFields: FieldDef[]
  onChange: (action: TransferAction) => void
  onRemove: () => void
}) {
  const { t } = usePrefs()
  const target = lists.find((row) => row.id === action.targetListId)
  const targetFields = target?.schema.fields ?? []
  const stampable = targetFields.filter((field) => field.type === 'date' || field.type === 'datetime')
  const pairs = Object.entries(action.fieldMap)

  return (
    <article className="space-y-3 rounded-2xl border border-line p-3">
      <div className="flex items-center gap-2">
        <Input
          className="min-w-0 flex-1"
          value={action.label}
          onChange={(e) => onChange({ ...action, label: e.target.value })}
        />
        <button type="button" className="text-rose-700" onClick={onRemove} aria-label={t('settingsModal.remove')}>
          <Trash2 size={14} />
        </button>
      </div>
      <FieldWrap label={t('flow.targetList')}>
        <select
          className={selectClass}
          value={action.targetListId}
          onChange={(e) => {
            const next = lists.find((row) => row.id === e.target.value)
            onChange({
              ...action,
              targetListId: e.target.value,
              fieldMap: next ? guessFieldMap(sourceFields, next.schema.fields) : {},
            })
          }}
        >
          {lists.map((row) => (
            <option key={row.id} value={row.id}>
              {row.icon} {row.title}
            </option>
          ))}
        </select>
      </FieldWrap>
      <p className="text-xs font-medium text-muted">{t('flow.mapFields')}</p>
      {pairs.map(([from, to], index) => (
        <div key={`${from}-${index}`} className="grid grid-cols-2 gap-2">
          <select
            className={selectClass}
            value={from}
            onChange={(e) => onChange({ ...action, fieldMap: replacePair(action.fieldMap, from, e.target.value, to) })}
          >
            {sourceFields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            value={to}
            onChange={(e) => onChange({ ...action, fieldMap: { ...action.fieldMap, [from]: e.target.value } })}
          >
            {targetFields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
              </option>
            ))}
          </select>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="ghost"
          disabled={!sourceFields[0] || !targetFields[0]}
          onClick={() => {
            const from = sourceFields.find((field) => !(field.id in action.fieldMap)) ?? sourceFields[0]
            const to = targetFields[0]
            if (!from || !to) return
            onChange({ ...action, fieldMap: { ...action.fieldMap, [from.id]: to.id } })
          }}
        >
          <Plus size={14} /> {t('flow.mapFields')}
        </Button>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={action.deleteSource !== false}
            onChange={(e) => onChange({ ...action, deleteSource: e.target.checked })}
          />
          {t('flow.deleteSource')}
        </label>
      </div>
      {stampable.length ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted">{t('flow.setFields')}</p>
          {stampable.map((field) => {
            const current = action.setFields?.[field.id] ?? action.setFields?.[field.key ?? '']
            const token = current === '$now' || current === '$today' ? current : ''
            return (
              <FieldWrap key={field.id} label={field.name}>
                <select
                  className={selectClass}
                  value={token}
                  onChange={(e) => {
                    const next = { ...(action.setFields ?? {}) }
                    delete next[field.id]
                    if (field.key) delete next[field.key]
                    if (e.target.value) next[field.id] = e.target.value
                    onChange({ ...action, setFields: next })
                  }}
                >
                  <option value="">{t('flow.setNone')}</option>
                  <option value="$today">{t('flow.valueToday')}</option>
                  <option value="$now">{t('flow.valueNow')}</option>
                </select>
              </FieldWrap>
            )
          })}
        </div>
      ) : null}
    </article>
  )
}

function ActionEditor({
  actions,
  fields,
  onChange,
}: {
  actions: AutomationAction[]
  fields: FieldDef[]
  onChange: (actions: AutomationAction[]) => void
}) {
  const { t } = usePrefs()
  const stampable = fields.filter((field) => field.type === 'date' || field.type === 'datetime')
  const writable = fields.filter((field) => !['image', 'file', 'sublist', 'relation', 'multi_rating', 'community_rating'].includes(field.type))

  return (
    <div className="space-y-2">
      {actions.map((action, index) => {
        const fieldId = 'fieldId' in action ? action.fieldId : ''
        const field = fields.find((row) => row.id === fieldId)
        return (
          <div key={index} className="space-y-2 rounded-2xl bg-ink/5 p-3">
            <div className="flex gap-2">
              <select
                className={selectClass}
                value={action.type}
                onChange={(e) => {
                  const type = e.target.value as AutomationAction['type']
                  const next = defaultAction(type, stampable[0]?.id ?? writable[0]?.id ?? fields[0]?.id ?? '')
                  onChange(actions.map((row, i) => (i === index ? next : row)))
                }}
              >
                <option value="set_now">{t('flow.setNow')}</option>
                <option value="set_field">{t('flow.setField')}</option>
                <option value="restore_snapshot">{t('flow.restore')}</option>
              </select>
              <button
                type="button"
                className="text-rose-700"
                onClick={() => onChange(actions.filter((_, i) => i !== index))}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <p className="text-xs text-muted">
              {action.type === 'set_now'
                ? t('flow.setNowHint')
                : action.type === 'set_field'
                  ? t('flow.setFieldHint')
                  : t('flow.restoreHint')}
            </p>
            {action.type === 'set_now' ? (
              <select
                className={selectClass}
                value={action.fieldId}
                onChange={(e) =>
                  onChange(actions.map((row, i) => (i === index ? { ...action, fieldId: e.target.value } : row)))
                }
              >
                {stampable.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            ) : null}
            {action.type === 'set_field' ? (
              <>
                <select
                  className={selectClass}
                  value={action.fieldId}
                  onChange={(e) =>
                    onChange(actions.map((row, i) => (i === index ? { ...action, fieldId: e.target.value } : row)))
                  }
                >
                  {writable.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant={action.value === '$today' ? 'primary' : 'soft'}
                    onClick={() =>
                      onChange(actions.map((row, i) => (i === index ? { ...action, value: '$today' } : row)))
                    }
                  >
                    {t('flow.valueToday')}
                  </Button>
                  <Button
                    size="sm"
                    variant={action.value === '$now' ? 'primary' : 'soft'}
                    onClick={() =>
                      onChange(actions.map((row, i) => (i === index ? { ...action, value: '$now' } : row)))
                    }
                  >
                    {t('flow.valueNow')}
                  </Button>
                </div>
                {action.value !== '$now' && action.value !== '$today' && field ? (
                  <FieldInput
                    field={field}
                    value={action.value}
                    onChange={(value) =>
                      onChange(actions.map((row, i) => (i === index ? { ...action, value } : row)))
                    }
                  />
                ) : null}
              </>
            ) : null}
          </div>
        )
      })}
      <Button
        size="sm"
        variant="ghost"
        onClick={() =>
          onChange([...actions, defaultAction('set_now', stampable[0]?.id ?? writable[0]?.id ?? fields[0]?.id ?? '')])
        }
      >
        <Plus size={14} /> {t('flow.addAction')}
      </Button>
    </div>
  )
}

function defaultAction(type: AutomationAction['type'], fieldId: string): AutomationAction {
  if (type === 'set_field') return { type, fieldId, value: '$today' }
  if (type === 'restore_snapshot') return { type }
  return { type: 'set_now', fieldId }
}

function guessFieldMap(from: FieldDef[], to: FieldDef[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const field of from) {
    const hit =
      to.find((row) => row.key && row.key === field.key) ??
      to.find((row) => row.id === field.id) ??
      to.find((row) => row.name.trim().toLowerCase() === field.name.trim().toLowerCase())
    if (hit) map[field.id] = hit.id
  }
  return map
}

function replacePair(
  map: Record<string, string>,
  oldFrom: string,
  nextFrom: string,
  to: string,
): Record<string, string> {
  const next = { ...map }
  delete next[oldFrom]
  next[nextFrom] = to
  return next
}
