import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Bell,
  BellOff,
  Copy,
  Download,
  Link2,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { useToast } from '../context/ToastContext'
import {
  addComment,
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
  fetchComments,
  fetchItems,
  fetchList,
  fetchMembers,
  fetchProposals,
  fetchRatings,
  isSubscribed,
  listPermissions,
  moveItem,
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
  ListMember,
  ListPermissions,
  ListRow,
  Profile,
  TransferAction,
  ViewMode,
} from '../types/domain'
import Button from '../components/ui/Button'
import Hint from '../components/ui/Hint'
import Modal from '../components/ui/Modal'
import { FieldWrap, Input, Textarea } from '../components/ui/Input'
import EmptyState, { Spinner } from '../components/ui/EmptyState'
import SchemaEditor from '../components/lists/SchemaEditor'
import ListViews, { ViewSwitcher } from '../components/lists/ListViews'
import FieldInput from '../components/fields/FieldInput'
import ChartView from '../components/charts/ChartView'
import { emptyValues, itemMatchesQuery, validateItem } from '../lib/validation'
import { downloadText, itemsToCsv, itemsToJson, mapCsvToItems, parseCsv, parseImportJson } from '../lib/export'
import { toggleChecked } from '../lib/automations'
import { formatDateTime, titleFromValues } from '../lib/cn'
import { CHART_TYPES as CHART_TYPE_LIST } from '../types/domain'

