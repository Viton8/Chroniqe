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
  if (kind === 'timeline') return ['hidden', 'title', 'badge', 'meta']
  return ['hidden', 'cover', 'title', 'subtitle', 'badge', 'meta']
}

export function defaultRole(kind: ViewKind, fieldId: string, schema: ListSchema, index: number): FieldViewRole {
  if (kind === 'table') return 'column'
  if (fieldId === schema.imageFieldId || schema.fields.find((f) => f.id === fieldId)?.type === 'image') {
    return kind === 'timeline' ? 'hidden' : 'cover'
  }
  if (fieldId === schema.titleFieldId || index === 0) return 'title'
  if (kind === 'cards' && index === 1) return 'subtitle'
  if (index < 4) return kind === 'table' ? 'column' : 'meta'
  return 'hidden'
}

export function stylesForSchema(schema: ListSchema, kind: ViewKind, hiddenIds?: string[]): FieldViewStyle[] {
  const hidden = new Set(hiddenIds ?? [])
  return schema.fields.map((field, index) => ({
    fieldId: field.id,
    role: field.hidden || hidden.has(field.id) ? 'hidden' : defaultRole(kind, field.id, schema, index),
  }))
}

export function createNamedView(
  schema: ListSchema,
  kind: ViewKind,
  name: string,
  extra: Partial<NamedView> = {},
): NamedView {
  const fields = extra.fields ?? stylesForSchema(schema, kind)
  const title = fields.find((f) => f.role === 'title')?.fieldId ?? schema.titleFieldId
  const cover = fields.find((f) => f.role === 'cover')?.fieldId ?? schema.imageFieldId
  return {
    id: extra.id ?? uid(),
    name,
    kind,
    cardLayout: kind === 'cards' ? extra.cardLayout ?? 'grid' : extra.cardLayout,
    density: kind === 'table' ? extra.density ?? 'comfortable' : extra.density,
    groupFieldId: extra.groupFieldId ?? schema.groupFieldId,
    dateFieldId: extra.dateFieldId ?? schema.dateFieldId,
    coverFieldId: cover,
    titleFieldId: title,
    fields,
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
