import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import type {
  FieldDef,
  ItemRating,
  ItemRow,
  ListRow,
  Profile,
} from '../../types/domain'
import { FieldWrap, Input, Textarea } from '../ui/Input'
import {
  fetchFriendships,
  fetchItems,
  fetchList,
  fetchMembers,
  searchProfiles,
  signedFileUrl,
  uploadListFile,
  deleteRating,
  upsertRating,
} from '../../services/api'
import {
  asDateInputValue,
  asDatetimeInputValue,
  cn,
  titleFromValues,
} from '../../lib/cn'
import {
  emptySublistRow,
  isPeakSpanSublist,
  subfieldAsDef,
} from '../../lib/fields'
import { summarizeSublist } from '../../lib/display'
import { resolveCoverFieldId } from '../../lib/files'
import { refId, refIds, refLabel } from '../../lib/refs'
import { otherFriend } from '../../lib/friends'
import Avatar from '../ui/Avatar'
import CoverSlot from '../lists/CoverSlot'
import { useAuth } from '../../context/AuthContext'
import { usePrefs } from '../../context/PrefsContext'

interface Props {
  field: FieldDef
  value: unknown
  onChange: (value: unknown) => void
  disabled?: boolean
  listId?: string
  userId?: string
  itemId?: string
  ratings?: ItemRating[]
  onRatingChange?: (row: ItemRating, action?: 'upsert' | 'delete') => void
  error?: string
}

function fieldHint(field: FieldDef, extra?: string) {
  return [field.description, extra].filter(Boolean).join(' · ') || undefined
}