function listShareUrl(id: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`
  return `${window.location.origin}${base}lists/${id}`
}

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

  const [list, setList] = useState<ListRow | null>(null)
  const [items, setItems] = useState<ItemRow[]>([])
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
  const [tab, setTab] = useState<'items' | 'charts' | 'activity'>('items')
  const [openItem, setOpenItem] = useState<ItemRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [hideChecked, setHideChecked] = useState(false)
  const [sort, setSort] = useState<'new' | 'old' | 'az' | 'za'>('new')

  const reload = async () => {
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
    setRatings(await fetchRatings(its.map((i) => i.id)))
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
    void reload()
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
  }, [id])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const channel = supabase
      .channel(`items-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter: `list_id=eq.${id}` },
        () => {
          void fetchItems(id).then(setItems)
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [id])

  const schema = list?.schema ?? { fields: [] }
  const filtered = useMemo(() => {
    let rows = items.filter((i) => itemMatchesQuery(i, query))
    if (hideChecked) rows = rows.filter((i) => !i.is_checked)
    const titleOf = (row: ItemRow) => titleFromValues(row.values, schema.titleFieldId).toLowerCase()
    const next = [...rows]
    if (sort === 'new') next.sort((a, b) => b.created_at.localeCompare(a.created_at))
    if (sort === 'old') next.sort((a, b) => a.created_at.localeCompare(b.created_at))
    if (sort === 'az') next.sort((a, b) => titleOf(a).localeCompare(titleOf(b), locale))
    if (sort === 'za') next.sort((a, b) => titleOf(b).localeCompare(titleOf(a), locale))
    return next
  }, [items, query, hideChecked, sort, schema.titleFieldId, locale])

  if (loading) return <Spinner />
  if (!list) {
    return <EmptyState icon="?" title={t('list.notFoundTitle')} text={t('list.notFoundText')} />
  }

  const view = list.view_config ?? { mode: 'table' as ViewMode }
  const canEdit = Boolean(perms?.edit)
  const canPropose = Boolean(perms?.propose)

  const saveView = async (mode: ViewMode) => {
    const next = { ...view, mode }
    setList({ ...list, view_config: next })
    if (perms?.owner) await updateList(list.id, { view_config: next })
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
    })
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">
            {list.icon} {t(`visibility.${list.visibility}`)} · {t(`editMode.${list.edit_mode}`)}
          </p>
          <h1 className="font-serif text-3xl">{list.title}</h1>
          {list.description ? <p className="mt-1 max-w-xl text-sm text-muted">{list.description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {user ? (
            <Button
              variant="soft"
              size="sm"
              onClick={async () => {
                await setSubscribed(list.id, user.id, !sub)
                setSub(!sub)
              }}
            >
              {sub ? <BellOff size={14} /> : <Bell size={14} />}
              {sub ? t('list.following') : t('list.follow')}
            </Button>
          ) : null}
          <Button
            variant="soft"
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(listShareUrl(list.id))
              toast(t('common.copied'))
            }}
          >
            <Link2 size={14} /> {t('common.share')}
          </Button>
          {user ? (
            <Button
              variant="soft"
              size="sm"
              onClick={async () => {
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
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(['items', 'charts', 'activity'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-3 py-1 text-sm ${tab === key ? 'bg-ink text-paper' : 'bg-ink/5 text-muted'}`}
          >
            {key === 'items' ? t('list.items') : key === 'charts' ? t('list.charts') : t('list.activity')}
          </button>
        ))}
      </div>

      {tab === 'items' ? (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ViewSwitcher mode={view.mode} onChange={(m) => void saveView(m)} />
            <Input
              className="sm:max-w-xs"
              placeholder={t('list.searchItems')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
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
              onChange={(e) => setSort(e.target.value as typeof sort)}
            >
              <option value="new">{t('common.sortNew')}</option>
              <option value="old">{t('common.sortOld')}</option>
              <option value="az">{t('common.sortAz')}</option>
              <option value="za">{t('common.sortZa')}</option>
            </select>
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              icon={list.icon ?? '📋'}
              title={t('list.emptyTitle')}
              text={t('list.emptyText')}
              action={
                canEdit || canPropose
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
              onOpen={setOpenItem}
              onToggle={onToggle}
            />
          )}
        </>
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
        <ul className="space-y-2">
          {activity.map((a) => (
            <li key={a.id} className="rounded-2xl bg-paper px-4 py-3 text-sm shadow-lift">
              <span className="text-muted">{formatDateTime(a.created_at)}</span>
              <span className="mx-2">·</span>
              {a.actor?.username ?? t('list.someone')} — {a.event_type}
            </li>
          ))}
          {!activity.length ? <p className="text-sm text-muted">{t('list.quiet')}</p> : null}
        </ul>
      ) : null}

      {creating || openItem ? (
        <ItemModal
          key={openItem?.id ?? 'new'}
          item={openItem}
          list={list}
          userId={user?.id}
          ratings={ratings}
          canEdit={canEdit}
          canPropose={canPropose}
          onClose={() => {
            setCreating(false)
            setOpenItem(null)
          }}
          onSaved={async () => {
            await reload()
            setCreating(false)
            setOpenItem(null)
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
          }}
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
  userId,
  ratings,
  canEdit,
  canPropose,
  onClose,
  onSaved,
  onPropose,
}: {
  item: ItemRow | null
  list: ListRow
  userId?: string
  ratings: ItemRating[]
  canEdit: boolean
  canPropose: boolean
  onClose: () => void
  onSaved: () => Promise<void>
  onPropose: (payload: Record<string, unknown>) => Promise<void>
}) {
  const schema = list.schema
  const [values, setValues] = useState<Record<string, unknown>>(
    () => item?.values ?? emptyValues(schema),
  )
  const [errors, setErrors] = useState<string[]>([])
  const [comments, setComments] = useState<ItemComment[]>([])
  const [comment, setComment] = useState('')
  const write = canEdit || canPropose
  const { t } = usePrefs()

  useEffect(() => {
    if (!item) return
    let cancelled = false
    void fetchComments(item.id).then((rows) => {
      if (!cancelled) setComments(rows)
    })
    return () => {
      cancelled = true
    }
  }, [item])

  const save = async () => {
    const errs = validateItem(schema, values)
    setErrors(errs)
    if (errs.length) return
    if (canPropose && !canEdit) {
      await onPropose({ values })
      return
    }
    if (!userId) return
    if (item) {
      await updateItem(item.id, { values, updated_by: userId })
    } else {
      const pos = Date.now() / 1000
      await createItem({ list_id: list.id, values, position: pos, created_by: userId })
    }
    await onSaved()
  }

  return (
    <Modal open onClose={onClose} title={item ? titleFromValues(values, schema.titleFieldId) : t('list.newItem')} wide>
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
            onChange={(v) => setValues((prev) => ({ ...prev, [field.id]: v }))}
          />
        ))}
      </div>

      {(list.settings?.transferActions ?? []).length && item && canEdit ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {(list.settings?.transferActions ?? []).map((a) => (
            <Button
              key={a.id}
              variant="soft"
              size="sm"
              onClick={async () => {
                await moveItem({
                  itemId: item.id,
                  targetListId: a.targetListId,
                  fieldMap: a.fieldMap,
                  deleteSource: a.deleteSource ?? true,
                })
                await onSaved()
              }}
            >
              {a.label}
            </Button>
          ))}
        </div>
      ) : null}

      {item ? (
        <Comments
          comments={comments}
          value={comment}
          onChange={setComment}
          onSend={async () => {
            if (!userId || !comment.trim()) return
            const row = await addComment({ item_id: item.id, user_id: userId, body: comment.trim() })
            setComments((p) => [...p, row])
            setComment('')
          }}
        />
      ) : null}

      <div className="mt-5 flex justify-between gap-2">
        {item && canEdit ? (
          <Button
            variant="danger"
            onClick={async () => {
              await deleteItem(item.id)
              await onSaved()
            }}
          >
            <Trash2 size={14} /> {t('common.delete')}
          </Button>
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

function Comments({
  comments,
  value,
  onChange,
  onSend,
}: {
  comments: ItemComment[]
  value: string
  onChange: (v: string) => void
  onSend: () => void
}) {
  const { t } = usePrefs()
  return (
    <div className="mt-6 border-t border-line pt-4">
      <h3 className="mb-2 text-sm font-medium">{t('list.comments')}</h3>
      <ul className="mb-3 space-y-2">
        {comments.map((c) => (
          <li key={c.id} className="text-sm">
            <span className="font-medium">{c.profile?.username ?? t('list.someone')}</span>
            <span className="mx-1 text-muted">· {formatDateTime(c.created_at)}</span>
            <p>{c.body}</p>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={t('list.write')} />
        <Button variant="soft" onClick={onSend}>
          {t('common.send')}
        </Button>
      </div>
    </div>
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
  const [name, setName] = useState(t('charts.newChart'))
  const [type, setType] = useState<ChartType>('timeline')
  const dateFieldId = list.schema.dateFieldId ?? list.schema.fields.find((f) => f.type === 'date')?.id
  const valueFieldId = list.schema.fields.find((f) => f.type === 'multi_rating' || f.type === 'number' || f.type === 'rating')?.id

  return (
    <div className="space-y-6">
      <Hint title={t('charts.hint')} example={t('charts.hintEx')} />
      {charts.map((c) => (
        <section key={c.id} className="rounded-3xl border border-line bg-paper p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-serif text-xl">{c.name}</h3>
            {canEdit ? (
              <Button variant="ghost" size="sm" onClick={() => void onDelete(c.id)}>
                {t('common.delete')}
              </Button>
            ) : null}
          </div>
          <ChartView type={c.chart_type} config={c.config} schema={list.schema} items={items} ratings={ratings} />
        </section>
      ))}
      {canEdit ? (
        <div className="rounded-3xl border border-dashed border-line p-4">
          <p className="mb-3 text-sm font-medium">{t('charts.saveTpl')}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <select
              className="rounded-xl border border-line bg-paper px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as ChartType)}
            >
              {CHART_TYPE_LIST.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <Button
              onClick={() =>
                void onCreate({
                  list_id: list.id,
                  name,
                  chart_type: type,
                  config: { dateFieldId, valueFieldId, aggregation: type === 'timeline' ? 'count' : 'avg' },
                })
              }
            >
              {t('common.save')}
            </Button>
          </div>
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
  const [panel, setPanel] = useState<'general' | 'fields' | 'share' | 'flow' | 'io'>('general')
  const [userQuery, setUserQuery] = useState('')
  const [found, setFound] = useState<Profile[]>([])
  const [targetId, setTargetId] = useState('')
  const [mapFrom, setMapFrom] = useState('')
  const [mapTo, setMapTo] = useState('')

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
            ['fields', t('settingsModal.fields')],
            ['share', t('settingsModal.share')],
            ['flow', t('settingsModal.flow')],
            ['io', t('settingsModal.io')],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`rounded-full px-3 py-1 text-sm ${panel === id ? 'bg-ink text-paper' : 'bg-black/5'}`}
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
          found={found}
          onList={onChange}
          onQuery={async (q) => {
            setUserQuery(q)
            setFound(await searchProfiles(q))
          }}
          onSave={() => void save({ visibility: list.visibility, edit_mode: list.edit_mode })}
          onReload={onReload}
        />
      ) : null}

      {panel === 'flow' ? (
        <div className="space-y-3">
          <Hint title={t('settingsModal.flowHint')} example={t('settingsModal.flowEx')} />
          <FieldWrap label={t('settingsModal.targetId')}>
            <Input value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="uuid" />
          </FieldWrap>
          <div className="grid grid-cols-2 gap-2">
            <Input value={mapFrom} onChange={(e) => setMapFrom(e.target.value)} placeholder={t('settingsModal.fieldFrom')} />
            <Input value={mapTo} onChange={(e) => setMapTo(e.target.value)} placeholder={t('settingsModal.fieldTo')} />
          </div>
          <Button
            variant="soft"
            onClick={() => {
              if (!targetId) return
              const action: TransferAction = {
                id: crypto.randomUUID(),
                label: t('settingsModal.move'),
                targetListId: targetId,
                fieldMap: mapFrom && mapTo ? { [mapFrom]: mapTo } : {},
                deleteSource: true,
              }
              onChange({
                ...list,
                settings: {
                  ...list.settings,
                  transferActions: [...(list.settings?.transferActions ?? []), action],
                },
              })
            }}
          >
            {t('settingsModal.addButton')}
          </Button>
          <ul className="text-sm">
            {(list.settings?.transferActions ?? []).map((a) => (
              <li key={a.id} className="flex justify-between py-1">
                {a.label}
                <button
                  type="button"
                  className="text-rose-700"
                  onClick={() =>
                    onChange({
                      ...list,
                      settings: {
                        ...list.settings,
                        transferActions: (list.settings?.transferActions ?? []).filter((x) => x.id !== a.id),
                      },
                    })
                  }
                >
                  {t('settingsModal.remove')}
                </button>
              </li>
            ))}
          </ul>
          <Button onClick={() => void save({ settings: list.settings })}>{t('settingsModal.saveFlows')}</Button>
        </div>
      ) : null}

      {panel === 'io' ? (
        <ImportExport list={list} />
      ) : null}
    </Modal>
  )
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
  return (
    <div className="space-y-4">
      <Hint title={t('settingsModal.shareHint')} example={t('settingsModal.shareEx')} />
      <FieldWrap label={t('settingsModal.whoSees')}>
        <select
          className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm"
          value={list.visibility}
          onChange={(e) => onList({ ...list, visibility: e.target.value as ListRow['visibility'] })}
        >
          {(['private', 'invite', 'friends', 'public'] as const).map((k) => (
            <option key={k} value={k}>
              {t(`visibility.${k}`)}
            </option>
          ))}
        </select>
      </FieldWrap>
      <FieldWrap label={t('settingsModal.whoEdits')}>
        <select
          className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm"
          value={list.edit_mode}
          onChange={(e) => onList({ ...list, edit_mode: e.target.value as ListRow['edit_mode'] })}
        >
          {(['owner', 'selected', 'friends', 'proposals'] as const).map((k) => (
            <option key={k} value={k}>
              {t(`editMode.${k}`)}
            </option>
          ))}
        </select>
      </FieldWrap>
      <Button onClick={onSave}>{t('settingsModal.saveAccess')}</Button>

      <FieldWrap label={t('settingsModal.inviteByName')}>
        <Input value={userQuery} onChange={(e) => void onQuery(e.target.value)} placeholder="username" />
      </FieldWrap>
      <ul className="space-y-1">
        {found.map((p) => (
          <li key={p.id} className="flex items-center justify-between text-sm">
            @{p.username}
            <Button
              size="sm"
              variant="soft"
              onClick={async () => {
                if (!user) return
                await createInvite({
                  list_id: list.id,
                  inviter_id: user.id,
                  invitee_id: p.id,
                  role: list.edit_mode === 'proposals' ? 'proposer' : 'editor',
                })
                await onReload()
              }}
            >
              {t('settingsModal.invite')}
            </Button>
          </li>
        ))}
      </ul>

      <h3 className="text-sm font-medium">{t('settingsModal.members')}</h3>
      <ul className="space-y-2 text-sm">
        {members.map((m) => (
          <li key={m.user_id} className="flex items-center justify-between">
            @{m.profile?.username ?? m.user_id}
            <span className="flex gap-2">
              <select
                className="rounded-lg border border-line px-2 py-1"
                value={m.role}
                onChange={(e) => void updateMemberRole(list.id, m.user_id, e.target.value as ListMember['role']).then(onReload)}
              >
                <option value="viewer">{t('settingsModal.viewer')}</option>
                <option value="editor">{t('settingsModal.editor')}</option>
                <option value="proposer">{t('settingsModal.proposer')}</option>
              </select>
              <button type="button" onClick={() => void removeMember(list.id, m.user_id).then(onReload)}>
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
              {p.profile?.username} · {p.action}
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

function ImportExport({ list }: { list: ListRow }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const { t } = usePrefs()
  return (
    <div className="space-y-4">
      <Hint title={t('settingsModal.ioHint')} example={t('settingsModal.ioEx')} />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="soft"
          onClick={async () => {
            const items = await fetchItems(list.id)
            downloadText(`${list.title}.json`, itemsToJson({ title: list.title, schema: list.schema }, items), 'application/json')
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
                for (const row of parsed.items) {
                  await createItem({
                    list_id: list.id,
                    values: row.values,
                    position: Date.now() / 1000,
                    created_by: user.id,
                  })
                }
              } else {
                const rows = parseCsv(text)
                const mapping: Record<number, string> = {}
                list.schema.fields.forEach((f, i) => {
                  mapping[i + 1] = f.id
                })
                const items = mapCsvToItems(rows, list.schema.fields, mapping)
                for (const row of items) {
                  await createItem({
                    list_id: list.id,
                    values: row.values,
                    position: Date.now() / 1000,
                    created_by: user.id,
                  })
                }
              }
              toast(t('settingsModal.imported'))
            } catch (err) {
              toast(err instanceof Error ? err.message : t('settingsModal.importFail'), 'err')
            }
          }}
        />
      </FieldWrap>
    </div>
  )
}
