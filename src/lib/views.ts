import { uid } from './cn'
import { msg } from './i18n'
import type {
  CardLayout,
  FieldViewRole,
  FieldViewStyle,
  ListSchema,
  NamedView,
  ViewConfig,
  ViewKind,
  ViewMode,
} from '../types/domain'
import { VIEW_KINDS } from '../types/domain'

export interface ResolvedViews {
  allowedKinds: ViewKind[]
  views: NamedView[]
  activeViewId: string
  active: NamedView
}

const LEGACY_KIND: Record<string, ViewKind> = {
  table: 'table',
  cards: 'cards',
  board: 'board',
  timeline: 'timeline',
  gallery: 'cards',
  compact: 'cards',
}

export function rolesForKind(kind: ViewKind): FieldViewRole[] {
  if (kind === 'table') return ['hidden', 'column']
  if (kind === 'timeline') return ['hidden', 'cover', 'title', 'badge', 'meta']
  return ['hidden', 'cover', 'title', 'subtitle', 'badge', 'meta']
}

export function fallbackRole(kind: ViewKind): FieldViewRole {
  return kind === 'table' ? 'column' : 'meta'
}

export function isCoverCandidate(field: { type: string }): boolean {
  return field.type === 'image' || field.type === 'file' || field.type === 'url'
}

export function defaultRole(kind: ViewKind, fieldId: string, schema: ListSchema, index: number): FieldViewRole {
  if (kind === 'table') return 'column'
  const field = schema.fields.find((f) => f.id === fieldId)
  if (fieldId === schema.imageFieldId || field?.type === 'image') {
    return 'cover'
  }
  if (fieldId === schema.titleFieldId || index === 0) return 'title'
  if (kind === 'cards' && index === 1) return 'subtitle'
  if (index < 4) return 'meta'
  return 'hidden'
}

export function stylesForSchema(schema: ListSchema, kind: ViewKind, hiddenIds?: string[]): FieldViewStyle[] {
  return mergeFieldStyles(schema, kind, undefined, hiddenIds)
}

export function mergeFieldStyles(
  schema: ListSchema,
  kind: ViewKind,
  existing?: FieldViewStyle[],
  hiddenIds?: string[],
): FieldViewStyle[] {
  const allowed = new Set(rolesForKind(kind))
  const hidden = new Set(hiddenIds ?? [])
  const byId = new Map<string, FieldViewStyle>()
  for (const row of existing ?? []) {
    byId.set(row.fieldId, row)
  }
  return schema.fields.map((field, index) => {
    const prev = byId.get(field.id) ?? (field.key ? byId.get(field.key) : undefined)
    if (prev) {
      const role = allowed.has(prev.role) ? prev.role : defaultRole(kind, field.id, schema, index)
      return { ...prev, fieldId: field.id, role }
    }
    return {
      fieldId: field.id,
      role: field.hidden || hidden.has(field.id) ? 'hidden' : defaultRole(kind, field.id, schema, index),
    }
  })
}

export function applyFieldRole(
  fields: FieldViewStyle[],
  fieldId: string,
  patch: Partial<FieldViewStyle>,
  kind: ViewKind,
): FieldViewStyle[] {
  const next = fields.some((f) => f.fieldId === fieldId)
    ? fields
    : [...fields, { fieldId, role: 'hidden' as FieldViewRole }]
  const exclusive = patch.role === 'cover'
  const demote = fallbackRole(kind)
  return next.map((row) => {
    if (row.fieldId === fieldId) return { ...row, ...patch }
    if (exclusive && row.role === patch.role) return { ...row, role: demote }
    return row
  })
}

function roleOf(fields: FieldViewStyle[], fieldId?: string): FieldViewRole | undefined {
  return fieldId ? fields.find((f) => f.fieldId === fieldId)?.role : undefined
}

function usableFieldId(schema: ListSchema, fields: FieldViewStyle[], fieldId?: string): string | undefined {
  if (!fieldId || !schema.fields.some((f) => f.id === fieldId)) return undefined
  return roleOf(fields, fieldId) === 'hidden' ? undefined : fieldId
}

export function resolveViewSlots(
  schema: ListSchema,
  view: Pick<NamedView, 'kind' | 'fields' | 'coverFieldId' | 'titleFieldId'>,
): { titleFieldId?: string; coverFieldId?: string } {
  const fields = view.fields ?? []
  const allowed = rolesForKind(view.kind)
  const titleFromRole = allowed.includes('title') ? fields.find((f) => f.role === 'title')?.fieldId : undefined
  const coverFromRole = allowed.includes('cover') ? fields.find((f) => f.role === 'cover')?.fieldId : undefined
  return {
    titleFieldId: usableFieldId(schema, fields, view.titleFieldId) ?? titleFromRole,
    coverFieldId: allowed.includes('cover')
      ? (usableFieldId(schema, fields, view.coverFieldId) ?? coverFromRole)
      : undefined,
  }
}

