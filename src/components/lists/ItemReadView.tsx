import { ratingInputLocked, usesItemRatings } from '../../lib/ratings'
import type { FieldDef, ItemRating, ItemRow, ListSchema } from '../../types/domain'
import { isEmptyValue } from '../../lib/validation'
import { displayValue } from '../../lib/display'
import { fileMeta, hasCoverVisual, httpUrl } from '../../lib/files'
import { subfieldAsDef } from '../../lib/fields'
import { cn } from '../../lib/cn'
import CoverSlot from './CoverSlot'
import FileThumb from './FileThumb'
import RelationValue from './RelationValue'
import StyledValue from './StyledValue'
import FieldInput from '../fields/FieldInput'

export default function ItemReadView({
  schema,
  item,
  ratings,
  userId,
  onRatingChange,
  canEdit,
}: {
  schema: ListSchema
  item: ItemRow
  ratings: ItemRating[]
  userId?: string
  onRatingChange?: (row: ItemRating, action?: 'upsert' | 'delete') => void
  canEdit?: boolean
}) {
  const titleId = schema.titleFieldId ?? schema.fields[0]?.id
  const coverId =
    schema.imageFieldId ??
    schema.fields.find((field) => field.type === 'image' || field.type === 'file')?.id
  const coverField = coverId ? schema.fields.find((field) => field.id === coverId) : undefined
  const coverValue = coverId ? item.values[coverId] : undefined
  const fields = schema.fields.filter((field) => {
    if (field.hidden) return false
    if (field.id === titleId && field.type !== 'textarea') return false
    if (field.id === coverId && (field.type === 'image' || field.type === 'file')) return false
    if (usesItemRatings(field)) return true
    return !isEmptyValue(item.values[field.id])
  })

  return (
    <div className="space-y-5">
      {coverField && hasCoverVisual(coverValue) ? (
        <CoverSlot
          field={coverField}
          value={coverValue}
          className="max-h-72 w-full rounded-2xl object-cover"
          alt=""
        />
      ) : null}
      <div className="space-y-4">
        {fields.map((field) => (
          <ReadField
            key={field.id}
            field={field}
            item={item}
            schema={schema}
            ratings={ratings}
            userId={userId}
            canEdit={canEdit}
            onRatingChange={onRatingChange}
          />
        ))}
      </div>
    </div>
  )
}

function ReadField({
  field,
  item,
  schema,
  ratings,
  userId,
  canEdit,
  onRatingChange,
}: {
  field: FieldDef
  item: ItemRow
  schema: ListSchema
  ratings: ItemRating[]
  userId?: string
  canEdit?: boolean
  onRatingChange?: (row: ItemRating, action?: 'upsert' | 'delete') => void
}) {
  const value = item.values[field.id]

  if (usesItemRatings(field)) {
    return (
      <FieldInput
        field={field}
        value={value}
        listId={item.list_id}
        userId={userId}
        itemId={item.id}
        ratings={ratings}
        disabled={ratingInputLocked(field, { userId, canEdit: Boolean(canEdit) })}
        onRatingChange={onRatingChange}
        onChange={() => undefined}
      />
    )
  }

  if (field.type === 'textarea') {
    const text = String(value ?? '')
    if (!text) return null
    return (
      <section>
        <h3 className="mb-1.5 text-sm font-medium">{field.name}</h3>
        <p className="whitespace-pre-wrap text-base leading-relaxed">{text}</p>
      </section>
    )
  }

  if (field.type === 'url') {
    const href = httpUrl(value)
    return (
      <section>
        <h3 className="mb-1.5 text-sm font-medium">{field.name}</h3>
        {href ? (
          <a href={href} className="break-all text-accent underline" target="_blank" rel="noreferrer">
            {href}
          </a>
        ) : (
          <p className="text-sm">{displayValue(field, value)}</p>
        )}
      </section>
    )
  }

  if (field.type === 'email') {
    const mail = String(value ?? '')
    return (
      <section>
        <h3 className="mb-1.5 text-sm font-medium">{field.name}</h3>
        <a href={`mailto:${mail}`} className="text-accent underline">
          {mail}
        </a>
      </section>
    )
  }

  if (field.type === 'image' || field.type === 'file') {
    const meta = fileMeta(value)
    return (
      <section>
        <h3 className="mb-1.5 text-sm font-medium">{field.name}</h3>
        <div className="flex items-center gap-3">
          <FileThumb value={value} className="h-24 w-20 rounded-xl" alt="" />
          {meta?.name ? <p className="text-sm text-muted">{meta.name}</p> : null}
        </div>
      </section>
    )
  }

  if (field.type === 'color' && typeof value === 'string' && value) {
    return (
      <section>
        <h3 className="mb-1.5 text-sm font-medium">{field.name}</h3>
        <span className="inline-flex items-center gap-2 text-sm">
          <span className="h-5 w-5 rounded-md border border-line" style={{ background: value }} />
          {value}
        </span>
      </section>
    )
  }

  if (field.type === 'relation') {
    return (
      <section>
        <h3 className="mb-1.5 text-sm font-medium">{field.name}</h3>
        <RelationValue field={field} value={value} />
      </section>
    )
  }

  if (field.type === 'sublist' && Array.isArray(value)) {
    const sub = field.config?.subfields ?? []
    const rows = value as Record<string, unknown>[]
    if (!rows.length) return null
    return (
      <section>
        <h3 className="mb-1.5 text-sm font-medium">{field.name}</h3>
        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li key={index} className="rounded-xl bg-ink/[0.03] px-3 py-2 text-sm">
              {sub
                .map((subfield) => displayValue(subfieldAsDef(subfield), row[subfield.id]))
                .filter((text) => text && text !== '—')
                .join(' · ')}
            </li>
          ))}
        </ul>
      </section>
    )
  }

  return (
    <section>
      <h3 className="mb-1.5 text-sm font-medium">{field.name}</h3>
      <div className={cn('text-sm', field.type === 'text' && 'text-base')}>
        <StyledValue
          field={field}
          value={value}
          ratings={ratings}
          itemId={item.id}
          values={item.values}
          schema={schema}
        />
      </div>
    </section>
  )
}