export default function FieldInput(props: Props) {
  const { field, value, onChange, disabled, error } = props
  const { t } = usePrefs()
  const cfg = field.config ?? {}

  switch (field.type) {
    case 'textarea':
      return (
        <FieldWrap label={field.name} error={error} hint={fieldHint(field)}>
          <Textarea
            value={String(value ?? '')}
            maxLength={cfg.maxLength}
            placeholder={cfg.placeholder}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
        </FieldWrap>
      )
    case 'number':
    case 'integer':
      return (
        <FieldWrap label={field.name} error={error} hint={fieldHint(field)}>
          <Input
            type="number"
            step={field.type === 'integer' ? 1 : 'any'}
            min={cfg.min}
            max={cfg.max}
            placeholder={cfg.placeholder}
            value={value == null ? '' : String(value)}
            disabled={disabled}
            onChange={(e) =>
              onChange(e.target.value === '' ? null : Number(e.target.value))
            }
          />
        </FieldWrap>
      )
    case 'date':
    case 'datetime':
      return (
        <FieldWrap label={field.name} error={error} hint={fieldHint(field)}>
          <Input
            type={field.type === 'date' ? 'date' : 'datetime-local'}
            value={
              field.type === 'date'
                ? asDateInputValue(value)
                : asDatetimeInputValue(value)
            }
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
        </FieldWrap>
      )
    case 'boolean':
    case 'checkbox':
      return (
        <label className="block text-sm">
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(value)}
              disabled={disabled}
              onChange={(e) => onChange(e.target.checked)}
            />
            {field.name}
          </span>
          {field.description ? (
            <span className="mt-1 block text-xs text-muted">
              {field.description}
            </span>
          ) : null}
        </label>
      )
    case 'select': {
      const selected = (cfg.options ?? []).find(
        (o) => o.value === String(value ?? ''),
      )
      return (
        <FieldWrap label={field.name} error={error} hint={fieldHint(field)}>
          <select
            className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm"
            value={String(value ?? '')}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">—</option>
            {(cfg.options ?? []).map((o) => (
              <option key={o.value} value={o.value} title={o.description}>
                {o.label}
              </option>
            ))}
          </select>
          {selected?.description ? (
            <p className="mt-1 text-xs text-muted">{selected.description}</p>
          ) : null}
        </FieldWrap>
      )
    }
    case 'multiselect':
    case 'tags': {
      const selected = Array.isArray(value) ? (value as string[]) : []
      return (
        <FieldWrap
          label={field.name}
          error={error}
          hint={fieldHint(
            field,
            field.type === 'tags' ? t('fields.tagEnter') : undefined,
          )}
        >
          {field.type === 'tags' ? (
            <TagEditor
              value={selected}
              disabled={disabled}
              onChange={onChange}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {(cfg.options ?? []).map((o) => {
                const on = selected.includes(o.value)
                return (
                  <button
                    key={o.value}
                    type="button"
                    disabled={disabled}
                    title={o.description}
                    onClick={() =>
                      onChange(
                        on
                          ? selected.filter((v) => v !== o.value)
                          : [...selected, o.value],
                      )
                    }
                    className={cn(
                      'rounded-full px-3 py-1 text-xs ring-1 ring-line',
                      on ? 'bg-accent text-on-accent ring-accent' : 'bg-paper',
                    )}
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>
          )}
        </FieldWrap>
      )
    }
    case 'rating':
      return (
        <FieldWrap label={field.name} error={error} hint={fieldHint(field)}>
          <Stars
            max={cfg.ratingMax ?? 10}
            value={Number(value ?? 0)}
            disabled={disabled}
            onChange={onChange}
          />
        </FieldWrap>
      )
    case 'multi_rating':
    case 'community_rating':
      return <MultiRating {...props} />
    case 'color': {
      const raw = String(value ?? '')
      const hex = /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : '#6d28d9'
      return (
        <FieldWrap label={field.name} error={error} hint={fieldHint(field)}>
          <div className="flex items-center gap-3">
            <input
              type="color"
              className="h-10 w-12 shrink-0 cursor-pointer rounded-xl border border-line bg-paper"
              value={hex}
              disabled={disabled}
              onChange={(e) => onChange(e.target.value)}
            />
            <Input
              value={raw}
              placeholder="#6d28d9"
              disabled={disabled}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        </FieldWrap>
      )
    }
    case 'url':
    case 'email':
    case 'text':
      return (
        <FieldWrap label={field.name} error={error} hint={fieldHint(field)}>
          <Input
            type={
              field.type === 'email'
                ? 'email'
                : field.type === 'url'
                  ? 'url'
                  : 'text'
            }
            value={String(value ?? '')}
            minLength={cfg.minLength}
            maxLength={cfg.maxLength}
            placeholder={cfg.placeholder}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
        </FieldWrap>
      )
    case 'image':
    case 'file':
      return <FileField {...props} />
    case 'sublist':
      return <SublistField {...props} />
    case 'relation':
      return <RelationField {...props} />
    case 'user':
      return <UserField {...props} />
    default:
      return (
        <FieldWrap label={field.name} error={error} hint={fieldHint(field)}>
          <Input
            value={String(value ?? '')}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
        </FieldWrap>
      )
  }
}

function Stars({
  max,
  value,
  onChange,
  disabled,
}: {
  max: number
  value: number
  onChange: (n: number) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-0.5">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className="p-0.5"
          aria-label={`${n}`}
        >
          <Star
            size={18}
            className={
              n <= value ? 'fill-amber-400 text-amber-400' : 'text-line'
            }
          />
        </button>
      ))}
      <span className="ml-2 text-xs text-muted">
        {value || '—'}/{max}
      </span>
    </div>
  )
}

function ratingName(
  row: ItemRating,
  guest: string,
  me?: { id: string; username: string; display_name: string } | null,
): string {
  return (
    row.profile?.username ||
    row.profile?.display_name ||
    (me && row.user_id === me.id ? me.username || me.display_name : '') ||
    guest
  )
}

