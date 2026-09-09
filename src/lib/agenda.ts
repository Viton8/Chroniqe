import type {
  AgendaConfig,
  FieldDef,
  HighlightCondition,
  HighlightMatch,
  ItemRating,
  ItemRow,
  ListSchema,
  ListSettings,
} from '../types/domain'
import { filterDateFields } from './filters'
import { conditionMatches, HIGHLIGHT_CHECKED_ID } from './highlight'

export const CHECKED_DONE: HighlightCondition = {
  fieldId: HIGHLIGHT_CHECKED_ID,
  op: 'eq',
  value: true,
}

export interface ResolvedAgenda {
  dateField: FieldDef
  doneMatch: HighlightMatch
  done: HighlightCondition[]
}

/** What the settings editor should show, including the old schema date fallback. */
export function effectiveAgendaConfig(
  schema: ListSchema,
  settings?: ListSettings | null,
): AgendaConfig | undefined {
  if (settings?.agenda) return settings.agenda
  if (!schema.dateFieldId) return undefined
  return {
    dateFieldId: schema.dateFieldId,
    done: settings?.enableCheck ? [CHECKED_DONE] : [],
  }
}

export function resolveAgenda(
  schema: ListSchema,
  settings?: ListSettings | null,
): ResolvedAgenda | null {
  const dateFields = filterDateFields(schema)
  const configured = settings?.agenda
  let dateFieldId: string | undefined

  if (configured) {
    if (!configured.dateFieldId) return null
    dateFieldId = configured.dateFieldId
  } else if (settings?.enableCheck && schema.dateFieldId) {
    dateFieldId = schema.dateFieldId
  } else {
    return null
  }

  const dateField = dateFields.find((field) => field.id === dateFieldId)
  if (!dateField) return null

  const done =
    configured && 'done' in configured
      ? (configured.done ?? [])
      : settings?.enableCheck
        ? [CHECKED_DONE]
        : []

  return {
    dateField,
    done,
    doneMatch: configured?.doneMatch === 'any' ? 'any' : 'all',
  }
}

export function itemLeavesAgenda(
  item: ItemRow,
  agenda: ResolvedAgenda,
  schema: ListSchema,
  ratings: ItemRating[],
): boolean {
  if (!agenda.done.length) return false
  if (agenda.doneMatch === 'any') {
    return agenda.done.some((row) => conditionMatches(row, item, schema, ratings))
  }
  return agenda.done.every((row) => conditionMatches(row, item, schema, ratings))
}

export function agendaDoneMode(done: HighlightCondition[]): 'none' | 'checked' | 'field' {
  if (!done.length) return 'none'
  if (
    done.length === 1 &&
    done[0].fieldId === HIGHLIGHT_CHECKED_ID &&
    (done[0].op === 'eq' || done[0].op === 'not_empty')
  ) {
    return 'checked'
  }
  return 'field'
}
