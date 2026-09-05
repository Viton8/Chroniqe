import { emptyFilters, type ListFilters, type SortKey } from './filters'

const KEY = 'chroniqe-workspace-v1'

export interface ViewWorkspaceSlice {
  sort?: SortKey
  filters?: ListFilters
}

export interface ListWorkspaceState {
  viewId?: string
  hideChecked?: boolean
  views?: Record<string, ViewWorkspaceSlice>
}

function readAll(): Record<string, ListWorkspaceState> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, ListWorkspaceState>) : {}
  } catch {
    return {}
  }
}

export function readWorkspace(listId: string): ListWorkspaceState {
  return readAll()[listId] ?? {}
}

export function writeWorkspace(listId: string, patch: ListWorkspaceState): void {
  try {
    const all = readAll()
    const prev = all[listId] ?? {}
    all[listId] = {
      ...prev,
      ...patch,
      views: { ...prev.views, ...patch.views },
    }
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* ignore quota / private mode */
  }
}

export function workspaceSlice(listId: string, viewId: string): ViewWorkspaceSlice {
  return readWorkspace(listId).views?.[viewId] ?? {}
}

export function defaultFilters(): ListFilters {
  return emptyFilters()
}
