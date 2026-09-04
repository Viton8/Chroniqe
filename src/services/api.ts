import { supabase } from './supabase'
import type {
  ActivityEvent,
  AppNotification,
  ChangeProposal,
  ChartConfig,
  ChartType,
  Friendship,
  ItemComment,
  ItemRating,
  ItemRow,
  ListAutomation,
  ListChart,
  ListInvite,
  ListMember,
  ListPermissions,
  ListRow,
  ListSchema,
  ListSettings,
  Profile,
  ViewConfig,
  Visibility,
  EditMode,
  MemberRole,
  AutomationAction,
  AutomationTrigger,
} from '../types/domain'
import { assertSafeFile } from '../lib/validation'
import { uid } from '../lib/cn'
import { msg } from '../lib/i18n'

function throwIf(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  throwIf(error)
  return data as Profile | null
}

export async function fetchProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .maybeSingle()
  throwIf(error)
  return data as Profile | null
}

export async function fetchPublicListsByOwner(ownerId: string): Promise<ListRow[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('*, owner:profiles!owner_id(*)')
    .eq('owner_id', ownerId)
    .eq('visibility', 'public')
    .order('updated_at', { ascending: false })
  throwIf(error)
  return (data ?? []) as ListRow[]
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, 'username' | 'display_name' | 'bio' | 'avatar_url'>>,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single()
  throwIf(error)
  return data as Profile
}

export async function searchProfiles(query: string): Promise<Profile[]> {
  const q = query.trim().replace(/[%_,()]/g, '')
  if (q.length < 2) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .limit(12)
  throwIf(error)
  return (data ?? []) as Profile[]
}

export async function listPermissions(listId: string): Promise<ListPermissions> {
  const { data, error } = await supabase.rpc('list_permissions', { p_list_id: listId })
  throwIf(error)
  return (data ?? {
    view: false,
    edit: false,
    propose: false,
    owner: false,
    role: 'none',
  }) as ListPermissions
}

export async function fetchMyLists(userId: string): Promise<ListRow[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false })
  throwIf(error)
  return (data ?? []) as ListRow[]
}

export async function fetchSharedLists(): Promise<ListRow[]> {
  const { data: memberRows, error: memberError } = await supabase
    .from('list_members')
    .select('list_id')
  throwIf(memberError)
  const ids = (memberRows ?? []).map((r) => r.list_id as string)
  if (!ids.length) return []
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .in('id', ids)
    .order('updated_at', { ascending: false })
  throwIf(error)
  return (data ?? []) as ListRow[]
}

export async function fetchPublicLists(): Promise<ListRow[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('*, owner:profiles!owner_id(*)')
    .eq('visibility', 'public')
    .order('updated_at', { ascending: false })
    .limit(60)
  throwIf(error)
  return (data ?? []) as ListRow[]
}

export async function fetchList(id: string): Promise<ListRow | null> {
  const { data, error } = await supabase
    .from('lists')
    .select('*, owner:profiles!owner_id(*)')
    .eq('id', id)
    .maybeSingle()
  throwIf(error)
  return data as ListRow | null
}

export async function createList(input: {
  owner_id: string
  title: string
  description?: string
  icon?: string
  template_key?: string
  schema: ListSchema
  view_config?: ViewConfig
  settings?: ListSettings
  visibility?: Visibility
  edit_mode?: EditMode
}): Promise<ListRow> {
  const { data, error } = await supabase.from('lists').insert(input).select('*').single()
  throwIf(error)
  return data as ListRow
}

export async function updateList(
  id: string,
  patch: Partial<
    Pick<
      ListRow,
      | 'title'
      | 'description'
      | 'icon'
      | 'schema'
      | 'view_config'
      | 'settings'
      | 'visibility'
      | 'edit_mode'
      | 'cover_url'
    >
  >,
): Promise<ListRow> {
  const { data, error } = await supabase.from('lists').update(patch).eq('id', id).select('*').single()
  throwIf(error)
  return data as ListRow
}

export async function deleteList(id: string): Promise<void> {
  const { error } = await supabase.from('lists').delete().eq('id', id)
  throwIf(error)
}

