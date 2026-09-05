import { nowIso, nowLocalIso, todayIso } from './cn'
import { fetchItem, moveItem, updateItem } from '../services/api'
import type {
  AutomationAction,
  FieldDef,
  ItemRow,
  ListAutomation,
  ListSettings,
  TransferAction,
} from '../types/domain'

function stampForField(field: FieldDef | undefined, token: 'now' | 'today' | 'set_now'): string {
  if (field?.type === 'datetime') return nowLocalIso()
  if (field?.type === 'date' || token === 'today' || token === 'set_now') return todayIso()
  return nowLocalIso()
}

function resolveValue(
  action: AutomationAction,
  snapshot: Record<string, unknown>,
  field?: FieldDef,
): unknown {
  if (action.type === 'set_now') return stampForField(field, 'set_now')
  if (action.type === 'set_field') {
    if (action.value === '$now') return stampForField(field, 'now')
    if (action.value === '$today') return stampForField(field, 'today')
    return action.value
  }
  if (action.type === 'restore_snapshot') return snapshot
  return null
}

export async function applyActions(
  item: ItemRow,
  actions: AutomationAction[],
  userId: string,
  fields?: FieldDef[],
): Promise<ItemRow> {
  let current = item
  for (const action of actions) {
    if (action.type === 'set_field' || action.type === 'set_now') {
      const fieldId = action.fieldId
      const field = fields?.find((row) => row.id === fieldId)
      const nextValues = {
        ...current.values,
        [fieldId]: resolveValue(action, current.check_snapshot ?? {}, field),
      }
      current = await updateItem(current.id, {
        values: nextValues,
        updated_by: userId,
      })
    } else if (action.type === 'restore_snapshot' && current.check_snapshot) {
      current = await updateItem(current.id, {
        values: current.check_snapshot,
        check_snapshot: null,
        updated_by: userId,
      })
    } else if (action.type === 'move_to_list') {
      const newId = await moveItem({
        itemId: current.id,
        targetListId: action.targetListId,
        fieldMap: action.fieldMap,
        deleteSource: action.deleteSource ?? true,
      })
      const moved = await fetchItem(newId)
      if (moved) current = moved
    }
  }
  return current
}

export function resolveSetFields(
  setFields: Record<string, unknown> | undefined,
  fields: FieldDef[],
): Record<string, unknown> {
  if (!setFields) return {}
  const next: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(setFields)) {
    const field = fields.find((row) => row.id === key || row.key === key)
    const id = field?.id ?? key
    if (raw === '$now') next[id] = stampForField(field, 'now')
    else if (raw === '$today') next[id] = stampForField(field, 'today')
    else next[id] = raw
  }
  return next
}

export function fieldValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  if (typeof a === 'object' || typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b)
    } catch {
      return false
    }
  }
  return String(a) === String(b)
}

export function matchingFieldEquals(
  automations: ListAutomation[],
  previous: Record<string, unknown> | undefined,
  next: Record<string, unknown>,
): ListAutomation[] {
  return automations.filter((row) => {
    if (!row.enabled || row.trigger.type !== 'field_equals') return false
    const id = row.trigger.fieldId
    return fieldValuesEqual(next[id], row.trigger.value) && !fieldValuesEqual(previous?.[id], row.trigger.value)
  })
}

export async function applyFieldEquals(input: {
  item: ItemRow
  previous: Record<string, unknown> | undefined
  next: Record<string, unknown>
  userId: string
  fields: FieldDef[]
  automations: ListAutomation[]
}): Promise<ItemRow> {
  let current = { ...input.item, values: input.next }
  for (const auto of matchingFieldEquals(input.automations, input.previous, input.next)) {
    current = await applyActions(current, auto.actions, input.userId, input.fields)
  }
  return current
}

export async function transferItem(input: {
  item: ItemRow
  action: TransferAction
  userId: string
  fields: FieldDef[]
  targetFields?: FieldDef[]
  automations: ListAutomation[]
}): Promise<string> {
  let current = input.item
  for (const auto of matchingAutomations(input.automations, 'button', input.action.id)) {
    current = await applyActions(current, auto.actions, input.userId, input.fields)
  }
  const newId = await moveItem({
    itemId: current.id,
    targetListId: input.action.targetListId,
    fieldMap: input.action.fieldMap,
    deleteSource: input.action.deleteSource ?? true,
  })
  const resolved = resolveSetFields(input.action.setFields, input.targetFields ?? [])
  if (Object.keys(resolved).length) {
    const moved = await fetchItem(newId)
    if (moved) {
      await updateItem(newId, {
        values: { ...moved.values, ...resolved },
        updated_by: input.userId,
      })
    }
  }
  return newId
}

export function matchingAutomations(
  automations: ListAutomation[],
  trigger: AutomationAction extends never ? never : 'checked' | 'unchecked' | 'button',
  actionId?: string,
): ListAutomation[] {
  return automations.filter((a) => {
    if (!a.enabled) return false
    if (a.trigger.type === 'checked' && trigger === 'checked') return true
    if (a.trigger.type === 'unchecked' && trigger === 'unchecked') return true
    if (a.trigger.type === 'button' && trigger === 'button' && a.trigger.actionId === actionId) {
      return true
    }
    return false
  })
}

export async function toggleChecked(input: {
  item: ItemRow
  userId: string
  settings: ListSettings
  automations: ListAutomation[]
  next: boolean
  fields?: FieldDef[]
}): Promise<ItemRow> {
  const snapshot = input.next ? input.item.values : input.item.check_snapshot
  let current = await updateItem(input.item.id, {
    is_checked: input.next,
    checked_at: input.next ? nowIso() : null,
    check_snapshot: input.next ? input.item.values : input.item.check_snapshot,
    updated_by: input.userId,
  })

  const fromSettings = input.next ? (input.settings.onCheck ?? []) : (input.settings.onUncheck ?? [])
  if (fromSettings.length) {
    current = await applyActions(
      { ...current, check_snapshot: snapshot as Record<string, unknown> },
      fromSettings,
      input.userId,
      input.fields,
    )
  }

  const autos = matchingAutomations(
    input.automations,
    input.next ? 'checked' : 'unchecked',
  )
  for (const auto of autos) {
    current = await applyActions(current, auto.actions, input.userId, input.fields)
  }
  return current
}
