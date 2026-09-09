import { uid } from './cn'
import { msg } from './i18n'
import { ratingBandRules, selectValueRules } from './highlight'
import type {
  AutomationAction,
  FieldDef,
  FieldType,
  ListSchema,
  ListSettings,
  SelectOption,
  SublistField,
  TransferAction,
  ViewConfig,
} from '../types/domain'

type TranslateFn = (key: string) => string

export interface TemplateChartSpec {
  key: string
  chart_type: 'timeline' | 'stem' | 'bar' | 'pie' | 'kpi' | 'line'
  config: { dateFieldId?: string; valueFieldId?: string; aggregation?: 'count' | 'avg' | 'sum' }
}

export interface TemplateSpec {
  key: string
  icon: string
  schema: ListSchema
  settings?: ListSettings
  view?: ViewConfig
  charts?: TemplateChartSpec[]
}

export interface TemplatePack {
  key: string
  icon: string
  lists: TemplateSpec[]
  transfers?: Array<{
    fromKey: string
    toKey: string
    fieldMap: Record<string, string>
  }>
  onCheckMoves?: Array<{
    fromKey: string
    toKey: string
    fieldMap: Record<string, string>
  }>
  /** Wire relation fields to sibling lists created in the same pack. */
  relations?: Array<{
    fromKey: string
    fieldId: string
    toKey: string
  }>
}

function f(id: string, type: FieldType, extra: Partial<FieldDef> = {}): FieldDef {
  return { id, key: id, name: id, type, ...extra }
}

function sf(id: string, type: FieldType, extra: Partial<SublistField> = {}): SublistField {
  return { id, key: id, name: id, type, ...extra }
}

function opts(...values: string[]): SelectOption[] {
  return values.map((value) => ({ value, label: value }))
}

function optsColored(...rows: Array<[string, string]>): SelectOption[] {
  return rows.map(([value, color]) => ({ value, label: value, color }))
}

const movieKind = { options: opts('movie', 'series', 'anime', 'doc') }
const gamePlatform = { options: opts('pc', 'ps', 'xbox', 'switch', 'mobile', 'other') }
const shopCategory = { options: opts('food', 'home', 'tech', 'other') }
const playPriority = {
  options: optsColored(['now', '#be123c'], ['soon', '#b45309'], ['someday', '#6e6578']),
}

