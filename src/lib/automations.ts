import { nowIso, todayIso } from './cn'
import { moveItem, updateItem } from '../services/api'
import type { AutomationAction, ItemRow, ListAutomation, ListSettings } from '../types/domain'

function resolveValue(action: AutomationAction, snapshot: Record<string, unknown>): unknown {
  if (action.type === 'set_now') return todayIso()
  if (action.type === 'set_field') {
    if (action.value === '$now') return nowIso()
    if (action.value === '$today') return todayIso()
    return action.value
  }
  if (action.type === 'restore_snapshot') return snapshot
  return null
}

export async function applyActions(
  item: ItemRow,
  actions: AutomationAction[],
  userId: string,
): Promise<ItemRow> {
  let current = item
  for (const action of actions) {
    if (action.type === 'set_field' || action.type === 'set_now') {
      const fieldId = action.type === 'set_now' ? action.fieldId : action.fieldId
      const nextValues = {
        ...current.values,
        [fieldId]: resolveValue(action, current.check_snapshot ?? {}),
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
      await moveItem({
        itemId: current.id,
        targetListId: action.targetListId,
        fieldMap: action.fieldMap,
        deleteSource: action.deleteSource ?? true,
      })
    }
  }
  return current
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
    )
  }

  const autos = matchingAutomations(
    input.automations,
    input.next ? 'checked' : 'unchecked',
  )
  for (const auto of autos) {
    current = await applyActions(current, auto.actions, input.userId)
  }
  return current
}