export async function duplicateList(sourceId: string, ownerId: string, title: string): Promise<ListRow> {
  const src = await fetchList(sourceId)
  if (!src) throw new Error('not found')
  const copy = await createList({
    owner_id: ownerId,
    title,
    description: src.description ?? undefined,
    icon: src.icon ?? undefined,
    template_key: src.template_key ?? undefined,
    schema: src.schema,
    view_config: src.view_config,
    settings: { ...(src.settings ?? {}), transferActions: [] },
    visibility: 'private',
    edit_mode: 'owner',
  })
  const items = await fetchItems(sourceId)
  if (items.length) {
    const payload = items.map((i) => ({
      list_id: copy.id,
      values: i.values,
      position: i.position,
      is_checked: i.is_checked,
      checked_at: i.checked_at,
      check_snapshot: i.check_snapshot,
      created_by: ownerId,
    }))
    const { error } = await supabase.from('items').insert(payload)
    throwIf(error)
  }
  const charts = await fetchCharts(sourceId)
  for (const c of charts) {
    await createChart({
      list_id: copy.id,
      name: c.name,
      chart_type: c.chart_type,
      config: c.config,
    })
  }
  return copy
}

export async function fetchItems(listId: string): Promise<ItemRow[]> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('list_id', listId)
    .order('position', { ascending: true })
  throwIf(error)
  return (data ?? []) as ItemRow[]
}

export async function createItem(input: {
  list_id: string
  values: Record<string, unknown>
  position: number
  created_by: string
}): Promise<ItemRow> {
  const { data, error } = await supabase
    .from('items')
    .insert({ ...input, updated_by: input.created_by })
    .select('*')
    .single()
  throwIf(error)
  return data as ItemRow
}

export async function updateItem(
  id: string,
  patch: Partial<
    Pick<ItemRow, 'values' | 'position' | 'is_checked' | 'checked_at' | 'check_snapshot' | 'updated_by'>
  >,
): Promise<ItemRow> {
  const { data, error } = await supabase.from('items').update(patch).eq('id', id).select('*').single()
  throwIf(error)
  return data as ItemRow
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', id)
  throwIf(error)
}

export async function moveItem(input: {
  itemId: string
  targetListId: string
  fieldMap?: Record<string, string>
  deleteSource?: boolean
}): Promise<string> {
  const { data, error } = await supabase.rpc('move_item', {
    p_item_id: input.itemId,
    p_target_list_id: input.targetListId,
    p_field_map: input.fieldMap ?? {},
    p_delete_source: input.deleteSource ?? true,
  })
  throwIf(error)
  return data as string
}

export async function fetchRatings(itemIds: string[]): Promise<ItemRating[]> {
  if (!itemIds.length) return []
  const { data, error } = await supabase
    .from('item_ratings')
    .select('*, profile:profiles!user_id(*)')
    .in('item_id', itemIds)
  throwIf(error)
  return (data ?? []) as ItemRating[]
}

export async function upsertRating(input: {
  item_id: string
  field_id: string
  user_id: string
  value: number
}): Promise<void> {
  const { error } = await supabase.from('item_ratings').upsert(input)
  throwIf(error)
}

export async function fetchComments(itemId: string): Promise<ItemComment[]> {
  const { data, error } = await supabase
    .from('item_comments')
    .select('*, profile:profiles!user_id(*)')
    .eq('item_id', itemId)
    .order('created_at', { ascending: true })
  throwIf(error)
  return (data ?? []) as ItemComment[]
}

export async function addComment(input: {
  item_id: string
  user_id: string
  body: string
}): Promise<ItemComment> {
  const { data, error } = await supabase
    .from('item_comments')
    .insert(input)
    .select('*, profile:profiles!user_id(*)')
    .single()
  throwIf(error)
  return data as ItemComment
}

export async function deleteComment(id: string): Promise<void> {
  const { error } = await supabase.from('item_comments').delete().eq('id', id)
  throwIf(error)
}

export async function fetchMembers(listId: string): Promise<ListMember[]> {
  const { data, error } = await supabase
    .from('list_members')
    .select('*, profile:profiles!user_id(*)')
    .eq('list_id', listId)
  throwIf(error)
  return (data ?? []) as ListMember[]
}