export const TEMPLATES: TemplateSpec[] = [
  {
    key: 'blank',
    icon: '✨',
    schema: {
      fields: [f('title', 'text', { required: true, config: { maxLength: 200 } })],
      titleFieldId: 'title',
    },
  },
  {
    key: 'movies_watched',
    icon: '🎬',
    schema: {
      fields: [
        f('title', 'text', { required: true, config: { maxLength: 200 } }),
        f('year', 'integer', { config: { min: 1888, max: 2100 } }),
        f('kind', 'select', { config: movieKind }),
        f('poster', 'image', { config: { maxSizeMb: 2, accept: ['image/jpeg', 'image/png', 'image/webp'] } }),
        f('watched_at', 'date'),
        f('ratings', 'multi_rating', { config: { min: 1, max: 10, ratingMax: 10 } }),
        f('seasons', 'sublist', {
          config: {
            subfields: [
              sf('season', 'integer', { required: true, config: { min: 1, max: 80 } }),
              sf('episodes', 'integer', { config: { min: 1, max: 200 } }),
              sf('finished_at', 'date'),
              sf('score', 'rating', { config: { ratingMax: 10, min: 1, max: 10 } }),
            ],
          },
        }),
        f('review', 'textarea', { config: { maxLength: 2000 } }),
      ],
      titleFieldId: 'title',
      imageFieldId: 'poster',
      dateFieldId: 'watched_at',
    },
    view: { mode: 'table', dateFieldId: 'watched_at', imageFieldId: 'poster' },
    charts: [
      { key: 'timeline', chart_type: 'timeline', config: { dateFieldId: 'watched_at', aggregation: 'count' } },
      {
        key: 'ratings',
        chart_type: 'stem',
        config: { dateFieldId: 'watched_at', valueFieldId: 'ratings', aggregation: 'avg' },
      },
    ],
    settings: { highlightRules: ratingBandRules('ratings') },
  },
  {
    key: 'movies_watchlist',
    icon: '🍿',
    schema: {
      fields: [
        f('title', 'text', { required: true, config: { maxLength: 200 } }),
        f('year', 'integer', { config: { min: 1888, max: 2100 } }),
        f('kind', 'select', { config: movieKind }),
        f('poster', 'image', { config: { maxSizeMb: 2 } }),
        f('priority', 'select', { config: playPriority }),
        f('note', 'textarea', { config: { maxLength: 500 } }),
      ],
      titleFieldId: 'title',
      imageFieldId: 'poster',
      groupFieldId: 'priority',
    },
    view: { mode: 'cards', imageFieldId: 'poster', groupFieldId: 'priority' },
    settings: {
      highlightRules: selectValueRules('priority', [
        { value: 'now', color: 'red' },
        { value: 'soon', color: 'yellow' },
        { value: 'someday', color: 'gray' },
      ]),
    },
  },
  {
    key: 'movies_dropped',
    icon: '🚫',
    schema: {
      fields: [
        f('title', 'text', { required: true, config: { maxLength: 200 } }),
        f('year', 'integer', { config: { min: 1888, max: 2100 } }),
        f('kind', 'select', { config: movieKind }),
        f('reason', 'textarea', { config: { maxLength: 500 } }),
        f('decided_at', 'date'),
      ],
      titleFieldId: 'title',
      dateFieldId: 'decided_at',
    },
  },
  {
    key: 'games_done',
    icon: '🎮',
    schema: {
      fields: [
        f('title', 'text', { required: true, config: { maxLength: 200 } }),
        f('platform', 'select', { config: gamePlatform }),
        f('cover', 'image', { config: { maxSizeMb: 2 } }),
        f('finished_at', 'date'),
        f('hours', 'number', { config: { min: 0, max: 10000 } }),
        f('ratings', 'multi_rating', { config: { ratingMax: 10, min: 1, max: 10 } }),
        f('status', 'select', { config: { options: opts('completed', 'main', 'hundred', 'dropped') } }),
        f('note', 'textarea', { config: { maxLength: 1000 } }),
      ],
      titleFieldId: 'title',
      imageFieldId: 'cover',
      dateFieldId: 'finished_at',
      groupFieldId: 'platform',
    },
    view: { mode: 'gallery', imageFieldId: 'cover', dateFieldId: 'finished_at' },
    charts: [
      { key: 'timeline', chart_type: 'timeline', config: { dateFieldId: 'finished_at', aggregation: 'count' } },
      {
        key: 'ratings',
        chart_type: 'stem',
        config: { dateFieldId: 'finished_at', valueFieldId: 'ratings', aggregation: 'avg' },
      },
    ],
    settings: { highlightRules: ratingBandRules('ratings') },
  },
  {
    key: 'games_backlog',
    icon: '🕹️',
    schema: {
      fields: [
        f('title', 'text', { required: true, config: { maxLength: 200 } }),
        f('platform', 'select', { config: gamePlatform }),
        f('cover', 'image', { config: { maxSizeMb: 2 } }),
        f('priority', 'select', { config: playPriority }),
        f('note', 'textarea', { config: { maxLength: 500 } }),
      ],
      titleFieldId: 'title',
      imageFieldId: 'cover',
      groupFieldId: 'priority',
    },
    view: { mode: 'cards', imageFieldId: 'cover', groupFieldId: 'priority' },
  },
  {
    key: 'shopping',
    icon: '🛒',
    schema: {
      fields: [
        f('name', 'text', { required: true, config: { maxLength: 120 } }),
        f('qty', 'number', { config: { min: 0, max: 9999 } }),
        f('category', 'select', { config: shopCategory }),
        f('note', 'text', { config: { maxLength: 200 } }),
        f('bought_at', 'date', { hidden: true }),
      ],
      titleFieldId: 'name',
      dateFieldId: 'bought_at',
      groupFieldId: 'category',
    },
    settings: {
      enableCheck: true,
      onCheck: [{ type: 'set_now', fieldId: 'bought_at' }],
      onUncheck: [{ type: 'restore_snapshot' }],
    },
    view: { mode: 'compact', groupFieldId: 'category' },
  },
  {
    key: 'bought',
    icon: '📦',
    schema: {
      fields: [
        f('name', 'text', { required: true, config: { maxLength: 120 } }),
        f('qty', 'number', { config: { min: 0 } }),
        f('bought_at', 'date'),
        f('price', 'number', { config: { min: 0 } }),
        f('category', 'select', { config: shopCategory }),
      ],
      titleFieldId: 'name',
      dateFieldId: 'bought_at',
    },
    charts: [
      { key: 'spend', chart_type: 'bar', config: { dateFieldId: 'bought_at', valueFieldId: 'price', aggregation: 'sum' } },
    ],
  },
  {
    key: 'later_shopping',
    icon: '🎄',
    schema: {
      fields: [
        f('name', 'text', { required: true, config: { maxLength: 120 } }),
        f('qty', 'number', { config: { min: 0 } }),
        f('when', 'text', { config: { maxLength: 80, placeholder: '' } }),
        f('note', 'textarea', { config: { maxLength: 400 } }),
      ],
      titleFieldId: 'name',
    },
  },
  {
    key: 'todo',
    icon: '✅',
    schema: {
      fields: [
        f('title', 'text', { required: true, config: { maxLength: 200 } }),
        f('due', 'date'),
        f('priority', 'select', {
          config: {
            options: optsColored(['high', '#be123c'], ['mid', '#b45309'], ['low', '#0f766e']),
          },
        }),
        f('done_at', 'date', { hidden: true }),
        f('notes', 'textarea', { config: { maxLength: 1000 } }),
      ],
      titleFieldId: 'title',
      dateFieldId: 'due',
      groupFieldId: 'priority',
    },
    settings: {
      enableCheck: true,
      onCheck: [{ type: 'set_now', fieldId: 'done_at' }],
      onUncheck: [{ type: 'restore_snapshot' }],
    },
    view: { mode: 'compact', groupFieldId: 'priority' },
  },
  {
    key: 'books',
    icon: '📚',
    schema: {
      fields: [
        f('title', 'text', { required: true, config: { maxLength: 200 } }),
        f('author', 'text', { config: { maxLength: 120 } }),
        f('finished_at', 'date'),
        f('ratings', 'multi_rating', { config: { ratingMax: 10 } }),
        f('status', 'select', { config: { options: opts('want', 'reading', 'done', 'dropped') } }),
        f('note', 'textarea', { config: { maxLength: 2000 } }),
      ],
      titleFieldId: 'title',
      dateFieldId: 'finished_at',
      groupFieldId: 'status',
    },
    view: { mode: 'board', groupFieldId: 'status' },
    settings: { highlightRules: ratingBandRules('ratings') },
  },
  {
    key: 'catalog_items',
    icon: '📚',
    schema: {
      fields: [
        f('title', 'text', { required: true, config: { maxLength: 200 } }),
        f('year', 'integer', { config: { min: 1, max: 2100 } }),
        f('kind', 'select', { config: { options: opts('film', 'book', 'game', 'place', 'other') } }),
        f('cover', 'image', {
          config: { maxSizeMb: 2, accept: ['image/jpeg', 'image/png', 'image/webp'] },
        }),
        f('note', 'textarea', { config: { maxLength: 2000 } }),
      ],
      titleFieldId: 'title',
      imageFieldId: 'cover',
      groupFieldId: 'kind',
    },
    view: { mode: 'cards', imageFieldId: 'cover', groupFieldId: 'kind' },
  },
  {
    key: 'event_log',
    icon: '🗒️',
    schema: {
      fields: [
        f('subject', 'relation', {
          required: true,
          config: { relationDisplay: 'title_cover', allowMultiple: false },
        }),
        f('happened_at', 'date', { required: true }),
        f('score', 'rating', { config: { ratingMax: 10, min: 1, max: 10 } }),
        f('note', 'textarea', { config: { maxLength: 2000 } }),
      ],
      titleFieldId: 'subject',
      dateFieldId: 'happened_at',
    },
    view: { mode: 'table', dateFieldId: 'happened_at' },
    charts: [
      { key: 'timeline', chart_type: 'timeline', config: { dateFieldId: 'happened_at', aggregation: 'count' } },
      {
        key: 'ratings',
        chart_type: 'stem',
        config: { dateFieldId: 'happened_at', valueFieldId: 'score', aggregation: 'avg' },
      },
    ],
    settings: { highlightRules: ratingBandRules('score') },
  },
]

