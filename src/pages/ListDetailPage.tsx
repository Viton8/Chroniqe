import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Bell,
  BellOff,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Keyboard,
  Link2,
  MoreHorizontal,
  Plus,
  Settings2,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { useToast } from '../context/ToastContext'
import {
  createChart,
  createItem,
  createInvite,
  createProposal,
  deleteChart,
  deleteItem,
  deleteList,
  duplicateList,
  fetchActivity,
  fetchAutomations,
  fetchCharts,
  fetchCommentsForItems,
  fetchItems,
  fetchList,
  fetchMembers,
  fetchProposals,
  fetchRatings,
  isSubscribed,
  listPermissions,
  removeMember,
  reviewProposal,
  searchProfiles,
  setSubscribed,
  updateItem,
  updateList,
  updateMemberRole,
} from '../services/api'
import { supabase } from '../services/supabase'
import type {
  ActivityEvent,
  ChangeProposal,
  ChartType,
  ItemComment,
  ItemRating,
  ItemRow,
  ListAutomation,
  ListChart,
  LinkAccess,
  ListMember,
  ListPermissions,
  ListRow,
  MemberRole,
  Profile,
  NamedView,
} from '../types/domain'
import Button from '../components/ui/Button'
import Hint from '../components/ui/Hint'
import Modal from '../components/ui/Modal'
import { FieldWrap, Input, SearchField, Select, Textarea } from '../components/ui/Input'
import PersonRow from '../components/people/PersonRow'
import EmptyState, { Spinner } from '../components/ui/EmptyState'
import SchemaEditor from '../components/lists/SchemaEditor'
import ListViews, { ViewSwitcher } from '../components/lists/ListViews'
import ViewEditor, { ViewsManager } from '../components/lists/ViewEditor'
import { normalizeViewConfig, toViewConfig } from '../lib/views'
import FieldInput from '../components/fields/FieldInput'
import ChartView from '../components/charts/ChartView'
import { emptyValues, isEmptyValue, itemMatchesQuery, validateItem } from '../lib/validation'
import { downloadText, itemsToCsv, itemsToJson, mapCsvToItems, parseCsv, parseImportJson } from '../lib/export'
import { applyFieldEquals, toggleChecked, transferItem } from '../lib/automations'
import { asDatetimeInputValue, formatDateTime, titleFromValues } from '../lib/cn'
import { useCommand } from '../context/CommandContext'
import { CHART_TYPES as CHART_TYPE_LIST } from '../types/domain'
import {
  applyListFilters,
  emptyFilters,
  sortItems,
  sortableFields,
  titleFieldId,
  type ListFilters,
  type SortKey,
} from '../lib/filters'
import { buildInsights } from '../lib/insights'
import FacetFilters from '../components/lists/FacetFilters'
import BulkBar from '../components/lists/BulkBar'
import QuickAdd from '../components/lists/QuickAdd'
import ListInsights from '../components/lists/ListInsights'
import FavoriteButton from '../components/lists/FavoriteButton'
import ShortcutsHelp from '../components/lists/ShortcutsHelp'
import ActivityFeed from '../components/lists/ActivityFeed'
import FlowEditor from '../components/lists/FlowEditor'
import { ItemNotesPanel } from '../components/lists/ItemNotes'
import { readWorkspace, writeWorkspace } from '../lib/workspace'
import { applyLinkAccess, joinShareUrl, listLinkAccess, listShareUrl } from '../lib/share'
import ShareDialog from '../components/share/ShareDialog'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

export default function ListDetailPage() {
  const { id } = useParams()
  const { t } = usePrefs()
  if (!id) {
    return <EmptyState icon="?" title={t('list.notFoundTitle')} text={t('list.notFoundText')} />
  }
  return <ListWorkspace key={id} id={id} />
}