function ratingsForField(rows: ItemRating[], fieldId: string, itemId?: string): ItemRating[] {
  const filtered = rows.filter((row) => row.field_id === fieldId && (!itemId || row.item_id === itemId))
  const byUser = new Map<string, ItemRating>()
  for (const row of filtered) {
    const prev = byUser.get(row.user_id)
    if (!prev || row.updated_at > prev.updated_at) byUser.set(row.user_id, row)
  }
  return [...byUser.values()]
}

function sameRating(row: ItemRating, fieldId: string, userId: string, itemId?: string) {
  return row.field_id === fieldId && row.user_id === userId && (!itemId || row.item_id === itemId)
}

type PendingRating =
  | { kind: 'upsert'; row: ItemRating }
  | { kind: 'delete'; row: Pick<ItemRating, 'field_id' | 'user_id' | 'item_id'> }

function overlayRating(ratings: ItemRating[], pending: PendingRating): ItemRating[] {
  if (pending.kind === 'delete') {
    return ratings.filter(
      (row) => !sameRating(row, pending.row.field_id, pending.row.user_id, pending.row.item_id),
    )
  }
  const idx = ratings.findIndex((row) =>
    sameRating(row, pending.row.field_id, pending.row.user_id, pending.row.item_id),
  )
  if (idx >= 0) {
    return ratings.map((row, i) => (i === idx ? { ...row, ...pending.row } : row))
  }
  return [...ratings, pending.row]
}

function MultiRating({
  field,
  itemId,
  userId,
  ratings = [],
  disabled,
  onRatingChange,
}: Props) {
  const { t } = usePrefs()
  const { profile } = useAuth()
  const [pending, setPending] = useState<PendingRating | null>(null)
  const local =
    pending && pending.row.field_id === field.id && pending.row.item_id === itemId
      ? overlayRating(ratings, pending)
      : ratings

  const all = ratingsForField(local, field.id, itemId)
  const mine = userId ? all.find((row) => row.user_id === userId) : undefined
  const avg = all.length ? all.reduce((s, r) => s + Number(r.value), 0) / all.length : 0
  const max = field.config?.ratingMax ?? 10
  const mineProfile = mine?.profile ?? (profile && profile.id === userId ? profile : undefined)

  const apply = (n: number) => {
    if (!itemId || !userId) return
    const current = Number(mine?.value ?? 0)
    if (mine && n === current) {
      setPending({ kind: 'delete', row: { field_id: field.id, user_id: userId, item_id: itemId } })
      void deleteRating({ item_id: itemId, field_id: field.id, user_id: userId })
        .then(() => onRatingChange?.(mine, 'delete'))
        .catch(() => setPending(null))
      return
    }
    const next: ItemRating = {
      item_id: itemId,
      field_id: field.id,
      user_id: userId,
      value: n,
      created_at: mine?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profile: mineProfile,
    }
    setPending({ kind: 'upsert', row: next })
    void upsertRating({ item_id: itemId, field_id: field.id, user_id: userId, value: n })
      .then(() => onRatingChange?.(next, 'upsert'))
      .catch(() => setPending(null))
  }

  return (
    <FieldWrap
      label={field.name}
      hint={fieldHint(
        field,
        [
          t(field.type === 'community_rating' ? 'fields.communityHint' : 'fields.multiHint'),
          userId && !disabled ? t('fields.changeRating') : null,
        ]
          .filter(Boolean)
          .join(' '),
      )}
    >
      <Stars
        max={max}
        value={Number(mine?.value ?? 0)}
        disabled={disabled || !itemId || !userId}
        onChange={apply}
      />
      <p className="mt-2 text-xs text-muted">
        {t('fields.avg', { avg: avg ? avg.toFixed(1) : '—', n: all.length })}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {all.map((r) => (
          <span
            key={`${r.item_id}:${r.field_id}:${r.user_id}`}
            className={cn(
              'inline-flex items-center gap-1 rounded-full bg-ink/5 px-2 py-0.5 text-xs',
              r.user_id === userId && 'ring-1 ring-accent',
            )}
          >
            <Avatar
              name={
                r.profile?.display_name ||
                r.profile?.username ||
                (r.user_id === userId ? mineProfile?.display_name || mineProfile?.username : undefined) ||
                '?'
              }
              url={r.profile?.avatar_url ?? (r.user_id === userId ? mineProfile?.avatar_url : null)}
              size={16}
            />
            {ratingName(r, t('fields.guest'), mineProfile)} · {r.value}
          </span>
        ))}
      </div>
    </FieldWrap>
  )
}