export const TEMPLATE_PACKS: TemplatePack[] = [
  {
    key: 'catalog_log',
    icon: '📖',
    lists: [
      TEMPLATES.find((t) => t.key === 'catalog_items')!,
      TEMPLATES.find((t) => t.key === 'event_log')!,
    ],
    relations: [{ fromKey: 'event_log', fieldId: 'subject', toKey: 'catalog_items' }],
  },
  {
    key: 'cinema',
    icon: '🎬',
    lists: [
      TEMPLATES.find((t) => t.key === 'movies_watchlist')!,
      TEMPLATES.find((t) => t.key === 'movies_watched')!,
      TEMPLATES.find((t) => t.key === 'movies_dropped')!,
    ],
    transfers: [
      {
        fromKey: 'movies_watchlist',
        toKey: 'movies_watched',
        fieldMap: { title: 'title', year: 'year', kind: 'kind', poster: 'poster' },
      },
      {
        fromKey: 'movies_watchlist',
        toKey: 'movies_dropped',
        fieldMap: { title: 'title', year: 'year', kind: 'kind' },
      },
    ],
  },
  {
    key: 'groceries',
    icon: '🛒',
    lists: [
      TEMPLATES.find((t) => t.key === 'shopping')!,
      TEMPLATES.find((t) => t.key === 'bought')!,
      TEMPLATES.find((t) => t.key === 'later_shopping')!,
    ],
    transfers: [
      {
        fromKey: 'shopping',
        toKey: 'bought',
        fieldMap: { name: 'name', qty: 'qty', category: 'category' },
      },
      {
        fromKey: 'shopping',
        toKey: 'later_shopping',
        fieldMap: { name: 'name', qty: 'qty' },
      },
      {
        fromKey: 'bought',
        toKey: 'shopping',
        fieldMap: { name: 'name', qty: 'qty', category: 'category' },
      },
    ],
    onCheckMoves: [
      {
        fromKey: 'shopping',
        toKey: 'bought',
        fieldMap: { name: 'name', qty: 'qty', category: 'category', bought_at: 'bought_at' },
      },
    ],
  },
  {
    key: 'games',
    icon: '🎮',
    lists: [
      TEMPLATES.find((t) => t.key === 'games_backlog')!,
      TEMPLATES.find((t) => t.key === 'games_done')!,
    ],
    transfers: [
      {
        fromKey: 'games_backlog',
        toKey: 'games_done',
        fieldMap: { title: 'title', platform: 'platform', cover: 'cover' },
      },
    ],
  },
]