function assignSlots(
  schema: ListSchema,
  kind: ViewKind,
  fields: FieldViewStyle[],
  hints: Pick<NamedView, 'coverFieldId' | 'titleFieldId'>,
): { fields: FieldViewStyle[]; coverFieldId?: string; titleFieldId?: string } {
  const allowed = rolesForKind(kind)
  let next = fields
  const slots = resolveViewSlots(schema, { kind, fields, coverFieldId: hints.coverFieldId, titleFieldId: hints.titleFieldId })

  if (slots.titleFieldId && allowed.includes('title') && !next.some((f) => f.role === 'title')) {
    next = next.map((row) => (row.fieldId === slots.titleFieldId ? { ...row, role: 'title' as FieldViewRole } : row))
  }
  if (slots.coverFieldId && allowed.includes('cover')) {
    next = applyFieldRole(next, slots.coverFieldId, { role: 'cover' }, kind)
  } else if (allowed.includes('cover') && !hints.coverFieldId) {
    next = next.map((row) => (row.role === 'cover' && !slots.coverFieldId ? { ...row, role: fallbackRole(kind) } : row))
  }

  const synced = resolveViewSlots(schema, {
    kind,
    fields: next,
    coverFieldId: slots.coverFieldId,
    titleFieldId: slots.titleFieldId,
  })
  return { fields: next, coverFieldId: synced.coverFieldId, titleFieldId: synced.titleFieldId }
}

export function createNamedView(
  schema: ListSchema,
  kind: ViewKind,
  name: string,
  extra: Partial<NamedView> = {},
): NamedView {
  const fields = mergeFieldStyles(schema, kind, extra.fields)
  const slots = assignSlots(schema, kind, fields, extra)
  return {
    id: extra.id ?? uid(),
    name,
    kind,
    cardLayout: kind === 'cards' ? extra.cardLayout ?? 'grid' : extra.cardLayout,
    density: kind === 'table' ? extra.density ?? 'comfortable' : extra.density,
    groupFieldId: extra.groupFieldId ?? schema.groupFieldId,
    dateFieldId: extra.dateFieldId ?? schema.dateFieldId,
    coverFieldId: slots.coverFieldId,
    titleFieldId: slots.titleFieldId,
    fields: slots.fields,
  }
}

function kindFromMode(mode?: ViewMode): ViewKind {
  return LEGACY_KIND[mode ?? 'table'] ?? 'table'
}

function layoutFromMode(mode?: ViewMode): CardLayout | undefined {
  if (mode === 'gallery') return 'media'
  if (mode === 'compact') return 'compact'
  return undefined
}

export function defaultViewConfig(schema: ListSchema): ViewConfig {
  const table = createNamedView(schema, 'table', 'Таблица')
  return {
    allowedKinds: ['table', 'cards'],
    views: [table],
    activeViewId: table.id,
    mode: 'table',
    imageFieldId: schema.imageFieldId,
  }
}

export function normalizeViewConfig(raw: ViewConfig | null | undefined, schema: ListSchema): ResolvedViews {
  const legacyKind = kindFromMode(raw?.mode)
  const fromStored = (raw?.views ?? []).filter((v) => v && v.id && v.kind)
  const views =
    fromStored.length > 0
      ? fromStored.map((v) =>
          createNamedView(schema, v.kind, v.name || v.kind, {
            ...v,
            fields: v.fields?.length ? v.fields : stylesForSchema(schema, v.kind, raw?.hiddenFieldIds),
          }),
        )
      : [
          createNamedView(schema, legacyKind, defaultName(legacyKind), {
            cardLayout: layoutFromMode(raw?.mode),
            groupFieldId: raw?.groupFieldId ?? schema.groupFieldId,
            dateFieldId: raw?.dateFieldId ?? schema.dateFieldId,
            coverFieldId: raw?.imageFieldId ?? schema.imageFieldId,
            fields: stylesForSchema(schema, legacyKind, raw?.hiddenFieldIds),
          }),
        ]

  const kindsInUse = [...new Set(views.map((v) => v.kind))]
  const allowedKinds = (raw?.allowedKinds?.filter((k) => VIEW_KINDS.includes(k)) ?? []).length
    ? (raw!.allowedKinds!.filter((k) => VIEW_KINDS.includes(k)) as ViewKind[])
    : [...new Set<ViewKind>(['table', 'cards', ...kindsInUse])]

  const visible = views.filter((v) => allowedKinds.includes(v.kind))
  const safeViews = visible.length ? visible : [createNamedView(schema, allowedKinds[0] ?? 'table', defaultName(allowedKinds[0] ?? 'table'))]
  const activeViewId =
    (raw?.activeViewId && safeViews.some((v) => v.id === raw.activeViewId) ? raw.activeViewId : null) ??
    safeViews[0].id

  return {
    allowedKinds,
    views: safeViews,
    activeViewId,
    active: safeViews.find((v) => v.id === activeViewId) ?? safeViews[0],
  }
}

export function toViewConfig(resolved: Omit<ResolvedViews, 'active'>, extras?: Partial<ViewConfig>): ViewConfig {
  const active = resolved.views.find((v) => v.id === resolved.activeViewId) ?? resolved.views[0]
  return {
    ...extras,
    allowedKinds: resolved.allowedKinds,
    views: resolved.views,
    activeViewId: resolved.activeViewId,
    mode: active?.kind ?? 'table',
    imageFieldId: active?.coverFieldId,
    groupFieldId: active?.groupFieldId,
    dateFieldId: active?.dateFieldId,
  }
}

export function fieldsWithRole(view: NamedView, role: FieldViewRole): FieldViewStyle[] {
  return view.fields.filter((f) => f.role === role)
}

export function styleForField(view: NamedView, fieldId: string): FieldViewStyle | undefined {
  return view.fields.find((f) => f.fieldId === fieldId)
}

function defaultName(kind: ViewKind): string {
  return msg(`views.${kind}`)
}
