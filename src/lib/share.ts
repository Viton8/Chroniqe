import type { LinkAccess, ListRow, ListSettings, MemberRole } from '../types/domain'

export function appUrl(path: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`
  const clean = path.startsWith('/') ? path.slice(1) : path
  return `${window.location.origin}${base}${clean}`
}

export function listShareUrl(id: string): string {
  return appUrl(`lists/${id}`)
}

export function joinShareUrl(token: string): string {
  return appUrl(`join/${token}`)
}

export function listLinkAccess(list: ListRow): LinkAccess {
  if (list.visibility !== 'public' && list.visibility !== 'link') return 'off'
  const raw = list.settings?.linkAccess
  if (raw === 'propose' || raw === 'edit' || raw === 'view') return raw
  return 'view'
}

export function applyLinkAccess(list: ListRow, access: LinkAccess): Pick<ListRow, 'visibility' | 'settings'> {
  const settings: ListSettings = { ...list.settings }
  if (access === 'off') {
    delete settings.linkAccess
    return {
      visibility: list.visibility === 'public' ? 'public' : list.visibility === 'friends' ? 'friends' : 'private',
      settings,
    }
  }
  settings.linkAccess = access
  return {
    visibility: list.visibility === 'public' ? 'public' : 'link',
    settings,
  }
}

export function roleForLinkAccess(access: LinkAccess): MemberRole {
  if (access === 'edit') return 'editor'
  if (access === 'propose') return 'proposer'
  return 'viewer'
}