function localizeField(templateKey: string, field: FieldDef, t: TranslateFn, parentId?: string): FieldDef {
  const nameKey = parentId
    ? `tpl.${templateKey}.sub.${parentId}.${field.id}`
    : `tpl.${templateKey}.field.${field.id}`
  const config = field.config ? { ...field.config } : undefined
  if (config?.options) {
    config.options = config.options.map((opt) => ({
      ...opt,
      label: t(`tpl.${templateKey}.opt.${field.id}.${opt.value}`),
    }))
  }
  if (config && Object.prototype.hasOwnProperty.call(config, 'placeholder')) {
    config.placeholder = t(`tpl.${templateKey}.ph.${field.id}`)
  }
  if (config?.subfields) {
    config.subfields = config.subfields.map((sub) => {
      const loc = localizeField(templateKey, sub as FieldDef, t, field.id)
      return {
        id: loc.id,
        key: loc.key,
        name: loc.name,
        type: loc.type,
        required: loc.required,
        config: loc.config,
      }
    })
  }
  return { ...field, name: t(nameKey), config }
}

export function localizeSchema(templateKey: string, schema: ListSchema, t: TranslateFn = msg): ListSchema {
  return {
    ...schema,
    fields: schema.fields.map((field) => localizeField(templateKey, field, t)),
  }
}

export function localizeTemplate(
  spec: TemplateSpec,
  t: TranslateFn = msg,
): {
  title: string
  schema: ListSchema
  settings: ListSettings
  charts: Array<{ name: string; chart_type: TemplateChartSpec['chart_type']; config: TemplateChartSpec['config'] }>
} {
  const settings = structuredClone(spec.settings ?? {})
  if (settings.enableCheck) {
    settings.checkLabel = t(`tpl.${spec.key}.checkLabel`)
  }
  return {
    title: t(`tpl.${spec.key}.title`),
    schema: localizeSchema(spec.key, structuredClone(spec.schema), t),
    settings,
    charts: (spec.charts ?? []).map((chart) => ({
      name: t(`tpl.${spec.key}.chart.${chart.key}`),
      chart_type: chart.chart_type,
      config: chart.config,
    })),
  }
}

export function blankSchema(titleFieldName: string): ListSchema {
  return {
    fields: [f('title', 'text', { required: true, config: { maxLength: 200 }, name: titleFieldName })],
    titleFieldId: 'title',
  }
}

export function cloneTemplate(
  spec: TemplateSpec,
  t: TranslateFn = msg,
): {
  title: string
  icon: string
  schema: ListSchema
  settings: ListSettings
  view_config: ViewConfig
  template_key: string
  charts: Array<{ name: string; chart_type: TemplateChartSpec['chart_type']; config: TemplateChartSpec['config'] }>
} {
  const localized = localizeTemplate(spec, t)
  return {
    title: localized.title,
    icon: spec.icon,
    schema: localized.schema,
    settings: localized.settings,
    view_config: structuredClone(spec.view ?? { mode: 'table' }),
    template_key: spec.key,
    charts: localized.charts,
  }
}