function ListWorkspace({ id }: { id: string }) {
  const { user } = useAuth()
  const { t, locale } = usePrefs()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { open: paletteOpen, setWorkspace } = useCommand()
  const storedWorkspace = readWorkspace(id)

  const [list, setList] = useState<ListRow | null>(null)
  const [items, setItems] = useState<ItemRow[]>([])
  const [itemNotes, setItemNotes] = useState<ItemComment[]>([])
  const [ratings, setRatings] = useState<ItemRating[]>([])
  const [perms, setPerms] = useState<ListPermissions | null>(null)
  const [members, setMembers] = useState<ListMember[]>([])
  const [proposals, setProposals] = useState<ChangeProposal[]>([])
  const [charts, setCharts] = useState<ListChart[]>([])
  const [automations, setAutomations] = useState<ListAutomation[]>([])
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [sub, setSub] = useState(false)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'items' | 'insights' | 'charts' | 'activity'>('items')
  const [openItem, setOpenItem] = useState<ItemRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [draftValues, setDraftValues] = useState<Record<string, unknown> | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [activeViewId, setActiveViewId] = useState<string | undefined>(storedWorkspace.viewId)
  const [hideChecked, setHideChecked] = useState(Boolean(storedWorkspace.hideChecked))
  const [sort, setSort] = useState<SortKey>('new')
  const [filters, setFilters] = useState<ListFilters>(() => emptyFilters())
  const appliedViewRef = useRef<string | null>(null)
  const ignoreWorkspaceWrite = useRef(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [focusIndex, setFocusIndex] = useState(-1)
  const [helpOpen, setHelpOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const reload = async (openFromUrl = false) => {
    if (!id) return
    const row = await fetchList(id)
    setList(row)
    if (!row) return
    const [its, p, ch, au, act] = await Promise.all([
      fetchItems(id),
      listPermissions(id),
      fetchCharts(id),
      fetchAutomations(id),
      fetchActivity(id),
    ])
    setItems(its)
    setPerms(p)
    setCharts(ch)
    setAutomations(au)
    setActivity(act)
    if (openFromUrl) {
      const want = searchParams.get('item')
      if (want) {
        const match = its.find((item) => item.id === want)
        if (match) setOpenItem(match)
      }
    }
    const ids = its.map((i) => i.id)
    setRatings(await fetchRatings(ids))
    setItemNotes(await fetchCommentsForItems(ids))
    if (p.owner) {
      setMembers(await fetchMembers(id))
      setProposals(await fetchProposals(id))
    } else if (user) {
      setProposals(await fetchProposals(id).catch(() => []))
    }
    if (user) setSub(await isSubscribed(id, user.id))
  }

  /* eslint-disable react-hooks/set-state-in-effect -- load list by id */
  useEffect(() => {
    let cancelled = false
    void reload(true)
      .catch((e) => {
        if (!cancelled) toast(e instanceof Error ? e.message : t('common.error'), 'err')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const channel = supabase
      .channel(`items-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter: `list_id=eq.${id}` },
        () => {
          void fetchItems(id).then(async (its) => {
            setItems(its)
            const ids = its.map((i) => i.id)
            setItemNotes(await fetchCommentsForItems(ids))
            setRatings(await fetchRatings(ids))
          })
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [id])

  useEffect(() => {
    setOpenItem((current) => {
      if (!current) return current
      return items.find((row) => row.id === current.id) ?? null
    })
  }, [items])

  useEffect(() => {
    if (!moreOpen) return
    const onPointer = (event: PointerEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [moreOpen])

  const schema = useMemo(() => list?.schema ?? { fields: [] }, [list?.schema])
  const filtered = useMemo(() => {
    let rows = items.filter((i) => itemMatchesQuery(i, query))
    if (hideChecked) rows = rows.filter((i) => !i.is_checked)
    rows = applyListFilters(rows, schema, filters, ratings)
    return sortItems(rows, sort, schema, locale, ratings)
  }, [items, query, hideChecked, sort, schema, locale, filters, ratings])
  const insights = useMemo(() => buildInsights(schema, items, ratings), [schema, items, ratings])

  const overlayOpen =
    creating || Boolean(openItem) || settingsOpen || customizeOpen || helpOpen || paletteOpen || shareOpen
  const safeFocusIndex =
    focusIndex >= filtered.length ? (filtered.length ? filtered.length - 1 : -1) : focusIndex

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = Boolean(target?.closest('input, textarea, select, [contenteditable="true"]'))
      if (event.key === 'Escape') {
        if (overlayOpen) return
        setSelectMode(false)
        setSelected(new Set())
        return
      }
      if (overlayOpen) return
      if (event.key === '?' && !typing) {
        event.preventDefault()
        setHelpOpen(true)
        return
      }
      if (event.key === '/' && !typing) {
        event.preventDefault()
        searchRef.current?.focus()
        return
      }
      if (typing) return
      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault()
        if (perms?.edit || perms?.propose) setCreating(true)
        return
      }
      if ((event.key === 'a' || event.key === 'A') && perms?.edit) {
        event.preventDefault()
        setSelectMode(true)
        setSelected(new Set(filtered.map((row) => row.id)))
        return
      }
      if (event.key === 'j' || event.key === 'k' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (tab !== 'items' || !filtered.length) return
        event.preventDefault()
        const dir = event.key === 'j' || event.key === 'ArrowDown' ? 1 : -1
        setFocusIndex((prev) => {
          const current = prev >= filtered.length ? (filtered.length ? filtered.length - 1 : -1) : prev
          const start = current < 0 ? (dir > 0 ? -1 : 0) : current
          return (start + dir + filtered.length) % filtered.length
        })
        return
      }
      if (event.key === 'Enter' && safeFocusIndex >= 0 && filtered[safeFocusIndex]) {
        event.preventDefault()
        setOpenItem(filtered[safeFocusIndex])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [filtered, focusIndex, perms, tab, overlayOpen, safeFocusIndex])

  useEffect(() => {
    if (!list) return
    const resolvedViews = normalizeViewConfig(list.view_config, list.schema)
    const viewId =
      (activeViewId && resolvedViews.views.some((row) => row.id === activeViewId)
        ? activeViewId
        : null) ?? resolvedViews.activeViewId
    if (appliedViewRef.current === viewId) return
    appliedViewRef.current = viewId
    ignoreWorkspaceWrite.current = true
    const slice = readWorkspace(id).views?.[viewId]
    setSort(slice?.sort ?? 'new')
    setFilters(slice?.filters ?? emptyFilters())
  }, [list, activeViewId, id])

  useEffect(() => {
    if (!list || !appliedViewRef.current) return
    if (ignoreWorkspaceWrite.current) {
      ignoreWorkspaceWrite.current = false
      return
    }
    writeWorkspace(id, {
      viewId: appliedViewRef.current,
      hideChecked,
      views: { [appliedViewRef.current]: { sort, filters } },
    })
  }, [sort, filters, hideChecked, id, list])

  useEffect(() => {
    if (!list) {
      setWorkspace(null)
      return
    }
    setWorkspace({
      listId: list.id,
      items: items.map((item) => ({
        id: item.id,
        title: titleFromValues(item.values, list.schema.titleFieldId),
      })),
      openItem: (itemId) => {
        const row = items.find((item) => item.id === itemId)
        if (row) setOpenItem(row)
      },
      createItem: () => setCreating(true),
    })
    return () => setWorkspace(null)
  }, [list, items, setWorkspace])

  const notesByItem = useMemo(() => {
    const map: Record<string, ItemComment[]> = {}
    for (const note of itemNotes) {
      ;(map[note.item_id] ??= []).push(note)
    }
    return map
  }, [itemNotes])

  if (loading) return <Spinner />
  if (!list) {
    return <EmptyState icon="?" title={t('list.notFoundTitle')} text={t('list.notFoundText')} />
  }

  const resolved = normalizeViewConfig(list.view_config, schema)
  const currentViewId =
    (activeViewId && resolved.views.some((v) => v.id === activeViewId) ? activeViewId : null) ??
    resolved.activeViewId
  const view = resolved.views.find((v) => v.id === currentViewId) ?? resolved.active
  const canEdit = Boolean(perms?.edit)
  const canPropose = Boolean(perms?.propose)
  const canConfigureViews = Boolean(perms?.owner || perms?.edit)

  const saveViews = async (next: {
    views: NamedView[]
    allowedKinds: typeof resolved.allowedKinds
    activeViewId: string
  }) => {
    const config = toViewConfig(next, list.view_config)
    setList({ ...list, view_config: config })
    setActiveViewId(next.activeViewId)
    if (perms?.owner || perms?.edit) await updateList(list.id, { view_config: config })
  }

  const switchView = (id: string) => {
    setActiveViewId(id)
    writeWorkspace(list.id, { viewId: id, hideChecked })
    if (perms?.owner) {
      void saveViews({ ...resolved, activeViewId: id })
    }
  }

  const onToggle = async (item: ItemRow, next: boolean) => {
    if (!user) return
    if (!canEdit && canPropose) {
      await createProposal({
        list_id: list.id,
        item_id: item.id,
        user_id: user.id,
        action: next ? 'check' : 'uncheck',
        payload: {},
      })
      toast(t('list.proposed'))
      return
    }
    if (!canEdit) return
    const updated = await toggleChecked({
      item,
      userId: user.id,
      settings: list.settings ?? {},
      automations,
      next,
      fields: list.schema.fields,
    })
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
  }

  const dateFieldId = view.dateFieldId ?? schema.dateFieldId
  const groupFieldId = view.groupFieldId ?? schema.groupFieldId

  const startCreate = (patch?: Record<string, unknown>) => {
    setDraftValues({ ...emptyValues(schema), ...patch })
    setCreating(true)
  }

  const restoreItems = async (rows: ItemRow[]) => {
    if (!user) return
    await Promise.all(
      rows.map((row, index) =>
        createItem({
          list_id: list.id,
          values: { ...row.values },
          position: row.position || Date.now() / 1000 + index * 0.001,
          created_by: user.id,
          is_checked: row.is_checked,
          checked_at: row.checked_at,
          check_snapshot: row.check_snapshot,
        }),
      ),
    )
    await reload()
  }

  const onMoveDate = async (item: ItemRow, iso: string) => {
    if (!user || !canEdit || !dateFieldId) return
    const field = schema.fields.find((row) => row.id === dateFieldId)
    const prev = asDatetimeInputValue(item.values[dateFieldId])
    const next =
      field?.type === 'datetime' ? `${iso}T${prev.slice(11, 16) || '12:00'}` : iso
    const updated = await updateItem(item.id, {
      values: { ...item.values, [dateFieldId]: next },
      updated_by: user.id,
    })
    setItems((prevItems) => prevItems.map((row) => (row.id === updated.id ? updated : row)))
  }

  const onMoveGroup = async (item: ItemRow, value: string) => {
    if (!user || !canEdit || !groupFieldId) return
    const field = schema.fields.find((row) => row.id === groupFieldId)
    let next: unknown = value || null
    if (field && (field.type === 'boolean' || field.type === 'checkbox')) {
      next = value === 'true'
    } else if (field && (field.type === 'tags' || field.type === 'multiselect')) {
      next = value ? [value] : []
    }
    const updated = await updateItem(item.id, {
      values: { ...item.values, [groupFieldId]: next },
      updated_by: user.id,
    })
    setItems((prevItems) => prevItems.map((row) => (row.id === updated.id ? updated : row)))
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-muted">
            {list.icon} {t(`visibility.${list.visibility}`)}
            {list.visibility === 'link' || list.visibility === 'public' ? ` · ${t(`share.access.${listLinkAccess(list)}`)}` : ''}
            {' · '}
            {t(`editMode.${list.edit_mode}`)}
          </p>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="min-w-0 break-words font-serif text-3xl">{list.title}</h1>
            {user ? <FavoriteButton id={list.id} /> : null}
          </div>
          {list.description ? <p className="mt-1 max-w-xl text-sm text-muted">{list.description}</p> : null}
          {list.settings?.enableCheck && items.length ? (
            <div className="mt-3 max-w-sm">
              <div className="flex justify-between text-xs text-muted">
                <span>{t('insights.completion')}</span>
                <span>
                  {insights.checked}/{insights.total} · {insights.completion}%
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-accent" style={{ width: `${insights.completion}%` }} />
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {perms?.owner ? (
            <Button variant="soft" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings2 size={14} /> {t('list.configure')}
            </Button>
          ) : null}
          {canEdit || canPropose ? (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus size={14} /> {t('list.entry')}
            </Button>
          ) : null}
          <div className="relative" ref={moreRef}>
            <Button
              variant="soft"
              size="sm"
              className="sm:hidden"
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              onClick={() => setMoreOpen((open) => !open)}
            >
              <MoreHorizontal size={14} /> {t('list.moreActions')}
            </Button>
            <div
              className={`flex flex-wrap gap-2 ${
                moreOpen
                  ? 'absolute right-0 top-full z-20 mt-1 w-52 flex-col rounded-2xl border border-line bg-paper p-2 shadow-lift'
                  : 'hidden'
              } sm:relative sm:flex sm:w-auto sm:flex-row sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none`}
            >
              {user ? (
                <Button
                  variant="soft"
                  size="sm"
                  onClick={async () => {
                    await setSubscribed(list.id, user.id, !sub)
                    setSub(!sub)
                    setMoreOpen(false)
                  }}
                >
                  {sub ? <BellOff size={14} /> : <Bell size={14} />}
                  {sub ? t('list.following') : t('list.follow')}
                </Button>
              ) : null}
              <Button
                variant="soft"
                size="sm"
                onClick={() => {
                  setMoreOpen(false)
                  if (perms?.owner) {
                    setShareOpen(true)
                    return
                  }
                  void navigator.clipboard.writeText(listShareUrl(list.id)).then(() => toast(t('common.copied')))
                }}
              >
                <Link2 size={14} /> {t('common.share')}
              </Button>
              {user ? (
                <Button
                  variant="soft"
                  size="sm"
                  onClick={async () => {
                    setMoreOpen(false)
                    try {
                      const copy = await duplicateList(list.id, user.id, t('list.copyOf', { title: list.title }))
                      toast(t('list.duplicated'))
                      navigate(`/lists/${copy.id}`)
                    } catch {
                      toast(t('list.duplicateFail'), 'err')
                    }
                  }}
                >
                  <Copy size={14} /> {t('common.duplicate')}
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMoreOpen(false)
                  setHelpOpen(true)
                }}
                aria-label={t('shortcuts.title')}
              >
                <Keyboard size={14} />
                <span className="sm:hidden">{t('shortcuts.title')}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(['items', 'insights', 'charts', 'activity'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-3 py-1 text-sm ${tab === key ? 'bg-ink text-paper' : 'bg-ink/5 text-muted'}`}
          >
            {key === 'items'
              ? t('list.items')
              : key === 'insights'
                ? t('list.insights')
                : key === 'charts'
                  ? t('list.charts')
                  : t('list.activity')}
          </button>
        ))}
      </div>

      {tab === 'items' ? (
        <>
          <div className="mb-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <ViewSwitcher views={resolved.views} activeId={view.id} onChange={switchView} />
              {canConfigureViews ? (
                <Button variant="soft" size="sm" onClick={() => setCustomizeOpen(true)}>
                  <SlidersHorizontal size={14} /> {t('viewEditor.customize')}
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                ref={searchRef}
                className="min-w-0 flex-1 sm:max-w-xs"
                placeholder={t('list.searchItems')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {canEdit || canPropose ? (
                <QuickAdd
                  schema={schema}
                  disabled={!user}
                  onCreate={async (title) => {
                    const fieldId = titleFieldId(schema)
                    const values = emptyValues(schema)
                    if (fieldId) values[fieldId] = title
                    const extraRequired = schema.fields.filter((field) => {
                      if (!field.required || field.id === fieldId) return false
                      return isEmptyValue(values[field.id])
                    })
                    if (extraRequired.length || (canPropose && !canEdit)) {
                      setDraftValues(values)
                      setCreating(true)
                      return
                    }
                    if (!user) return
                    try {
                      await createItem({
                        list_id: list.id,
                        values,
                        position: Date.now() / 1000,
                        created_by: user.id,
                      })
                      await reload()
                    } catch (error) {
                      toast(error instanceof Error ? error.message : t('common.error'), 'err')
                    }
                  }}
                />
              ) : null}
              <label className="flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={hideChecked}
                  onChange={(e) => setHideChecked(e.target.checked)}
                />
                {t('common.hideChecked')}
              </label>
              <select
                className="rounded-xl border border-line bg-paper px-3 py-2 text-sm"
                value={sort}
                aria-label={t('common.sort')}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                <option value="new">{t('common.sortNew')}</option>
                <option value="old">{t('common.sortOld')}</option>
                <option value="az">{t('common.sortAz')}</option>
                <option value="za">{t('common.sortZa')}</option>
                {sortableFields(schema).flatMap((field) => [
                  <option key={`${field.id}-asc`} value={`f:${field.id}:asc`}>
                    {field.name} ↑
                  </option>,
                  <option key={`${field.id}-desc`} value={`f:${field.id}:desc`}>
                    {field.name} ↓
                  </option>,
                ])}
              </select>
              {canEdit ? (
                <Button
                  variant={selectMode ? 'primary' : 'soft'}
                  size="sm"
                  onClick={() => {
                    setSelectMode((value) => !value)
                    if (selectMode) setSelected(new Set())
                  }}
                >
                  <CheckSquare size={14} /> {t('bulk.mode')}
                </Button>
              ) : null}
            </div>
            <FacetFilters schema={schema} items={items} filters={filters} onChange={setFilters} />
            {selectMode && canEdit ? (
              <BulkBar
                count={selected.size}
                enableCheck={list.settings?.enableCheck}
                onSelectAll={() => setSelected(new Set(filtered.map((row) => row.id)))}
                onClear={() => setSelected(new Set())}
                onCheck={() => {
                  void Promise.all(
                    items
                      .filter((item) => selected.has(item.id) && !item.is_checked)
                      .map((item) => onToggle(item, true)),
                  ).catch((error) => toast(error instanceof Error ? error.message : t('common.error'), 'err'))
                }}
                onUncheck={() => {
                  void Promise.all(
                    items
                      .filter((item) => selected.has(item.id) && item.is_checked)
                      .map((item) => onToggle(item, false)),
                  ).catch((error) => toast(error instanceof Error ? error.message : t('common.error'), 'err'))
                }}
                onDuplicate={async () => {
                  if (!user) return
                  const rows = items.filter((item) => selected.has(item.id))
                  const base = Date.now() / 1000
                  try {
                    await Promise.all(
                      rows.map((item, index) =>
                        createItem({
                          list_id: list.id,
                          values: { ...item.values },
                          position: base + index * 0.001,
                          created_by: user.id,
                          is_checked: item.is_checked,
                          checked_at: item.checked_at,
                          check_snapshot: item.check_snapshot,
                        }),
                      ),
                    )
                    setSelected(new Set())
                    await reload()
                    toast(t('bulk.done'))
                  } catch (error) {
                    toast(error instanceof Error ? error.message : t('common.error'), 'err')
                  }
                }}
                onExport={() => {
                  const rows = items.filter((item) => selected.has(item.id))
                  downloadText(`${list.title}-sel.csv`, itemsToCsv(schema, rows), 'text/csv')
                }}
                onDelete={async () => {
                  if (!window.confirm(t('bulk.deleteConfirm', { n: selected.size }))) return
                  const snapshot = items.filter((item) => selected.has(item.id))
                  try {
                    await Promise.all(snapshot.map((item) => deleteItem(item.id)))
                    setSelected(new Set())
                    await reload()
                    toast(t('list.deleted'), 'ok', {
                      label: t('common.undo'),
                      onClick: () => {
                        void restoreItems(snapshot).catch((error) =>
                          toast(error instanceof Error ? error.message : t('common.error'), 'err'),
                        )
                      },
                    })
                  } catch (error) {
                    toast(error instanceof Error ? error.message : t('common.error'), 'err')
                  }
                }}
              />
            ) : null}
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              icon={list.icon ?? '📋'}
              title={items.length ? t('filters.empty') : t('list.emptyTitle')}
              text={items.length ? t('filters.emptyText') : t('list.emptyText')}
              action={
                !items.length && (canEdit || canPropose)
                  ? { label: t('list.add'), onClick: () => setCreating(true) }
                  : undefined
              }
            />
          ) : (
            <ListViews
              schema={schema}
              items={filtered}
              ratings={ratings}
              view={view}
              enableCheck={list.settings?.enableCheck}
              notesByItem={notesByItem}
              userId={user?.id}
              canAddNote={Boolean(user)}
              canManageNotes={Boolean(perms?.owner)}
              onOpen={setOpenItem}
              onToggle={onToggle}
              onNoteCreated={(row) => setItemNotes((prev) => [...prev, row])}
              onNoteUpdated={(row) => setItemNotes((prev) => prev.map((n) => (n.id === row.id ? row : n)))}
              onNoteDeleted={(noteId) => setItemNotes((prev) => prev.filter((n) => n.id !== noteId))}
              selectMode={selectMode}
              selectedIds={selected}
              highlightedId={filtered[safeFocusIndex]?.id}
              onToggleSelect={(item) => {
                setSelected((prev) => {
                  const next = new Set(prev)
                  if (next.has(item.id)) next.delete(item.id)
                  else next.add(item.id)
                  return next
                })
              }}
              canEdit={canEdit}
              onCreateOnDate={(iso) => {
                if (!dateFieldId) return
                const field = schema.fields.find((row) => row.id === dateFieldId)
                startCreate({
                  [dateFieldId]: field?.type === 'datetime' ? `${iso}T12:00` : iso,
                })
              }}
              onMoveDate={(item, iso) => {
                void onMoveDate(item, iso).catch((error) =>
                  toast(error instanceof Error ? error.message : t('common.error'), 'err'),
                )
              }}
              onMoveGroup={(item, value) => {
                void onMoveGroup(item, value).catch((error) =>
                  toast(error instanceof Error ? error.message : t('common.error'), 'err'),
                )
              }}
              onCreateInGroup={(value) => {
                if (!groupFieldId) return
                const field = schema.fields.find((row) => row.id === groupFieldId)
                let next: unknown = value
                if (field && (field.type === 'boolean' || field.type === 'checkbox')) {
                  next = value === 'true'
                } else if (field && (field.type === 'tags' || field.type === 'multiselect')) {
                  next = value ? [value] : []
                }
                startCreate({ [groupFieldId]: next })
              }}
            />
          )}
        </>
      ) : null}

      {tab === 'insights' ? (
        <ListInsights schema={schema} items={items} ratings={ratings} onOpen={setOpenItem} />
      ) : null}

      {tab === 'charts' ? (
        <ChartsTab
          list={list}
          items={items}
          ratings={ratings}
          charts={charts}
          canEdit={Boolean(perms?.owner)}
          onCreate={async (c) => {
            const row = await createChart(c)
            setCharts((prev) => [...prev, row])
          }}
          onDelete={async (cid) => {
            await deleteChart(cid)
            setCharts((prev) => prev.filter((c) => c.id !== cid))
          }}
        />
      ) : null}

      {tab === 'activity' ? (
        <ActivityFeed events={activity} schema={schema} items={items} onOpen={setOpenItem} />
      ) : null}

      {creating || openItem ? (
        <ItemModal
          key={openItem?.id ?? 'new'}
          item={openItem}
          list={list}
          items={items}
          siblings={filtered}
          initialValues={openItem ? undefined : draftValues ?? undefined}
          userId={user?.id}
          ratings={ratings}
          notes={openItem ? (notesByItem[openItem.id] ?? []) : []}
          canEdit={canEdit}
          canPropose={canPropose}
          canManageNotes={Boolean(perms?.owner)}
          onNoteCreated={(row) => setItemNotes((prev) => [...prev, row])}
          onNoteUpdated={(row) => setItemNotes((prev) => prev.map((note) => (note.id === row.id ? row : note)))}
          onNoteDeleted={(noteId) => setItemNotes((prev) => prev.filter((note) => note.id !== noteId))}
          onNavigate={setOpenItem}
          onRatingChange={(row) =>
            setRatings((prev) => {
              const idx = prev.findIndex(
                (r) => r.item_id === row.item_id && r.field_id === row.field_id && r.user_id === row.user_id,
              )
              if (idx >= 0) return prev.map((r, i) => (i === idx ? { ...r, ...row } : r))
              return [...prev, row]
            })
          }
          automations={automations}
          onClose={() => {
            setCreating(false)
            setOpenItem(null)
            setDraftValues(null)
            if (searchParams.has('item')) {
              const next = new URLSearchParams(searchParams)
              next.delete('item')
              setSearchParams(next, { replace: true })
            }
          }}
          onSaved={async () => {
            if (searchParams.has('item')) {
              const next = new URLSearchParams(searchParams)
              next.delete('item')
              setSearchParams(next, { replace: true })
            }
            await reload()
            setCreating(false)
            setOpenItem(null)
            setDraftValues(null)
          }}
          onPropose={async (payload) => {
            if (!user) return
            await createProposal({
              list_id: list.id,
              item_id: openItem?.id,
              user_id: user.id,
              action: openItem ? 'update' : 'create',
              payload,
            })
            toast(t('list.proposedOk'))
            setCreating(false)
            setOpenItem(null)
            setDraftValues(null)
          }}
        />
      ) : null}

      {customizeOpen && canConfigureViews ? (
        <Modal open title={t('viewEditor.edit')} onClose={() => setCustomizeOpen(false)} wide>
          <ViewEditor
            schema={schema}
            view={view}
            allowedKinds={resolved.allowedKinds}
            onChange={(next) => {
              const views = resolved.views.map((v) => (v.id === next.id ? next : v))
              setList({
                ...list,
                view_config: toViewConfig({ ...resolved, views, activeViewId: view.id }, list.view_config),
              })
            }}
          />
          <Button
            className="mt-4"
            onClick={() => {
              void saveViews({
                views: normalizeViewConfig(list.view_config, schema).views,
                allowedKinds: resolved.allowedKinds,
                activeViewId: view.id,
              })
              setCustomizeOpen(false)
            }}
          >
            {t('common.save')}
          </Button>
        </Modal>
      ) : null}

      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />

      {perms?.owner && user ? (
        <ShareDialog
          open={shareOpen}
          list={list}
          userId={user.id}
          onClose={() => setShareOpen(false)}
          onChange={setList}
        />
      ) : null}

      {perms?.owner ? (
        <SettingsModal
          open={settingsOpen}
          list={list}
          members={members}
          proposals={proposals}
          onClose={() => setSettingsOpen(false)}
          onChange={setList}
          onReload={reload}
          onDeleted={() => navigate('/lists')}
        />
      ) : null}
    </div>
  )
}

function ItemModal({
  item,
  list,
  items,
  siblings,
  initialValues,
  userId,
  ratings,
  notes,
  canEdit,
  canPropose,
  canManageNotes,
  onNoteCreated,
  onNoteUpdated,
  onNoteDeleted,
  onNavigate,
  onRatingChange,
  onClose,
  onSaved,
  onPropose,
  automations,
}: {
  item: ItemRow | null
  list: ListRow
  items: ItemRow[]
  siblings: ItemRow[]
  initialValues?: Record<string, unknown>
  userId?: string
  ratings: ItemRating[]
  notes: ItemComment[]
  canEdit: boolean
  canPropose: boolean
  canManageNotes?: boolean
  onNoteCreated: (row: ItemComment) => void
  onNoteUpdated: (row: ItemComment) => void
  onNoteDeleted: (id: string) => void
  onNavigate: (item: ItemRow) => void
  onRatingChange?: (row: ItemRating) => void
  onClose: () => void
  onSaved: () => Promise<void>
  onPropose: (payload: Record<string, unknown>) => Promise<void>
  automations: ListAutomation[]
}) {
  const schema = list.schema
  const [values, setValues] = useState<Record<string, unknown>>(
    () => item?.values ?? initialValues ?? emptyValues(schema),
  )
  const [errors, setErrors] = useState<string[]>([])
  const valuesBaseline = useRef(item?.values)

  useEffect(() => {
    if (!item) return
    const baseline = valuesBaseline.current
    const dirty = baseline != null && JSON.stringify(values) !== JSON.stringify(baseline)
    if (dirty) return
    valuesBaseline.current = item.values
    setValues(item.values)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync from live item when the user has not edited
  }, [item])
  const write = canEdit || canPropose
  const { t } = usePrefs()
  const { toast } = useToast()
  const index = item ? siblings.findIndex((row) => row.id === item.id) : -1
  const prev = index > 0 ? siblings[index - 1] : undefined
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : undefined

  const save = async () => {
    const errs = validateItem(schema, values, { items, excludeId: item?.id })
    setErrors(errs)
    if (errs.length) return
    try {
      if (canPropose && !canEdit) {
        await onPropose({ values })
        return
      }
      if (!userId) return
      if (item) {
        await updateItem(item.id, { values, updated_by: userId })
        await applyFieldEquals({
          item,
          previous: item.values,
          next: values,
          userId,
          fields: schema.fields,
          automations,
        })
      } else {
        const pos = Date.now() / 1000
        const created = await createItem({ list_id: list.id, values, position: pos, created_by: userId })
        await applyFieldEquals({
          item: created,
          previous: undefined,
          next: values,
          userId,
          fields: schema.fields,
          automations,
        })
      }
      await onSaved()
    } catch (error) {
      toast(error instanceof Error ? error.message : t('common.error'), 'err')
    }
  }

  return (
    <Modal open onClose={onClose} title={item ? titleFromValues(values, schema.titleFieldId) : t('list.newItem')} wide>
      {item && siblings.length > 1 ? (
        <div className="mb-3 flex justify-between gap-2">
          <Button variant="ghost" size="sm" disabled={!prev} onClick={() => prev && onNavigate(prev)}>
            <ChevronLeft size={14} /> {t('list.prev')}
          </Button>
          <span className="self-center text-xs text-muted">
            {index + 1} / {siblings.length}
          </span>
          <Button variant="ghost" size="sm" disabled={!next} onClick={() => next && onNavigate(next)}>
            {t('list.next')} <ChevronRight size={14} />
          </Button>
        </div>
      ) : null}
      {errors.length ? (
        <ul className="mb-3 text-sm text-rose-700">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
      <div className="space-y-4">
        {schema.fields.filter((f) => !f.hidden).map((field) => (
          <FieldInput
            key={field.id}
            field={field}
            value={values[field.id]}
            disabled={!write}
            listId={list.id}
            userId={userId}
            itemId={item?.id}
            ratings={ratings}
            onRatingChange={onRatingChange}
            onChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}
          />
        ))}
      </div>
      {item ? (
        <p className="mt-4 text-xs text-muted">
          {t('list.created')} {formatDateTime(item.created_at)}
          {item.updated_at !== item.created_at ? ` · ${t('list.updated')} ${formatDateTime(item.updated_at)}` : ''}
        </p>
      ) : null}
      {item ? (
        <ItemNotesPanel
          item={item}
          notes={notes}
          userId={userId}
          canAdd={Boolean(userId)}
          canManage={canManageNotes}
          onCreated={onNoteCreated}
          onUpdated={onNoteUpdated}
          onDeleted={onNoteDeleted}
        />
      ) : null}

      {(list.settings?.transferActions ?? []).length && item && canEdit ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {(list.settings?.transferActions ?? []).map((a) => (
            <Button
              key={a.id}
              variant="soft"
              size="sm"
              onClick={async () => {
                if (!userId) return
                try {
                  const target = await fetchList(a.targetListId)
                  await transferItem({
                    item,
                    action: a,
                    userId,
                    fields: schema.fields,
                    targetFields: target?.schema.fields ?? [],
                    automations,
                  })
                  await onSaved()
                } catch (error) {
                  toast(error instanceof Error ? error.message : t('common.error'), 'err')
                }
              }}
            >
              {a.label}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex justify-between gap-2">
        {item && canEdit ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="danger"
              onClick={async () => {
                const snapshot = { ...item, values }
                await deleteItem(item.id)
                await onSaved()
                toast(t('list.deleted'), 'ok', {
                  label: t('common.undo'),
                  onClick: () => {
                    if (!userId) return
                    void createItem({
                      list_id: list.id,
                      values: snapshot.values,
                      position: snapshot.position,
                      created_by: userId,
                      is_checked: snapshot.is_checked,
                      checked_at: snapshot.checked_at,
                      check_snapshot: snapshot.check_snapshot,
                    })
                      .then(() => onSaved())
                      .catch((error) => toast(error instanceof Error ? error.message : t('common.error'), 'err'))
                  },
                })
              }}
            >
              <Trash2 size={14} /> {t('common.delete')}
            </Button>
            <Button
              variant="soft"
              onClick={async () => {
                if (!userId) return
                await createItem({
                  list_id: list.id,
                  values: { ...values },
                  position: Date.now() / 1000,
                  created_by: userId,
                })
                toast(t('list.duplicatedItem'))
                await onSaved()
              }}
            >
              <Copy size={14} /> {t('common.duplicate')}
            </Button>
          </div>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t('common.close')}
          </Button>
          {write ? (
            <Button onClick={() => void save()}>
              {canPropose && !canEdit ? t('list.suggest') : t('common.save')}
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}

function ChartsTab({
  list,
  items,
  ratings,
  charts,
  canEdit,
  onCreate,
  onDelete,
}: {
  list: ListRow
  items: ItemRow[]
  ratings: ItemRating[]
  charts: ListChart[]
  canEdit: boolean
  onCreate: (c: { list_id: string; name: string; chart_type: ChartType; config: ListChart['config'] }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const { t } = usePrefs()
  const { toast } = useToast()
  const fields = list.schema.fields
  const valueFields = fields.filter((f) =>
    ['number', 'integer', 'rating', 'multi_rating'].includes(f.type),
  )
  const groupFields = fields.filter((f) =>
    ['select', 'multiselect', 'tags', 'boolean', 'checkbox', 'text'].includes(f.type),
  )
  const [name, setName] = useState(t('charts.newChart'))
  const [type, setType] = useState<ChartType>('timeline')
  const [dateFieldId, setDateFieldId] = useState(fields[0]?.id ?? '')
  const [valueFieldId, setValueFieldId] = useState(valueFields[0]?.id ?? '')
  const [groupFieldId, setGroupFieldId] = useState(groupFields[0]?.id ?? '')
  const [aggregation, setAggregation] = useState<NonNullable<ListChart['config']['aggregation']>>('count')
  const usesDate = type !== 'pie' && type !== 'kpi'
  const usesValue = type !== 'pie' && (type === 'kpi' || aggregation !== 'count')
  const usesGroup = type === 'pie'
  const selectClass = 'w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm'

  return (
    <div className="space-y-6">
      <Hint title={t('charts.hint')} example={t('charts.hintEx')} />
      {charts.map((c) => {
        const dateName = fields.find((f) => f.id === c.config.dateFieldId)?.name
        const valueName = fields.find((f) => f.id === c.config.valueFieldId)?.name
        const groupName = fields.find((f) => f.id === c.config.groupFieldId)?.name
        return (
          <section key={c.id} className="rounded-3xl border border-line bg-paper p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl">{c.name}</h3>
                <p className="mt-0.5 text-xs text-muted">
                  {[
                    t(`charts.types.${c.chart_type}`),
                    dateName,
                    valueName,
                    groupName,
                    c.config.aggregation ? t(`charts.agg.${c.config.aggregation}`) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              {canEdit ? (
                <Button variant="ghost" size="sm" onClick={() => void onDelete(c.id)}>
                  {t('common.delete')}
                </Button>
              ) : null}
            </div>
            <ChartView type={c.chart_type} config={c.config} schema={list.schema} items={items} ratings={ratings} />
          </section>
        )
      })}
      {canEdit ? (
        <div className="rounded-3xl border border-dashed border-line p-4">
          <p className="mb-3 text-sm font-medium">{t('charts.saveTpl')}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldWrap label={t('schema.name')}>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </FieldWrap>
            <FieldWrap label={t('schema.type')}>
              <select className={selectClass} value={type} onChange={(e) => setType(e.target.value as ChartType)}>
                {CHART_TYPE_LIST.map((code) => (
                  <option key={code} value={code}>
                    {t(`charts.types.${code}`)}
                  </option>
                ))}
              </select>
            </FieldWrap>
            {usesDate ? (
              <FieldWrap label={t('charts.dateField')}>
                <select className={selectClass} value={dateFieldId} onChange={(e) => setDateFieldId(e.target.value)}>
                  <option value="">—</option>
                  {fields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </FieldWrap>
            ) : null}
            {usesDate ? (
              <FieldWrap label={t('charts.aggregation')}>
                <select
                  className={selectClass}
                  value={aggregation}
                  onChange={(e) => setAggregation(e.target.value as typeof aggregation)}
                >
                  {(['count', 'avg', 'sum', 'min', 'max'] as const).map((code) => (
                    <option key={code} value={code}>
                      {t(`charts.agg.${code}`)}
                    </option>
                  ))}
                </select>
              </FieldWrap>
            ) : null}
            {usesValue ? (
              <FieldWrap label={t('charts.valueField')}>
                <select className={selectClass} value={valueFieldId} onChange={(e) => setValueFieldId(e.target.value)}>
                  <option value="">—</option>
                  {valueFields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </FieldWrap>
            ) : null}
            {usesGroup ? (
              <FieldWrap label={t('charts.groupField')}>
                <select className={selectClass} value={groupFieldId} onChange={(e) => setGroupFieldId(e.target.value)}>
                  <option value="">—</option>
                  {groupFields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </FieldWrap>
            ) : null}
          </div>
          <Button
            className="mt-4"
            onClick={() => {
              if (usesDate && !dateFieldId) {
                toast(t('charts.needDate'), 'err')
                return
              }
              if (usesValue && !valueFieldId) {
                toast(t('charts.needValue'), 'err')
                return
              }
              if (usesGroup && !groupFieldId) {
                toast(t('charts.needGroup'), 'err')
                return
              }
              void onCreate({
                list_id: list.id,
                name,
                chart_type: type,
                config: {
                  dateFieldId: usesDate ? dateFieldId : undefined,
                  valueFieldId: usesValue ? valueFieldId || undefined : undefined,
                  groupFieldId: usesGroup ? groupFieldId || undefined : undefined,
                  aggregation: usesDate ? aggregation : undefined,
                },
              })
            }}
          >
            {t('common.save')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function SettingsModal({
  open,
  list,
  members,
  proposals,
  onClose,
  onChange,
  onReload,
  onDeleted,
}: {
  open: boolean
  list: ListRow
  members: ListMember[]
  proposals: ChangeProposal[]
  onClose: () => void
  onChange: (list: ListRow) => void
  onReload: () => Promise<void>
  onDeleted: () => void
}) {
  const { toast } = useToast()
  const { t } = usePrefs()
  const { user } = useAuth()
  const [panel, setPanel] = useState<'general' | 'views' | 'fields' | 'share' | 'flow' | 'io'>('general')
  const [userQuery, setUserQuery] = useState('')
  const [found, setFound] = useState<Profile[]>([])
  const [foundFor, setFoundFor] = useState('')
  const debouncedUsers = useDebouncedValue(userQuery)
  const userSearch = debouncedUsers.trim()
  const visibleFound = userSearch.length < 2 || foundFor !== userSearch ? [] : found

  useEffect(() => {
    if (userSearch.length < 2) return
    let cancelled = false
    void searchProfiles(userSearch).then((rows) => {
      if (cancelled) return
      setFound(rows)
      setFoundFor(userSearch)
    })
    return () => {
      cancelled = true
    }
  }, [userSearch])

  const save = async (patch: Partial<ListRow>) => {
    const row = await updateList(list.id, patch)
    onChange(row)
    toast(t('settingsModal.saved'))
  }

  return (
    <Modal open={open} onClose={onClose} title={t('settingsModal.title')} wide>
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ['general', t('settingsModal.general')],
            ['views', t('settingsModal.views')],
            ['fields', t('settingsModal.fields')],
            ['share', t('settingsModal.share')],
            ['flow', t('flow.tab')],
            ['io', t('settingsModal.io')],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`rounded-full px-3 py-1 text-sm ${panel === id ? 'bg-ink text-paper' : 'bg-ink/5'}`}
            onClick={() => setPanel(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {panel === 'general' ? (
        <div className="space-y-3">
          <FieldWrap label={t('settingsModal.name')}>
            <Input value={list.title} onChange={(e) => onChange({ ...list, title: e.target.value })} />
          </FieldWrap>
          <FieldWrap label={t('settingsModal.description')}>
            <Textarea
              value={list.description ?? ''}
              onChange={(e) => onChange({ ...list, description: e.target.value })}
            />
          </FieldWrap>
          <FieldWrap label={t('settingsModal.icon')}>
            <Input value={list.icon ?? ''} onChange={(e) => onChange({ ...list, icon: e.target.value })} />
          </FieldWrap>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(list.settings?.enableCheck)}
              onChange={(e) =>
                onChange({
                  ...list,
                  settings: { ...list.settings, enableCheck: e.target.checked },
                })
              }
            />
            {t('settingsModal.enableCheck')}
          </label>
          <Button
            onClick={() =>
              void save({
                title: list.title,
                description: list.description,
                icon: list.icon,
                settings: list.settings,
              })
            }
          >
            {t('common.save')}
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (!confirm(t('settingsModal.deleteConfirm'))) return
              await deleteList(list.id)
              onDeleted()
            }}
          >
            {t('settingsModal.deleteList')}
          </Button>
        </div>
      ) : null}

      {panel === 'views' ? (
        <div>
          <ViewsManager
            schema={list.schema}
            views={normalizeViewConfig(list.view_config, list.schema).views}
            allowedKinds={normalizeViewConfig(list.view_config, list.schema).allowedKinds}
            activeViewId={normalizeViewConfig(list.view_config, list.schema).activeViewId}
            onChange={(next) =>
              onChange({
                ...list,
                view_config: toViewConfig(next, list.view_config),
              })
            }
          />
          <Button className="mt-4" onClick={() => void save({ view_config: list.view_config })}>
            {t('common.save')}
          </Button>
        </div>
      ) : null}

      {panel === 'fields' ? (
        <div>
          <SchemaEditor schema={list.schema} onChange={(schema) => onChange({ ...list, schema })} />
          <Button className="mt-4" onClick={() => void save({ schema: list.schema })}>
            {t('settingsModal.saveFields')}
          </Button>
        </div>
      ) : null}

      {panel === 'share' ? (
        <SharePanel
          list={list}
          members={members}
          proposals={proposals}
          userQuery={userQuery}
          found={visibleFound}
          onList={onChange}
          onQuery={setUserQuery}
          onSave={() =>
            void save({ visibility: list.visibility, edit_mode: list.edit_mode, settings: list.settings })
          }
          onReload={onReload}
        />
      ) : null}

      {panel === 'flow' && user ? (
        <FlowEditor
          list={list}
          userId={user.id}
          onChange={onChange}
          onSaveSettings={() => save({ settings: list.settings })}
        />
      ) : null}

      {panel === 'io' ? (
        <ImportExport list={list} onReload={onReload} />
      ) : null}
    </Modal>
  )
}

function proposalPreview(proposal: ChangeProposal): string {
  const values = proposal.payload?.values
  if (!values || typeof values !== 'object' || Array.isArray(values)) return ''
  return Object.values(values as Record<string, unknown>)
    .filter((value) => value != null && value !== '')
    .slice(0, 3)
    .map(String)
    .join(' · ')
}

function SharePanel({
  list,
  members,
  proposals,
  userQuery,
  found,
  onList,
  onQuery,
  onSave,
  onReload,
}: {
  list: ListRow
  members: ListMember[]
  proposals: ChangeProposal[]
  userQuery: string
  found: Profile[]
  onList: (l: ListRow) => void
  onQuery: (q: string) => void
  onSave: () => void
  onReload: () => Promise<void>
}) {
  const { user } = useAuth()
  const { t } = usePrefs()
  const { toast } = useToast()
  const [role, setRole] = useState<MemberRole>('viewer')
  const access = listLinkAccess(list)
  const copy = async (url: string) => {
    await navigator.clipboard.writeText(url)
    toast(t('common.copied'))
  }
  return (
    <div className="space-y-4">
      <Hint title={t('settingsModal.shareHint')} example={t('settingsModal.shareEx')} />
      <FieldWrap label={t('settingsModal.whoSees')}>
        <Select
          className="w-full"
          value={list.visibility}
          onChange={(e) => {
            const visibility = e.target.value as ListRow['visibility']
            const settings = { ...list.settings }
            if (visibility === 'link' && !settings.linkAccess) settings.linkAccess = 'view'
            if (visibility !== 'link' && visibility !== 'public') delete settings.linkAccess
            onList({ ...list, visibility, settings })
          }}
        >
          {(['private', 'invite', 'friends', 'link', 'public'] as const).map((k) => (
            <option key={k} value={k}>
              {t(`visibility.${k}`)}
            </option>
          ))}
        </Select>
      </FieldWrap>
      {list.visibility === 'link' || list.visibility === 'public' ? (
        <FieldWrap label={t('share.linkAccess')}>
          <Select
            className="w-full"
            value={access === 'off' ? 'view' : access}
            onChange={(e) => onList({ ...list, ...applyLinkAccess(list, e.target.value as LinkAccess) })}
          >
            {(['view', 'propose', 'edit'] as const).map((k) => (
              <option key={k} value={k}>
                {t(`share.access.${k}`)}
              </option>
            ))}
          </Select>
        </FieldWrap>
      ) : null}
      <FieldWrap label={t('settingsModal.whoEdits')}>
        <Select
          className="w-full"
          value={list.edit_mode}
          onChange={(e) => onList({ ...list, edit_mode: e.target.value as ListRow['edit_mode'] })}
        >
          {(['owner', 'selected', 'friends', 'proposals'] as const).map((k) => (
            <option key={k} value={k}>
              {t(`editMode.${k}`)}
            </option>
          ))}
        </Select>
      </FieldWrap>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onSave}>{t('settingsModal.saveAccess')}</Button>
        <Button variant="soft" onClick={() => void copy(listShareUrl(list.id))}>
          <Link2 size={14} /> {t('share.copyList')}
        </Button>
      </div>

      <FieldWrap label={t('settingsModal.inviteByName')}>
        <div className="flex flex-wrap gap-2">
          <SearchField
            className="min-w-0 flex-1"
            value={userQuery}
            onChange={(e) => void onQuery(e.target.value)}
            placeholder={t('share.findUser')}
          />
          <Select value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
            <option value="viewer">{t('settingsModal.viewer')}</option>
            <option value="proposer">{t('settingsModal.proposer')}</option>
            <option value="editor">{t('settingsModal.editor')}</option>
          </Select>
        </div>
      </FieldWrap>
      <ul className="space-y-2">
        {found.map((p) => (
          <PersonRow
            key={p.id}
            profile={p}
            action={
              <Button
                size="sm"
                variant="soft"
                onClick={async () => {
                  if (!user) return
                  await createInvite({
                    list_id: list.id,
                    inviter_id: user.id,
                    invitee_id: p.id,
                    role,
                  })
                  toast(t('share.invited'))
                  await onReload()
                }}
              >
                {t('settingsModal.invite')}
              </Button>
            }
          />
        ))}
      </ul>
      {user ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            void createInvite({ list_id: list.id, inviter_id: user.id, role })
              .then((row) => copy(joinShareUrl(row.token)))
              .catch((error) => toast(error instanceof Error ? error.message : t('common.error'), 'err'))
          }}
        >
          <Link2 size={14} /> {t('share.copyInvite')}
        </Button>
      ) : null}

      <h3 className="text-sm font-medium">{t('settingsModal.members')}</h3>
      <ul className="space-y-2 text-sm">
        {members.map((m) => (
          <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0 truncate">@{m.profile?.username ?? m.user_id}</span>
            <span className="flex flex-wrap gap-2">
              <Select
                className="px-2 py-1"
                value={m.role}
                onChange={(e) => void updateMemberRole(list.id, m.user_id, e.target.value as ListMember['role']).then(onReload)}
              >
                <option value="viewer">{t('settingsModal.viewer')}</option>
                <option value="editor">{t('settingsModal.editor')}</option>
                <option value="proposer">{t('settingsModal.proposer')}</option>
              </Select>
              <button type="button" className="text-sm text-muted hover:text-ink" onClick={() => void removeMember(list.id, m.user_id).then(onReload)}>
                {t('settingsModal.remove')}
              </button>
            </span>
          </li>
        ))}
      </ul>

      <h3 className="text-sm font-medium">{t('settingsModal.proposals')}</h3>
      <ul className="space-y-2">
        {proposals
          .filter((p) => p.status === 'pending')
          .map((p) => (
            <li key={p.id} className="rounded-xl bg-ink/5 p-3 text-sm">
              <p>
                {p.profile?.username ?? t('list.someone')} · {t(`settingsModal.proposal.${p.action}`)}
              </p>
              {proposalPreview(p) ? (
                <p className="mt-1 truncate text-xs text-muted">{proposalPreview(p)}</p>
              ) : null}
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => void reviewProposal(p.id, true).then(onReload)}>
                  {t('settingsModal.approve')}
                </Button>
                <Button size="sm" variant="soft" onClick={() => void reviewProposal(p.id, false).then(onReload)}>
                  {t('settingsModal.reject')}
                </Button>
              </div>
            </li>
          ))}
      </ul>
    </div>
  )
}

function ImportExport({ list, onReload }: { list: ListRow; onReload: () => Promise<void> }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const { t } = usePrefs()
  const [applySchema, setApplySchema] = useState(true)
  return (
    <div className="space-y-4">
      <Hint title={t('settingsModal.ioHint')} example={t('settingsModal.ioEx')} />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="soft"
          onClick={async () => {
            const items = await fetchItems(list.id)
            downloadText(
              `${list.title}.json`,
              itemsToJson(
                {
                  title: list.title,
                  schema: list.schema,
                  settings: list.settings,
                  view_config: list.view_config,
                },
                items,
              ),
              'application/json',
            )
          }}
        >
          <Download size={14} /> JSON
        </Button>
        <Button
          variant="soft"
          onClick={async () => {
            const items = await fetchItems(list.id)
            downloadText(`${list.title}.csv`, itemsToCsv(list.schema, items), 'text/csv')
          }}
        >
          <Download size={14} /> CSV
        </Button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={applySchema} onChange={(e) => setApplySchema(e.target.checked)} />
        {t('settingsModal.importSchema')}
      </label>
      <FieldWrap label={t('settingsModal.jsonCsv')}>
        <input
          type="file"
          accept=".json,.csv,application/json,text/csv"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file || !user) return
            const text = await file.text()
            try {
              if (file.name.endsWith('.json')) {
                const parsed = parseImportJson(text)
                if (applySchema && parsed.schema) {
                  await updateList(list.id, {
                    schema: parsed.schema,
                    settings: parsed.settings ?? list.settings,
                    view_config: parsed.view_config ?? list.view_config,
                  })
                }
                const base = Date.now() / 1000
                for (const [index, row] of parsed.items.entries()) {
                  await createItem({
                    list_id: list.id,
                    values: row.values,
                    position: row.position ?? base + index * 0.001,
                    created_by: user.id,
                    is_checked: row.is_checked,
                    checked_at: row.is_checked ? new Date().toISOString() : null,
                  })
                }
              } else {
                const rows = parseCsv(text)
                const items = mapCsvToItems(rows, list.schema.fields)
                const base = Date.now() / 1000
                for (const [index, row] of items.entries()) {
                  await createItem({
                    list_id: list.id,
                    values: row.values,
                    position: base + index * 0.001,
                    created_by: user.id,
                    is_checked: row.is_checked,
                    checked_at: row.is_checked ? new Date().toISOString() : null,
                  })
                }
              }
              toast(t('settingsModal.imported'))
              await onReload()
            } catch (err) {
              toast(err instanceof Error ? err.message : t('settingsModal.importFail'), 'err')
            }
          }}
        />
      </FieldWrap>
    </div>
  )
}