function FileField({
  field,
  value,
  onChange,
  disabled,
  listId,
  userId,
}: Props) {
  const { t } = usePrefs()
  const meta = (value && typeof value === 'object' ? value : null) as {
    path?: string
    name?: string
    mime?: string
  } | null
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const path = meta?.path
    if (!path) return
    let cancelled = false
    void signedFileUrl(path).then((next) => {
      if (!cancelled) setUrl(next)
    })
    return () => {
      cancelled = true
    }
  }, [meta?.path])

  return (
    <FieldWrap
      label={field.name}
      error={err ?? undefined}
      hint={fieldHint(field, t('fields.fileHint'))}
    >
      {meta?.path && url && field.type === 'image' ? (
        <img
          src={url}
          alt=""
          className="mb-2 h-28 w-28 rounded-xl object-cover"
        />
      ) : null}
      {meta?.name ? (
        <p className="mb-2 text-xs text-muted">{meta.name}</p>
      ) : null}
      <input
        type="file"
        disabled={disabled || busy || !listId || !userId}
        accept={(
          field.config?.accept ??
          (field.type === 'image'
            ? ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
            : undefined)
        )?.join(',')}
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file || !listId || !userId) return
          setBusy(true)
          setErr(null)
          try {
            const uploaded = await uploadListFile({
              userId,
              listId,
              file,
              imagesOnly: field.type === 'image',
              maxMb: field.config?.maxSizeMb,
            })
            onChange(uploaded)
          } catch (ex) {
            setErr(ex instanceof Error ? ex.message : t('fields.uploadFail'))
          } finally {
            setBusy(false)
          }
        }}
      />
    </FieldWrap>
  )
}

function TagEditor({
  value,
  onChange,
  disabled,
}: {
  value: string[]
  onChange: (v: unknown) => void
  disabled?: boolean
}) {
  const [draft, setDraft] = useState('')
  const { t } = usePrefs()
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1">
        {value.map((tag) => (
          <button
            key={tag}
            type="button"
            disabled={disabled}
            className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent"
            onClick={() => onChange(value.filter((t) => t !== tag))}
          >
            {tag} ×
          </button>
        ))}
      </div>
      <Input
        value={draft}
        disabled={disabled}
        placeholder={t('fields.tagPh')}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            const t = draft.trim()
            if (t && !value.includes(t)) onChange([...value, t])
            setDraft('')
          }
        }}
      />
    </div>
  )
}

