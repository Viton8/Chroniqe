import { Star } from 'lucide-react'
import type { FieldDef, FieldViewStyle, ItemRating, ListSchema } from '../../types/domain'
import { displayStyledValue, fieldBounds, formatNumberBody, resolveNumericValue } from '../../lib/display'
import { cn } from '../../lib/cn'

export default function StyledValue({
  field,
  value,
  style,
  ratings,
  itemId,
  values,
  schema,
  className,
}: {
  field: FieldDef
  value: unknown
  style?: FieldViewStyle
  ratings?: ItemRating[]
  itemId?: string
  values?: Record<string, unknown>
  schema?: ListSchema
  className?: string
}) {
  const numeric = resolveNumericValue(field, value, style, ratings, itemId, values, schema)
  if (numeric != null && style?.numberDisplay === 'stars') {
    const { max } = fieldBounds(field)
    const count =
      field.type === 'multi_rating' && ratings && itemId
        ? ratings.filter((r) => r.field_id === field.id && r.item_id === itemId).length
        : 0
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        {style.prefix ? <span>{style.prefix}</span> : null}
        <StarScore value={numeric} max={max ?? 5} />
        {style.suffix ? <span>{style.suffix}</span> : null}
        {count ? <span className="text-muted">({count})</span> : null}
      </span>
    )
  }
  return (
    <span className={className}>
      {displayStyledValue(field, value, style, ratings, itemId, values, schema)}
    </span>
  )
}

function StarScore({ value, max }: { value: number; max: number }) {
  const visual = max > 10 ? 5 : Math.max(1, max)
  const scaled = max > 0 ? (value / max) * visual : 0
  return (
    <span className="inline-flex items-center gap-px" title={`${formatNumberBody(value)}/${max}`}>
      {Array.from({ length: visual }, (_, i) => {
        const fill = Math.min(1, Math.max(0, scaled - i))
        return (
          <span key={i} className="relative inline-block h-3.5 w-3.5">
            <Star size={14} className="text-line" />
            {fill > 0 ? (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star size={14} className="fill-amber-400 text-amber-400" />
              </span>
            ) : null}
          </span>
        )
      })}
    </span>
  )
}
