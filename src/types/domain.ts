export const FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'integer',
  'date',
  'datetime',
  'boolean',
  'checkbox',
  'select',
  'multiselect',
  'tags',
  'rating',
  'multi_rating',
  'image',
  'file',
  'url',
  'email',
  'user',
  'relation',
  'sublist',
  'color',
] as const

export type FieldType = (typeof FIELD_TYPES)[number]

export const VIEW_MODES = [
  'table',
  'cards',
  'board',
  'gallery',
  'timeline',
  'compact',
] as const

export type ViewMode = (typeof VIEW_MODES)[number]

export const VIEW_KINDS = ['table', 'cards', 'board', 'timeline'] as const
export type ViewKind = (typeof VIEW_KINDS)[number]

export const CARD_LAYOUTS = ['grid', 'media', 'compact'] as const
export type CardLayout = (typeof CARD_LAYOUTS)[number]

export const TABLE_DENSITIES = ['comfortable', 'compact'] as const
export type TableDensity = (typeof TABLE_DENSITIES)[number]

export const FIELD_VIEW_ROLES = ['hidden', 'column', 'cover', 'title', 'subtitle', 'badge', 'meta'] as const
export type FieldViewRole = (typeof FIELD_VIEW_ROLES)[number]

export interface FieldViewStyle {
  fieldId: string
  role: FieldViewRole
  formula?: string
  prefix?: string
  suffix?: string
  decimals?: number
}

export interface NamedView {
  id: string
  name: string
  kind: ViewKind
  cardLayout?: CardLayout
  density?: TableDensity
  groupFieldId?: string
  dateFieldId?: string
  coverFieldId?: string
  titleFieldId?: string
  fields: FieldViewStyle[]
}

export const VISIBILITY = ['private', 'invite', 'friends', 'public'] as const
export type Visibility = (typeof VISIBILITY)[number]

export const EDIT_MODES = ['owner', 'selected', 'friends', 'proposals'] as const
export type EditMode = (typeof EDIT_MODES)[number]

export const MEMBER_ROLES = ['viewer', 'editor', 'proposer'] as const
export type MemberRole = (typeof MEMBER_ROLES)[number]

export const CHART_TYPES = [
  'timeline',
  'stem',
  'line',
  'bar',
  'pie',
  'area',
  'scatter',
  'kpi',
] as const
export type ChartType = (typeof CHART_TYPES)[number]

export interface SelectOption {
  value: string
  label: string
  color?: string
}

export interface SublistField {
  id: string
  key: string
  name: string
  type: FieldType
  required?: boolean
  config?: FieldConfig
}

export interface FieldConfig {
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: string
  placeholder?: string
  options?: SelectOption[]
  ratingMax?: number
  accept?: string[]
  maxSizeMb?: number
  relatedListId?: string
  allowMultiple?: boolean
  subfields?: SublistField[]
}

export interface FieldDef {
  id: string
  key: string
  name: string
  type: FieldType
  required?: boolean
  hidden?: boolean
  config?: FieldConfig
}

export interface ListSchema {
  fields: FieldDef[]
  titleFieldId?: string
  imageFieldId?: string
  dateFieldId?: string
  groupFieldId?: string
}

export interface TransferAction {
  id: string
  label: string
  targetListId: string
  fieldMap: Record<string, string>
  deleteSource?: boolean
  setFields?: Record<string, unknown>
}

export type AutomationTrigger =
  | { type: 'checked' }
  | { type: 'unchecked' }
  | { type: 'button'; actionId: string }
  | { type: 'field_equals'; fieldId: string; value: unknown }

export type AutomationAction =
  | { type: 'set_field'; fieldId: string; value: unknown }
  | { type: 'set_now'; fieldId: string }
  | { type: 'move_to_list'; targetListId: string; fieldMap: Record<string, string>; deleteSource?: boolean }
  | { type: 'restore_snapshot' }

export interface ListSettings {
  enableCheck?: boolean
  checkLabel?: string
  transferActions?: TransferAction[]
  onCheck?: AutomationAction[]
  onUncheck?: AutomationAction[]
}

export interface ViewConfig {
  mode?: ViewMode
  activeViewId?: string
  allowedKinds?: ViewKind[]
  views?: NamedView[]
  sortFieldId?: string
  sortDir?: 'asc' | 'desc'
  groupFieldId?: string
  dateFieldId?: string
  imageFieldId?: string
  hiddenFieldIds?: string[]
}

export interface Profile {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface ListRow {
  id: string
  owner_id: string
  title: string
  description: string | null
  icon: string | null
  cover_url: string | null
  template_key: string | null
  schema: ListSchema
  view_config: ViewConfig
  settings: ListSettings
  visibility: Visibility
  edit_mode: EditMode
  created_at: string
  updated_at: string
  owner?: Profile
  item_count?: number
}

export interface ItemRow {
  id: string
  list_id: string
  values: Record<string, unknown>
  position: number
  is_checked: boolean
  checked_at: string | null
  check_snapshot: Record<string, unknown> | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface ItemRating {
  item_id: string
  field_id: string
  user_id: string
  value: number
  created_at: string
  updated_at: string
  profile?: Profile
}

export const NOTE_COLOR_IDS = ['violet', 'rose', 'amber', 'teal', 'sky', 'emerald', 'slate'] as const
export type NoteColorId = (typeof NOTE_COLOR_IDS)[number]

export interface ItemComment {
  id: string
  item_id: string
  user_id: string
  body: string
  color?: NoteColorId | string
  show_author?: boolean
  show_time?: boolean
  created_at: string
  updated_at: string
  profile?: Profile
}

export interface ChangeProposal {
  id: string
  list_id: string
  item_id: string | null
  user_id: string
  action: 'create' | 'update' | 'delete' | 'check' | 'uncheck'
  payload: Record<string, unknown>
  status: 'pending' | 'approved' | 'rejected'
  reviewer_id: string | null
  review_note: string | null
  created_at: string
  reviewed_at: string | null
  profile?: Profile
}

export interface ListMember {
  list_id: string
  user_id: string
  role: MemberRole
  created_at: string
  profile?: Profile
}

export interface ListInvite {
  id: string
  list_id: string
  inviter_id: string
  invitee_id: string | null
  email: string | null
  role: MemberRole
  token: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  invitee?: Profile
}

export interface Friendship {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  responded_at: string | null
  requester?: Profile
  addressee?: Profile
}

export interface ListAutomation {
  id: string
  list_id: string
  name: string
  enabled: boolean
  trigger: AutomationTrigger
  actions: AutomationAction[]
  created_at: string
}

export interface ListChart {
  id: string
  list_id: string
  name: string
  chart_type: ChartType
  config: ChartConfig
  created_at: string
}

export interface ChartConfig {
  dateFieldId?: string
  valueFieldId?: string
  groupFieldId?: string
  aggregation?: 'count' | 'avg' | 'sum' | 'min' | 'max'
  title?: string
}

export interface ActivityEvent {
  id: string
  list_id: string | null
  item_id: string | null
  actor_id: string | null
  event_type: string
  payload: Record<string, unknown>
  created_at: string
  actor?: Profile
}

export interface AppNotification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  payload: Record<string, unknown>
  read_at: string | null
  created_at: string
}

export interface ListPermissions {
  view: boolean
  edit: boolean
  propose: boolean
  owner: boolean
  role: 'owner' | MemberRole | 'none'
}

export interface FileRecord {
  id: string
  owner_id: string
  list_id: string | null
  bucket: string
  path: string
  mime_type: string
  size_bytes: number
  original_name: string | null
  scan_status: 'pending' | 'clean' | 'rejected'
  created_at: string
}