function SublistField({
  field,
  value,
  onChange,
  disabled,
  listId,
  userId,
}: Props) {
  const { t } = usePrefs()
  const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : []
  const sub = field.config?.subfields ?? []
  const summary = isPeakSpanSublist(field)
    ? summarizeSublist(field, value)
    : null
  return (
    <FieldWrap
      label={field.name}
      hint={fieldHint(field, t('fields.nestedHint'))}
    >
      <div className="space-y-3">
        {summary?.peakLabel ? (
          <p className="bg-ink/5 rounded-xl px-3 py-2 text-xs text-muted">
            {summary.text}
          </p>
        ) : null}
        {rows.map((row, idx) => (
          <div
            key={idx}
            className="space-y-3 rounded-xl border border-line p-3"
          >
            <p className="text-xs font-medium text-muted">
              {t('fields.sublistRow', { n: idx + 1 })}
            </p>
            {sub.map((sf) => (
              <FieldInput
                key={sf.id}
                field={subfieldAsDef(sf)}
                value={row[sf.id]}
                disabled={disabled}
                listId={listId}
                userId={userId}
                onChange={(nextValue) => {
                  onChange(
                    rows.map((current, i) =>
                      i === idx ? { ...current, [sf.id]: nextValue } : current,
                    ),
                  )
                }}
              />
            ))}
            {!disabled ? (
              <button
                type="button"
                className="text-xs text-rose-700"
                onClick={() => onChange(rows.filter((_, i) => i !== idx))}
              >
                {t('fields.delRow')}
              </button>
            ) : null}
          </div>
        ))}
        {!sub.length ? (
          <p className="text-xs text-muted">{t('fields.nestedHint')}</p>
        ) : null}
        {!disabled ? (
          <button
            type="button"
            className="text-sm text-accent"
            onClick={() => onChange([...rows, emptySublistRow(sub)])}
          >
            {t('fields.addRow')}
          </button>
        ) : null}
      </div>
    </FieldWrap>
  )
}

function RelationField({ field, value, onChange, disabled, error }: Props) {
  const { t } = usePrefs()
  const relatedId = field.config?.relatedListId
  const multi = Boolean(field.config?.allowMultiple)
  const showCover = (field.config?.relationDisplay ?? 'title') !== 'title'
  const [rows, setRows] = useState<ItemRow[]>([])
  const [list, setList] = useState<ListRow | null>(null)

  useEffect(() => {
    if (!relatedId) return
    let cancelled = false
    void Promise.all([fetchList(relatedId), fetchItems(relatedId)]).then(
      ([nextList, items]) => {
        if (cancelled) return
        setList(nextList)
        setRows(items)
      },
    )
    return () => {
      cancelled = true
    }
  }, [relatedId])

  if (!relatedId) {
    return (
      <FieldWrap
        label={field.name}
        error={error}
        hint={fieldHint(field, t('fields.noRelated'))}
      >
        <p className="text-sm text-muted">{t('fields.noRelated')}</p>
      </FieldWrap>
    )
  }

  const coverFieldId = list ? resolveCoverFieldId(list.schema) : undefined
  const coverField = coverFieldId
    ? list?.schema.fields.find((f) => f.id === coverFieldId)
    : undefined

  const options = rows.map((item) => ({
    id: item.id,
    title: titleFromValues(item.values, list?.schema.titleFieldId),
    cover: coverFieldId ? item.values[coverFieldId] : null,
  }))

  const pick = (id: string) => {
    const hit = options.find((row) => row.id === id)
    return hit ? { id: hit.id, title: hit.title } : null
  }

  if (multi || showCover) {
    const selected = new Set(refIds(value))
    return (
      <FieldWrap label={field.name} error={error} hint={fieldHint(field)}>
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
          {options.map((row) => {
            const checked = selected.has(row.id)
            return (
              <label
                key={row.id}
                className={cn(
                  'hover:bg-ink/5 flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-sm',
                  checked && 'bg-accent-soft/60',
                )}
              >
                <input
                  type={multi ? 'checkbox' : 'radio'}
                  name={`relation-${field.id}`}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => {
                    if (multi) {
                      const current = Array.isArray(value)
                        ? value
                        : refIds(value)
                            .map((id) => pick(id))
                            .filter(Boolean)
                      if (checked) {
                        onChange(
                          current.filter((item) => refId(item) !== row.id),
                        )
                      } else {
                        const next = pick(row.id)
                        onChange(next ? [...current, next] : current)
                      }
                    } else {
                      onChange(checked ? null : pick(row.id))
                    }
                  }}
                />
                {showCover ? (
                  <CoverSlot
                    field={coverField}
                    value={row.cover}
                    alt={row.title}
                    className="h-8 w-8 shrink-0 rounded-md"
                    fallback={<span className="text-[10px] text-muted">·</span>}
                  />
                ) : null}
                <span className="min-w-0 truncate">{row.title}</span>
              </label>
            )
          })}
          {!options.length ? (
            <p className="text-xs text-muted">{t('fields.pickItem')}</p>
          ) : null}
        </div>
      </FieldWrap>
    )
  }

  return (
    <FieldWrap label={field.name} error={error} hint={fieldHint(field)}>
      <select
        className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm"
        value={refId(value)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value ? pick(e.target.value) : null)}
      >
        <option value="">{t('fields.pickItem')}</option>
        {options.map((row) => (
          <option key={row.id} value={row.id}>
            {row.title}
          </option>
        ))}
      </select>
    </FieldWrap>
  )
}