export async function addMember(input: {
  list_id: string
  user_id: string
  role: MemberRole
}): Promise<void> {
  const { error } = await supabase.from('list_members').insert(input)
  throwIf(error)
}

export async function updateMemberRole(
  listId: string,
  userId: string,
  role: MemberRole,
): Promise<void> {
  const { error } = await supabase
    .from('list_members')
    .update({ role })
    .eq('list_id', listId)
    .eq('user_id', userId)
  throwIf(error)
}

export async function removeMember(listId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('list_members')
    .delete()
    .eq('list_id', listId)
    .eq('user_id', userId)
  throwIf(error)
}

export async function createInvite(input: {
  list_id: string
  inviter_id: string
  invitee_id?: string
  email?: string
  role: MemberRole
}): Promise<ListInvite> {
  const { data, error } = await supabase.from('list_invites').insert(input).select('*').single()
  throwIf(error)
  return data as ListInvite
}

export async function fetchMyInvites(userId: string): Promise<ListInvite[]> {
  const { data, error } = await supabase
    .from('list_invites')
    .select('*')
    .eq('invitee_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  throwIf(error)
  return (data ?? []) as ListInvite[]
}

export async function respondInvite(
  invite: ListInvite,
  accept: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('list_invites')
    .update({ status: accept ? 'accepted' : 'declined' })
    .eq('id', invite.id)
  throwIf(error)
  if (accept && invite.invitee_id) {
    await addMember({
      list_id: invite.list_id,
      user_id: invite.invitee_id,
      role: invite.role,
    })
  }
}

export async function fetchProposals(listId: string): Promise<ChangeProposal[]> {
  const { data, error } = await supabase
    .from('change_proposals')
    .select('*, profile:profiles!user_id(*)')
    .eq('list_id', listId)
    .order('created_at', { ascending: false })
  throwIf(error)
  return (data ?? []) as ChangeProposal[]
}

export async function createProposal(input: {
  list_id: string
  item_id?: string | null
  user_id: string
  action: ChangeProposal['action']
  payload: Record<string, unknown>
}): Promise<void> {
  const { error } = await supabase.from('change_proposals').insert(input)
  throwIf(error)
}

export async function reviewProposal(
  id: string,
  approve: boolean,
  note?: string,
): Promise<void> {
  const { error } = await supabase.rpc('review_proposal', {
    p_proposal_id: id,
    p_approve: approve,
    p_note: note ?? null,
  })
  throwIf(error)
}

export async function isSubscribed(listId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('list_subscriptions')
    .select('list_id')
    .eq('list_id', listId)
    .eq('user_id', userId)
    .maybeSingle()
  throwIf(error)
  return Boolean(data)
}

export async function setSubscribed(
  listId: string,
  userId: string,
  next: boolean,
): Promise<void> {
  if (next) {
    const { error } = await supabase
      .from('list_subscriptions')
      .insert({ list_id: listId, user_id: userId })
    throwIf(error)
  } else {
    const { error } = await supabase
      .from('list_subscriptions')
      .delete()
      .eq('list_id', listId)
      .eq('user_id', userId)
    throwIf(error)
  }
}

export async function fetchAutomations(listId: string): Promise<ListAutomation[]> {
  const { data, error } = await supabase
    .from('list_automations')
    .select('*')
    .eq('list_id', listId)
    .order('created_at', { ascending: true })
  throwIf(error)
  return (data ?? []) as ListAutomation[]
}

export async function createAutomation(input: {
  list_id: string
  name: string
  trigger: AutomationTrigger
  actions: AutomationAction[]
}): Promise<ListAutomation> {
  const { data, error } = await supabase
    .from('list_automations')
    .insert({ ...input, enabled: true })
    .select('*')
    .single()
  throwIf(error)
  return data as ListAutomation
}

export async function updateAutomation(
  id: string,
  patch: Partial<Pick<ListAutomation, 'name' | 'enabled' | 'trigger' | 'actions'>>,
): Promise<void> {
  const { error } = await supabase.from('list_automations').update(patch).eq('id', id)
  throwIf(error)
}

export async function deleteAutomation(id: string): Promise<void> {
  const { error } = await supabase.from('list_automations').delete().eq('id', id)
  throwIf(error)
}

export async function fetchCharts(listId: string): Promise<ListChart[]> {
  const { data, error } = await supabase
    .from('list_charts')
    .select('*')
    .eq('list_id', listId)
    .order('created_at', { ascending: true })
  throwIf(error)
  return (data ?? []) as ListChart[]
}

export async function createChart(input: {
  list_id: string
  name: string
  chart_type: ChartType
  config: ChartConfig
}): Promise<ListChart> {
  const { data, error } = await supabase.from('list_charts').insert(input).select('*').single()
  throwIf(error)
  return data as ListChart
}

export async function deleteChart(id: string): Promise<void> {
  const { error } = await supabase.from('list_charts').delete().eq('id', id)
  throwIf(error)
}

export async function fetchActivity(listId: string): Promise<ActivityEvent[]> {
  const { data, error } = await supabase
    .from('activity_events')
    .select('*, actor:profiles!actor_id(*)')
    .eq('list_id', listId)
    .order('created_at', { ascending: false })
    .limit(40)
  throwIf(error)
  return (data ?? []) as ActivityEvent[]
}

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  throwIf(error)
  return (data ?? []) as AppNotification[]
}