export function newField(type: FieldType = 'text'): FieldDef {
  const id = uid()
  return {
    id,
    key: id.slice(0, 8),
    name: msg('schema.newField'),
    type,
    config: type === 'rating' || type === 'multi_rating' || type === 'community_rating' ? { ratingMax: 10, min: 1, max: 10 } : {},
  }
}

export function applyTransferDefaults(
  actions: TransferAction[],
  extraSet?: Record<string, unknown>,
): TransferAction[] {
  return actions.map((a) => ({
    ...a,
    deleteSource: a.deleteSource ?? true,
    setFields: { ...(a.setFields ?? {}), ...(extraSet ?? {}) },
  }))
}

const STAMP_FIELDS = ['watched_at', 'bought_at', 'decided_at', 'finished_at'] as const

function stampFieldsFor(target: TemplateSpec | undefined): Record<string, unknown> {
  const ids = new Set((target?.schema.fields ?? []).map((field) => field.id))
  return Object.fromEntries(STAMP_FIELDS.filter((id) => ids.has(id)).map((id) => [id, '$today']))
}

export function applyPackSettings(
  pack: TemplatePack,
  created: Record<string, string>,
  t: TranslateFn = msg,
): Array<{ listId: string; settings: ListSettings; schema?: ListSchema }> {
  const byKey: Record<string, ListSettings> = {}
  const schemaByKey: Record<string, ListSchema> = {}
  for (const spec of pack.lists) {
    const localized = localizeTemplate(spec, t)
    byKey[spec.key] = localized.settings
    schemaByKey[spec.key] = localized.schema
  }

  for (const link of pack.relations ?? []) {
    const relatedId = created[link.toKey]
    const schema = schemaByKey[link.fromKey]
    if (!relatedId || !schema) continue
    const field = schema.fields.find((row) => row.id === link.fieldId)
    if (!field) continue
    field.config = { ...field.config, relatedListId: relatedId }
  }

  for (const transfer of pack.transfers ?? []) {
    const fromId = created[transfer.fromKey]
    const toId = created[transfer.toKey]
    if (!fromId || !toId) continue
    const target = pack.lists.find((row) => row.key === transfer.toKey)
    const settings = byKey[transfer.fromKey] ?? {}
    settings.transferActions = [
      ...(settings.transferActions ?? []),
      {
        id: crypto.randomUUID(),
        label: t(`tpl.pack_${pack.key}.transfer.${transfer.fromKey}__${transfer.toKey}`),
        targetListId: toId,
        fieldMap: transfer.fieldMap,
        deleteSource: true,
        setFields: stampFieldsFor(target),
      },
    ]
    byKey[transfer.fromKey] = settings
  }

  for (const move of pack.onCheckMoves ?? []) {
    const toId = created[move.toKey]
    if (!toId) continue
    const settings = byKey[move.fromKey] ?? {}
    settings.onCheck = [
      ...(settings.onCheck ?? []),
      { type: 'move_to_list', targetListId: toId, fieldMap: move.fieldMap, deleteSource: true },
    ]
    settings.onUncheck = settings.onUncheck ?? [{ type: 'restore_snapshot' }]
    byKey[move.fromKey] = settings
  }

  const packIds = pack.lists.map((spec) => created[spec.key]).filter(Boolean)
  for (const spec of pack.lists) {
    const listId = created[spec.key]
    if (!listId) continue
    const settings = byKey[spec.key] ?? {}
    const siblings = packIds.filter((id) => id !== listId)
    settings.relatedListIds = [...new Set([...(settings.relatedListIds ?? []), ...siblings])]
    byKey[spec.key] = settings
  }

  return pack.lists
    .map((spec) => {
      const listId = created[spec.key]
      if (!listId) return null
      const schema = schemaByKey[spec.key]
      const linked = Boolean(pack.relations?.some((row) => row.fromKey === spec.key))
      return {
        listId,
        settings: byKey[spec.key] ?? {},
        ...(linked ? { schema } : {}),
      }
    })
    .filter((row): row is { listId: string; settings: ListSettings; schema?: ListSchema } => Boolean(row))
}

export function checkActionsFromTemplate(spec: TemplateSpec): AutomationAction[] {
  return spec.settings?.onCheck ?? []
}
