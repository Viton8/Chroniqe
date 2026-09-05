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
  FriendFeedEvent,
  ViewConfig,
  Visibility,
  EditMode,
  MemberRole,
  AutomationAction,
  AutomationTrigger,
} from '../types/domain'
import { assertSafeFile, fileMime } from '../lib/validation'
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

export async function fetchSharedLists(userId: string): Promise<ListRow[]> {
  const { data: memberRows, error: memberError } = await supabase
    .from('list_members')
    .select('list_id')
    .eq('user_id', userId)
  throwIf(memberError)
  const ids = [...new Set((memberRows ?? []).map((r) => r.list_id as string))]
  if (!ids.length) return []
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .in('id', ids)
    .neq('owner_id', userId)
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
    .limit(80)
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
  const idMap = new Map<string, string>()
  for (const i of items) {
    const created = await createItem({
      list_id: copy.id,
      values: i.values,
      position: i.position,
      created_by: ownerId,
      is_checked: i.is_checked,
      checked_at: i.checked_at,
      check_snapshot: i.check_snapshot,
    })
    idMap.set(i.id, created.id)
  }
  if (items.length) {
    const sourceIds = items.map((i) => i.id)
    const ratings = (await fetchRatings(sourceIds)).filter((row) => row.user_id === ownerId)
    if (ratings.length) {
      const { error } = await supabase.from('item_ratings').insert(
        ratings
          .map((row) => {
            const item_id = idMap.get(row.item_id)
            if (!item_id) return null
            return { item_id, field_id: row.field_id, user_id: ownerId, value: row.value }
          })
          .filter((row): row is NonNullable<typeof row> => Boolean(row)),
      )
      throwIf(error)
    }
    const comments = (await fetchCommentsForItems(sourceIds)).filter((row) => row.user_id === ownerId)
    if (comments.length) {
      const { error } = await supabase.from('item_comments').insert(
        comments
          .map((row) => {
            const item_id = idMap.get(row.item_id)
            if (!item_id) return null
            return {
              item_id,
              user_id: ownerId,
              body: row.body,
              color: row.color ?? 'violet',
              show_author: row.show_author ?? true,
              show_time: row.show_time ?? true,
            }
          })
          .filter((row): row is NonNullable<typeof row> => Boolean(row)),
      )
      throwIf(error)
    }
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
  const autos = await fetchAutomations(sourceId).catch(() => [])
  for (const row of autos) {
    await createAutomation({
      list_id: copy.id,
      name: row.name,
      trigger: row.trigger,
      actions: row.actions,
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

export async function fetchItem(id: string): Promise<ItemRow | null> {
  const { data, error } = await supabase.from('items').select('*').eq('id', id).maybeSingle()
  throwIf(error)
  return (data as ItemRow | null) ?? null
}

export async function fetchItemsForLists(listIds: string[], limit = 500): Promise<ItemRow[]> {
  if (!listIds.length) return []
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .in('list_id', listIds)
    .order('updated_at', { ascending: false })
    .limit(limit)
  throwIf(error)
  return (data ?? []) as ItemRow[]
}

export async function createItem(input: {
  list_id: string
  values: Record<string, unknown>
  position: number
  created_by: string
  is_checked?: boolean
  checked_at?: string | null
  check_snapshot?: Record<string, unknown> | null
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

export async function fetchCommentsForItems(itemIds: string[]): Promise<ItemComment[]> {
  if (!itemIds.length) return []
  const out: ItemComment[] = []
  const chunk = 100
  for (let i = 0; i < itemIds.length; i += chunk) {
    const ids = itemIds.slice(i, i + chunk)
    const { data, error } = await supabase
      .from('item_comments')
      .select('*, profile:profiles!user_id(*)')
      .in('item_id', ids)
      .order('created_at', { ascending: true })
    throwIf(error)
    out.push(...((data ?? []) as ItemComment[]))
  }
  return out
}

export async function addComment(input: {
  item_id: string
  user_id: string
  body: string
  color?: string
  show_author?: boolean
  show_time?: boolean
}): Promise<ItemComment> {
  const { data, error } = await supabase
    .from('item_comments')
    .insert({
      item_id: input.item_id,
      user_id: input.user_id,
      body: input.body,
      color: input.color ?? 'violet',
      show_author: input.show_author ?? true,
      show_time: input.show_time ?? true,
    })
    .select('*, profile:profiles!user_id(*)')
    .single()
  throwIf(error)
  return data as ItemComment
}

export async function updateComment(
  id: string,
  patch: {
    body?: string
    color?: string
    show_author?: boolean
    show_time?: boolean
  },
): Promise<ItemComment> {
  const { data, error } = await supabase
    .from('item_comments')
    .update(patch)
    .eq('id', id)
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
  const { data, error } = await supabase
    .from('list_invites')
    .insert(input)
    .select('*, invitee:profiles!invitee_id(username, display_name)')
    .single()
  throwIf(error)
  return data as ListInvite
}

export async function fetchListInvites(listId: string): Promise<ListInvite[]> {
  const { data, error } = await supabase
    .from('list_invites')
    .select('*, invitee:profiles!invitee_id(username, display_name)')
    .eq('list_id', listId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  throwIf(error)
  return (data ?? []) as ListInvite[]
}

export async function peekInvite(token: string): Promise<{
  id: string
  list_id: string
  role: MemberRole
  status: ListInvite['status']
  list_title: string
  list_icon: string | null
} | null> {
  const { data, error } = await supabase.rpc('peek_list_invite', { p_token: token })
  throwIf(error)
  return data as {
    id: string
    list_id: string
    role: MemberRole
    status: ListInvite['status']
    list_title: string
    list_icon: string | null
  } | null
}

export async function acceptInviteByToken(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_list_invite', { p_token: token })
  throwIf(error)
  return data as string
}

export async function fetchMyInvites(userId: string): Promise<ListInvite[]> {
  const { data, error } = await supabase
    .from('list_invites')
    .select('*, list:lists(id, title, icon), inviter:profiles!inviter_id(username, display_name)')
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
  if (accept) {
    await acceptInviteByToken(invite.token)
    return
  }
  const { error } = await supabase
    .from('list_invites')
    .update({ status: 'declined' })
    .eq('id', invite.id)
  throwIf(error)
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

export async function fetchSubscribedLists(userId: string): Promise<ListRow[]> {
  const { data, error } = await supabase
    .from('list_subscriptions')
    .select('list_id')
    .eq('user_id', userId)
  throwIf(error)
  const ids = [...new Set((data ?? []).map((row) => String(row.list_id)))]
  if (!ids.length) return []
  const { data: lists, error: listError } = await supabase.from('lists').select('*').in('id', ids)
  throwIf(listError)
  return (lists ?? []) as ListRow[]
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

export async function fetchFriendFeed(limit = 60): Promise<FriendFeedEvent[]> {
  const { data, error } = await supabase.rpc('friend_feed', { p_limit: limit })
  throwIf(error)
  return (data ?? []) as FriendFeedEvent[]
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
  window.dispatchEvent(new Event('chroniqe-notifications-read'))
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
  const mime = fileMime(input.file)
  const err = assertSafeFile(input.file, {
    imagesOnly: input.imagesOnly,
    maxMb: input.maxMb,
  })
  if (err) throw new Error(err)

  const ext = input.file.name.split('.').pop()?.toLowerCase() ?? 'bin'
  const path = `${input.userId}/${input.listId}/${uid()}.${ext}`
  const { error } = await supabase.storage.from('list-files').upload(path, input.file, {
    contentType: mime,
    upsert: false,
  })
  throwIf(error)

  const { error: scanError, data: scan } = await supabase.functions.invoke('validate-file', {
    body: {
      bucket: 'list-files',
      path,
      mime,
      size: input.file.size,
      listId: input.listId,
      originalName: input.file.name,
    },
  })
  if (scanError || !scan?.ok) {
    await supabase.storage.from('list-files').remove([path])
    const reason = typeof scan?.reason === 'string' ? scan.reason : ''
    throw new Error(reason === 'magic' ? msg('fields.scanFail') : msg('fields.scanReject'))
  }

  return { bucket: 'list-files', path, mime, name: input.file.name }
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const mime = fileMime(file)
  const err = assertSafeFile(file, { imagesOnly: true, maxMb: 2 })
  if (err) throw new Error(err)
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${userId}/avatar.${ext}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    contentType: mime,
    upsert: true,
  })
  throwIf(error)
  const { error: scanError, data: scan } = await supabase.functions.invoke('validate-file', {
    body: {
      bucket: 'avatars',
      path,
      mime,
      size: file.size,
      originalName: file.name,
    },
  })
  if (scanError || !scan?.ok) {
    await supabase.storage.from('avatars').remove([path])
    const reason = typeof scan?.reason === 'string' ? scan.reason : ''
    throw new Error(reason === 'magic' ? msg('fields.scanFail') : msg('fields.scanReject'))
  }
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

const ADMIN_ERROR_KEYS: Record<string, string> = {
  ADMIN_NOT_AUTHORIZED: 'admin.notAllowed',
  ADMIN_LIST_NOT_PUBLIC: 'admin.listNotPublic',
  ADMIN_CANNOT_BLOCK_SELF: 'admin.cannotBlockSelf',
  ADMIN_CANNOT_BLOCK_ADMIN: 'admin.cannotBlockAdmin',
  ADMIN_USER_NOT_FOUND: 'admin.userNotFound',
}

function throwAdmin(error: { message: string } | null): void {
  if (!error) return
  const key = ADMIN_ERROR_KEYS[error.message]
  throw new Error(key ? msg(key) : error.message)
}

export async function fetchAdminPublicLists(): Promise<ListRow[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('*, owner:profiles!owner_id(*)')
    .eq('visibility', 'public')
    .order('updated_at', { ascending: false })
    .limit(200)
  throwIf(error)
  return (data ?? []) as ListRow[]
}

export async function fetchAdminProfiles(query = ''): Promise<Profile[]> {
  const { data, error } = await supabase.rpc('admin_list_profiles', {
    p_query: query,
    p_limit: 80,
  })
  throwAdmin(error)
  return (data ?? []) as Profile[]
}

export async function adminDeletePublicList(listId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_public_list', { p_list_id: listId })
  throwAdmin(error)
}

export async function adminSetUserBlocked(userId: string, blocked: boolean): Promise<void> {
  const { error } = await supabase.rpc('admin_set_user_blocked', {
    p_user_id: userId,
    p_blocked: blocked,
  })
  throwAdmin(error)
}
