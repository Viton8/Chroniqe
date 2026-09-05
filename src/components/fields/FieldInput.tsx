import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import type { FieldDef, ItemRating } from '../../types/domain'
import { FieldWrap, Input, Textarea } from '../ui/Input'
import { signedFileUrl, uploadListFile, upsertRating } from '../../services/api'
import { cn } from '../../lib/cn'
import Avatar from '../ui/Avatar'
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
  error?: string
}

export default function FieldInput(props: Props) {
  const { field, value, onChange, disabled, error } = props
  const { t } = usePrefs()
  const cfg = field.config ?? {}

  switch (field.type) {
    case 'textarea':
      return (
        <FieldWrap label={field.name} error={error}>
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
        <FieldWrap label={field.name} error={error}>
          <Input
            type="number"
            step={field.type === 'integer' ? 1 : 'any'}
            min={cfg.min}
            max={cfg.max}
            value={value == null ? '' : String(value)}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          />
        </FieldWrap>
      )
    case 'date':
    case 'datetime':
      return (
        <FieldWrap label={field.name} error={error}>
          <Input
            type={field.type === 'date' ? 'date' : 'datetime-local'}
            value={String(value ?? '')}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
        </FieldWrap>
      )
    case 'boolean':
    case 'checkbox':
      return (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(value)}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
          />
          {field.name}
        </label>
      )
    case 'select':
      return (
        <FieldWrap label={field.name} error={error}>
          <select
            className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm"
            value={String(value ?? '')}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">—</option>
            {(cfg.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FieldWrap>
      )
    case 'multiselect':
    case 'tags': {
      const selected = Array.isArray(value) ? (value as string[]) : []
      return (
        <FieldWrap label={field.name} error={error} hint={field.type === 'tags' ? t('fields.tagEnter') : undefined}>
          {field.type === 'tags' ? (
            <TagEditor value={selected} disabled={disabled} onChange={onChange} />
          ) : (
            <div className="flex flex-wrap gap-2">
              {(cfg.options ?? []).map((o) => {
                const on = selected.includes(o.value)
                return (
                  <button
                    key={o.value}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      onChange(on ? selected.filter((v) => v !== o.value) : [...selected, o.value])
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
        <FieldWrap label={field.name} error={error}>
          <Stars
            max={cfg.ratingMax ?? 10}
            value={Number(value ?? 0)}
            disabled={disabled}
            onChange={onChange}
          />
        </FieldWrap>
      )
    case 'multi_rating':
      return <MultiRating {...props} />
    case 'url':
    case 'email':
    case 'text':
    case 'color':
      return (
        <FieldWrap label={field.name} error={error}>
          <Input
            type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : field.type === 'color' ? 'color' : 'text'}
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
    default:
      return (
        <FieldWrap label={field.name} error={error}>
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
            className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-line'}
          />
        </button>
      ))}
      <span className="ml-2 text-xs text-muted">{value || '—'}/{max}</span>
    </div>
  )
}

function MultiRating({
  field,
  itemId,
  userId,
  ratings = [],
  disabled,
}: Props) {
  const { t } = usePrefs()
  const mine = ratings.find((r) => r.field_id === field.id && r.user_id === userId)
  const all = ratings.filter((r) => r.field_id === field.id)
  const avg = all.length ? all.reduce((s, r) => s + Number(r.value), 0) / all.length : 0
  const max = field.config?.ratingMax ?? 10

  return (
    <FieldWrap
      label={field.name}
      hint={t('fields.multiHint')}
    >
      <Stars
        max={max}
        value={Number(mine?.value ?? 0)}
        disabled={disabled || !itemId || !userId}
        onChange={(n) => {
          if (!itemId || !userId) return
          void upsertRating({ item_id: itemId, field_id: field.id, user_id: userId, value: n })
        }}
      />
      <p className="mt-2 text-xs text-muted">
        {t('fields.avg', { avg: avg ? avg.toFixed(1) : '—', n: all.length })}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {all.map((r) => (
          <span key={r.user_id} className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-xs">
            <Avatar name={r.profile?.display_name || r.profile?.username || '?'} url={r.profile?.avatar_url} size={16} />
            {r.profile?.username ?? t('fields.guest')} · {r.value}
          </span>
        ))}
      </div>
    </FieldWrap>
  )
}

function FileField({ field, value, onChange, disabled, listId, userId }: Props) {
  const { t } = usePrefs()
  const meta = (value && typeof value === 'object' ? value : null) as
    | { path?: string; name?: string; mime?: string }
    | null
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
    <FieldWrap label={field.name} error={err ?? undefined} hint={t('fields.fileHint')}>
      {meta?.path && url && field.type === 'image' ? (
        <img src={url} alt="" className="mb-2 h-28 w-28 rounded-xl object-cover" />
      ) : null}
      {meta?.name ? <p className="mb-2 text-xs text-muted">{meta.name}</p> : null}
      <input
        type="file"
        disabled={disabled || busy || !listId || !userId}
        accept={(field.config?.accept ?? (field.type === 'image' ? ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] : undefined))?.join(',')}
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

function SublistField({ field, value, onChange, disabled }: Props) {
  const { t } = usePrefs()
  const rows = Array.isArray(value) ? (value as Record<string, unknown>[]) : []
  const sub = field.config?.subfields ?? []
  return (
    <FieldWrap
      label={field.name}
      hint={t('fields.nestedHint')}
    >
      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div key={idx} className="rounded-xl border border-line p-3">
            {sub.map((sf) => (
              <div key={sf.id} className="mb-2">
                <Input
                  placeholder={sf.name}
                  value={String(row[sf.id] ?? '')}
                  disabled={disabled}
                  onChange={(e) => {
                    const next = rows.map((r, i) =>
                      i === idx ? { ...r, [sf.id]: e.target.value } : r,
                    )
                    onChange(next)
                  }}
                />
              </div>
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
        {!disabled ? (
          <button
            type="button"
            className="text-sm text-accent"
            onClick={() => onChange([...rows, {}])}
          >
            {t('fields.addRow')}
          </button>
        ) : null}
      </div>
    </FieldWrap>
  )
}