function UserField({
  field,
  value,
  onChange,
  disabled,
  error,
  listId,
  userId,
}: Props) {
  const { t } = usePrefs()
  const { profile } = useAuth()
  const multi = Boolean(field.config?.allowMultiple)
  const [people, setPeople] = useState<Profile[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    void Promise.all([
      listId ? fetchMembers(listId).catch(() => []) : Promise.resolve([]),
      fetchFriendships(userId).catch(() => []),
    ]).then(([members, friends]) => {
      if (cancelled) return
      const map = new Map<string, Profile>()
      if (profile) map.set(profile.id, profile)
      for (const member of members) {
        if (member.profile) map.set(member.profile.id, member.profile)
      }
      for (const row of friends.filter(
        (friend) => friend.status === 'accepted',
      )) {
        const other = otherFriend(userId, row)
        if (other) map.set(other.id, other)
      }
      setPeople([...map.values()])
    })
    return () => {
      cancelled = true
    }
  }, [listId, profile, userId])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    let cancelled = false
    void searchProfiles(q).then((rows) => {
      if (cancelled) return
      setPeople((prev) => {
        const map = new Map(prev.map((row) => [row.id, row]))
        for (const row of rows) map.set(row.id, row)
        return [...map.values()]
      })
    })
    return () => {
      cancelled = true
    }
  }, [query])

  const pick = (id: string) => {
    const hit = people.find((row) => row.id === id)
    return hit
      ? {
          id: hit.id,
          name: hit.display_name || hit.username,
          username: hit.username,
        }
      : null
  }

  const labelOf = (row: Profile) => row.display_name || `@${row.username}`

  if (multi) {
    const selected = new Set(refIds(value))
    return (
      <FieldWrap label={field.name} error={error} hint={fieldHint(field)}>
        <Input
          value={query}
          disabled={disabled}
          placeholder={t('fields.pickUser')}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
          {people.map((row) => (
            <label key={row.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.has(row.id)}
                disabled={disabled}
                onChange={(e) => {
                  const current = Array.isArray(value)
                    ? value
                    : refIds(value).map((id) => pick(id) ?? { id, name: id })
                  if (e.target.checked) {
                    const next = pick(row.id)
                    onChange(next ? [...current, next] : current)
                  } else {
                    onChange(current.filter((item) => refId(item) !== row.id))
                  }
                }}
              />
              <span className="truncate">{labelOf(row)}</span>
            </label>
          ))}
        </div>
      </FieldWrap>
    )
  }

  const currentId = refId(value)
  const currentLabel = refLabel(value)

  return (
    <FieldWrap label={field.name} error={error} hint={fieldHint(field)}>
      <Input
        value={query}
        disabled={disabled}
        placeholder={currentLabel || t('fields.pickUser')}
        onChange={(e) => setQuery(e.target.value)}
      />
      <select
        className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm"
        value={currentId}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value ? pick(e.target.value) : null)}
      >
        <option value="">{t('fields.pickUser')}</option>
        {people.map((row) => (
          <option key={row.id} value={row.id}>
            {labelOf(row)}
          </option>
        ))}
      </select>
    </FieldWrap>
  )
}
