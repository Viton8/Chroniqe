import { useState } from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import type { FieldViewRole, ListSchema, NamedView, ViewKind } from '../../types/domain'
import { CARD_LAYOUTS, TABLE_DENSITIES, VIEW_KINDS } from '../../types/domain'
import { applyFieldRole, createNamedView, fallbackRole, rolesForKind } from '../../lib/views'
import { usePrefs } from '../../context/PrefsContext'
import { FieldWrap, Input } from '../ui/Input'
import Button from '../ui/Button'
import Hint from '../ui/Hint'
import { cn } from '../../lib/cn'
import { displaysForField, fieldBounds, isNumericField } from '../../lib/display'
import { formulaExample } from '../../lib/formula'

export function ViewsManager({
  schema,
  views,
  allowedKinds,
  activeViewId,
  onChange,
}: {
  schema: ListSchema
  views: NamedView[]
  allowedKinds: ViewKind[]
  activeViewId: string
  onChange: (next: { views: NamedView[]; allowedKinds: ViewKind[]; activeViewId: string }) => void
}) {
  const { t } = usePrefs()
  const kinds = allowedKinds.length ? allowedKinds : [...VIEW_KINDS]
  const [openIds, setOpenIds] = useState<string[]>(() => [activeViewId].filter(Boolean))

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const patchView = (id: string, next: NamedView) => {
    onChange({
      allowedKinds: kinds,
      activeViewId,
      views: views.map((v) => (v.id === id ? next : v)),
    })
  }

  return (
    <div className="space-y-5">
      <Hint title={t('viewEditor.hint')} example={t('viewEditor.hintEx')} />
      <div>
        <p className="mb-2 text-sm font-medium">{t('viewEditor.allowed')}</p>
        <div className="flex flex-wrap gap-3">
          {VIEW_KINDS.map((kind) => (
            <label key={kind} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={kinds.includes(kind)}
                onChange={(e) => {
                  const nextKinds = e.target.checked
                    ? [...new Set([...kinds, kind])]
                    : kinds.filter((k) => k !== kind)
                  const safe = nextKinds.length ? nextKinds : (['table'] as ViewKind[])
                  const nextViews = views.filter((v) => safe.includes(v.kind))
                  const filled =
                    nextViews.length > 0
                      ? nextViews
                      : [createNamedView(schema, safe[0], t(`views.${safe[0]}`))]
                  onChange({
                    allowedKinds: safe,
                    views: filled,
                    activeViewId: filled.some((v) => v.id === activeViewId) ? activeViewId : filled[0].id,
                  })
                }}
              />
              {t(`views.${kind}`)}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {views.map((view, index) => {
          const open = openIds.includes(view.id)
          return (
            <article key={view.id} className="rounded-2xl border border-line">
              <div className="flex items-center gap-2 px-3 py-2.5">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  aria-expanded={open}
                  aria-label={t('viewEditor.toggle')}
                  onClick={() => toggleOpen(view.id)}
                >
                  <ChevronDown
                    size={16}
                    className={cn('shrink-0 text-muted transition-transform', open ? 'rotate-0' : '-rotate-90')}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {view.name || t('viewEditor.viewN', { n: index + 1 })}
                    </span>
                    <span className="block text-xs text-muted">{t(`views.${view.kind}`)}</span>
                  </span>
                </button>
                {views.length > 1 ? (
                  <button
                    type="button"
                    className="shrink-0 text-xs text-muted hover:text-rose-700"
                    onClick={() => {
                      const nextViews = views.filter((v) => v.id !== view.id)
                      setOpenIds((prev) => prev.filter((id) => id !== view.id))
                      onChange({
                        allowedKinds: kinds,
                        views: nextViews,
                        activeViewId: activeViewId === view.id ? nextViews[0].id : activeViewId,
                      })
                    }}
                  >
                    <Trash2 size={14} className="inline" /> {t('common.delete')}
                  </button>
                ) : null}
              </div>
              {open ? (
                <div className="border-t border-line p-4">
                  <ViewEditor
                    schema={schema}
                    view={view}
                    allowedKinds={kinds}
                    onChange={(next) => patchView(view.id, next)}
                  />
                </div>
              ) : null}
            </article>
          )
        })}
      </div>

      <Button
        variant="soft"
        disabled={!kinds.length}
        onClick={() => {
          const kind = kinds[0]
          const name = `${t(`views.${kind}`)} ${views.length + 1}`
          const created = createNamedView(schema, kind, name)
          setOpenIds((prev) => [...prev, created.id])
          onChange({ allowedKinds: kinds, views: [...views, created], activeViewId })
        }}
      >
        <Plus size={14} /> {t('viewEditor.add')}
      </Button>
    </div>
  )
}

export default function ViewEditor({
  schema,
  view,
  allowedKinds,
  onChange,
}: {
  schema: ListSchema
  view: NamedView
  allowedKinds: ViewKind[]
  onChange: (view: NamedView) => void
}) {
  const { t } = usePrefs()
  const kinds = allowedKinds.length ? allowedKinds : [...VIEW_KINDS]
  const roles = rolesForKind(view.kind)
  const groupFields = schema.fields.filter((f) => f.type === 'select')
  const dateFields = schema.fields.filter((f) => f.type === 'date' || f.type === 'datetime')
  const coverFields = schema.fields

  const setKind = (kind: ViewKind) => {
    onChange(
      createNamedView(schema, kind, view.name, {
        ...view,
        kind,
        cardLayout: kind === 'cards' ? view.cardLayout ?? 'grid' : view.cardLayout,
        density: kind === 'table' ? view.density ?? 'comfortable' : view.density,
      }),
    )
  }

  const setField = (fieldId: string, patch: Partial<NamedView['fields'][number]>) => {
    const fields = applyFieldRole(view.fields, fieldId, patch, view.kind)
    const titleFieldId = fields.find((f) => f.role === 'title')?.fieldId
    const coverFieldId = fields.find((f) => f.role === 'cover')?.fieldId
    onChange({ ...view, fields, titleFieldId, coverFieldId })
  }

  const setCover = (coverFieldId?: string) => {
    const canCover = roles.includes('cover')
    const fields = !canCover
      ? view.fields
      : coverFieldId
        ? applyFieldRole(view.fields, coverFieldId, { role: 'cover' }, view.kind)
        : view.fields.map((row) => (row.role === 'cover' ? { ...row, role: fallbackRole(view.kind) } : row))
    onChange({ ...view, fields, coverFieldId })
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldWrap label={t('viewEditor.name')}>
          <Input value={view.name} maxLength={40} onChange={(e) => onChange({ ...view, name: e.target.value })} />
        </FieldWrap>
        <FieldWrap label={t('viewEditor.kind')}>
          <select
            className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm"
            value={view.kind}
            onChange={(e) => setKind(e.target.value as ViewKind)}
          >
            {kinds.map((kind) => (
              <option key={kind} value={kind}>
                {t(`views.${kind}`)}
              </option>
            ))}
          </select>
        </FieldWrap>
      </div>

      {view.kind === 'cards' ? (
        <FieldWrap label={t('viewEditor.cardLayout')}>
          <div className="flex flex-wrap gap-2">
            {CARD_LAYOUTS.map((layout) => (
              <button
                key={layout}
                type="button"
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs',
                  (view.cardLayout ?? 'grid') === layout ? 'bg-ink text-paper' : 'bg-ink/5 text-muted',
                )}
                onClick={() => onChange({ ...view, cardLayout: layout })}
              >
                {t(`viewEditor.layout.${layout}`)}
              </button>
            ))}
          </div>
        </FieldWrap>
      ) : null}

      {view.kind === 'table' ? (
        <FieldWrap label={t('viewEditor.density')}>
          <div className="flex flex-wrap gap-2">
            {TABLE_DENSITIES.map((density) => (
              <button
                key={density}
                type="button"
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs',
                  (view.density ?? 'comfortable') === density ? 'bg-ink text-paper' : 'bg-ink/5 text-muted',
                )}
                onClick={() => onChange({ ...view, density })}
              >
                {t(`viewEditor.densityOpt.${density}`)}
              </button>
            ))}
          </div>
        </FieldWrap>
      ) : null}

      {view.kind === 'board' ? (
        <FieldWrap label={t('viewEditor.groupField')}>
          <select
            className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm"
            value={view.groupFieldId ?? ''}
            onChange={(e) => onChange({ ...view, groupFieldId: e.target.value || undefined })}
          >
            <option value="">—</option>
            {groupFields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </FieldWrap>
      ) : null}

      {view.kind === 'timeline' || view.kind === 'calendar' ? (
        <FieldWrap label={t('viewEditor.dateField')}>
          <select
            className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm"
            value={view.dateFieldId ?? ''}
            onChange={(e) => onChange({ ...view, dateFieldId: e.target.value || undefined })}
          >
            <option value="">—</option>
            {dateFields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </FieldWrap>
      ) : null}

      {roles.includes('cover') ? (
        <FieldWrap label={t('viewEditor.coverField')}>
          <select
            className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm"
            value={view.coverFieldId ?? ''}
            onChange={(e) => setCover(e.target.value || undefined)}
          >
            <option value="">{t('viewEditor.noCover')}</option>
            {coverFields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          {!coverFields.length ? <p className="mt-1 text-xs text-muted">{t('viewEditor.noCoverHint')}</p> : null}
        </FieldWrap>
      ) : null}

      <div>
        <p className="mb-2 text-sm font-medium">{t('viewEditor.fields')}</p>
        <div className="space-y-2">
          {schema.fields.map((field) => {
            const row = view.fields.find((f) => f.fieldId === field.id)
            const rawRole = row?.role ?? 'hidden'
            const role = roles.includes(rawRole) ? rawRole : 'hidden'
            const numeric = isNumericField(field)
            const modes = displaysForField(field)
            const bounds = fieldBounds(field)
            return (
              <div key={field.id} className="rounded-xl bg-ink/[0.03] p-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
                  <p className="self-center text-sm">
                    {field.name}
                    <span className="ml-2 text-xs text-muted">{field.type}</span>
                  </p>
                  <select
                    className="rounded-xl border border-line bg-paper px-2 py-1.5 text-xs"
                    value={role}
                    onChange={(e) => setField(field.id, { role: e.target.value as FieldViewRole })}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {t(`viewEditor.role.${r}`)}
                      </option>
                    ))}
                  </select>
                </div>
                {role !== 'hidden' ? (
                  <div className="mt-2 space-y-2">
                    {numeric && modes.length > 1 ? (
                      <div>
                        <p className="mb-1 text-xs text-muted">{t('viewEditor.display')}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {modes.map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              className={cn(
                                'rounded-xl px-2.5 py-1 text-xs',
                                (row?.numberDisplay ?? 'number') === mode
                                  ? 'bg-ink text-paper'
                                  : 'bg-ink/5 text-muted',
                              )}
                              onClick={() =>
                                setField(field.id, { numberDisplay: mode === 'number' ? undefined : mode })
                              }
                            >
                              {t(`viewEditor.displayOpt.${mode}`)}
                            </button>
                          ))}
                        </div>
                        {row?.numberDisplay === 'range' || row?.numberDisplay === 'fraction' ? (
                          <p className="mt-1 text-xs text-muted">
                            {bounds.min == null && bounds.max == null
                              ? t('viewEditor.displayNeedBounds')
                              : t('viewEditor.displayBounds', {
                                  from: bounds.min ?? '—',
                                  to: bounds.max ?? '—',
                                })}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    <div className={cn('grid gap-2', numeric ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
                      {numeric ? (
                        <Input
                          className="text-xs"
                          placeholder={formulaExample(field)}
                          value={row?.formula ?? ''}
                          onChange={(e) => setField(field.id, { formula: e.target.value || undefined })}
                        />
                      ) : null}
                      <Input
                        className="text-xs"
                        placeholder={t('viewEditor.prefix')}
                        value={row?.prefix ?? ''}
                        onChange={(e) => setField(field.id, { prefix: e.target.value || undefined })}
                      />
                      <Input
                        className="text-xs"
                        placeholder={t('viewEditor.suffix')}
                        value={row?.suffix ?? ''}
                        onChange={(e) => setField(field.id, { suffix: e.target.value || undefined })}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
