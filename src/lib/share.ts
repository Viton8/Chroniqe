import type { LinkAccess, ListRow, ListSettings, MemberRole } from '../types/domain'

const SHARE_TOKEN_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SHARE_STORAGE_PREFIX = 'chroniqe.listShare.'

export function appUrl(path: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`
  const clean = path.startsWith('/') ? path.slice(1) : path
  return `${window.location.origin}${base}${clean}`
}

export function isShareToken(value: string | null | undefined): value is string {
  return Boolean(value && SHARE_TOKEN_RE.test(value))
}

export function listShareUrl(id: string, shareToken?: string | null): string {
  if (shareToken && isShareToken(shareToken)) return appUrl(`lists/${id}?s=${shareToken}`)
  return appUrl(`lists/${id}`)
}

export function listOpenUrl(list: Pick<ListRow, 'id' | 'visibility' | 'share_token'>): string {
  if (list.visibility === 'link') return listShareUrl(list.id, list.share_token)
  return listShareUrl(list.id)
}

export function readStoredShareToken(listId: string): string | null {
  try {
    const stored = sessionStorage.getItem(`${SHARE_STORAGE_PREFIX}${listId}`)
    return isShareToken(stored) ? stored : null
  } catch {
    return null
  }
}

export function writeStoredShareToken(listId: string, token: string | null): void {
  try {
    const key = `${SHARE_STORAGE_PREFIX}${listId}`
    if (token && isShareToken(token)) sessionStorage.setItem(key, token)
    else sessionStorage.removeItem(key)
  } catch {
    /* private mode / blocked storage */
  }
}

export function resolveListShareToken(listId: string, fromUrl: string | null | undefined): string | null {
  if (isShareToken(fromUrl)) {
    writeStoredShareToken(listId, fromUrl)
    return fromUrl
  }
  return readStoredShareToken(listId)
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

export function listAcceptsProposals(list: ListRow): boolean {
  return list.edit_mode === 'proposals' || listLinkAccess(list) === 'propose'
}

export function applyLinkAccess(list: ListRow, access: LinkAccess): Pick<ListRow, 'visibility' | 'settings'> {
  const settings: ListSettings = { ...list.settings }
  if (access === 'off') {
    delete settings.linkAccess
    return {
      visibility:
        list.visibility === 'public' || list.visibility === 'link' ? 'private' : list.visibility,
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