export async function markNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)
  throwIf(error)
}

export async function fetchFriendships(userId: string): Promise<Friendship[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(
      '*, requester:profiles!requester_id(*), addressee:profiles!addressee_id(*)',
    )
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order('created_at', { ascending: false })
  throwIf(error)
  return (data ?? []) as Friendship[]
}

export async function sendFriendRequest(fromId: string, toId: string): Promise<void> {
  const { error } = await supabase.from('friendships').insert({
    requester_id: fromId,
    addressee_id: toId,
    status: 'pending',
  })
  throwIf(error)
}

export async function respondFriend(id: string, accept: boolean): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .update({
      status: accept ? 'accepted' : 'declined',
      responded_at: new Date().toISOString(),
    })
    .eq('id', id)
  throwIf(error)
}

export async function removeFriendship(id: string): Promise<void> {
  const { error } = await supabase.from('friendships').delete().eq('id', id)
  throwIf(error)
}

export async function uploadListFile(input: {
  userId: string
  listId: string
  file: File
  imagesOnly?: boolean
  maxMb?: number
}): Promise<{ bucket: string; path: string; mime: string; name: string }> {
  const err = assertSafeFile(input.file, {
    imagesOnly: input.imagesOnly,
    maxMb: input.maxMb,
  })
  if (err) throw new Error(err)

  const ext = input.file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const path = `${input.userId}/${input.listId}/${uid()}.${ext}`
  const { error } = await supabase.storage.from('list-files').upload(path, input.file, {
    contentType: input.file.type,
    upsert: false,
  })
  throwIf(error)

  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-file`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      bucket: 'list-files',
      path,
      mime: input.file.type,
      size: input.file.size,
      listId: input.listId,
      originalName: input.file.name,
    }),
  })
  if (!res.ok) {
    await supabase.storage.from('list-files').remove([path])
    const body = (await res.json().catch(() => ({}))) as { reason?: string }
    throw new Error(body.reason === 'magic' ? msg('fields.scanFail') : msg('fields.scanReject'))
  }

  return { bucket: 'list-files', path, mime: input.file.type, name: input.file.name }
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const err = assertSafeFile(file, { imagesOnly: true, maxMb: 2 })
  if (err) throw new Error(err)
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${userId}/avatar.${ext}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    contentType: file.type,
    upsert: true,
  })
  throwIf(error)
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}

export async function signedFileUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('list-files').createSignedUrl(path, 3600)
  if (error) return null
  return data.signedUrl
}

export async function countItems(listIds: string[]): Promise<Record<string, number>> {
  if (!listIds.length) return {}
  const { data, error } = await supabase.from('items').select('list_id').in('list_id', listIds)
  throwIf(error)
  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const id = row.list_id as string
    counts[id] = (counts[id] ?? 0) + 1
  }
  return counts
}
