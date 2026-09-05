import { useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import type { ItemRow, ListSchema } from '../../types/domain'
import {
  collectedTags,
  countActiveFilters,
  emptyFilters,
  facetFields,
  filterDateFields,
  scoreFields,
  type ListFilters,
} from '../../lib/filters'
import { usePrefs } from '../../context/PrefsContext'
import { cn } from '../../lib/cn'
import Button from '../ui/Button'
import { FieldWrap, Input } from '../ui/Input'

export default function FacetFilters({
  schema,
  items,
  filters,
  onChange,
}: {
  schema: ListSchema
  items: ItemRow[]
  filters: ListFilters
  onChange: (next: ListFilters) => void
}) {
  const { t } = usePrefs()
  const [open, setOpen] = useState(false)
  const facets = facetFields(schema)
  const dates = filterDateFields(schema)
  const scores = scoreFields(schema)
  const active = countActiveFilters(filters)
  if (!facets.length && !dates.length && !scores.length) return null

  const toggle = (fieldId: string, value: string) => {
    const current = filters.facets[fieldId] ?? []
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    onChange({
      ...filters,
      facets: { ...filters.facets, [fieldId]: next },
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="soft" size="sm" onClick={() => setOpen((value) => !value)}>
          <SlidersHorizontal size={14} />
          {t('filters.title')}
          {active ? ` · ${active}` : ''}
        </Button>
        {active ? (
          <Button variant="ghost" size="sm" onClick={() => onChange(emptyFilters())}>
            <X size={14} /> {t('filters.clear')}
          </Button>
        ) : null}
      </div>
      {open ? (
        <div className="space-y-3 rounded-2xl border border-line bg-paper p-3">
          {facets.map((field) => {
            const options =
              field.type === 'boolean' || field.type === 'checkbox'
                ? [
                    { value: 'true', label: t('fields.yes') },
                    { value: 'false', label: t('fields.no') },
                  ]
                : field.config?.options?.length
                  ? field.config.options
                  : collectedTags(items, field).map((value) => ({ value, label: value }))
            if (!options.length) return null
            const selected = new Set(filters.facets[field.id] ?? [])
            return (
              <div key={field.id}>
                <p className="mb-1.5 text-xs font-medium text-muted">{field.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {options.map((option) => {
                    const on = selected.has(option.value)
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggle(field.id, option.value)}
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs ring-1',
                          on ? 'bg-ink text-paper ring-ink' : 'bg-paper text-ink ring-line hover:bg-ink/5',
                        )}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {dates.length ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <FieldWrap label={t('filters.dateField')}>
                <select
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm"
                  value={filters.dateFieldId ?? schema.dateFieldId ?? dates[0]?.id ?? ''}
                  onChange={(event) =>
                    onChange({ ...filters, dateFieldId: event.target.value || undefined })
                  }
                >
                  {dates.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name}
                    </option>
                  ))}
                </select>
              </FieldWrap>
              <FieldWrap label={t('filters.dateFrom')}>
                <Input
                  type="date"
                  value={filters.dateFrom ?? ''}
                  onChange={(event) =>
                    onChange({
                      ...filters,
                      dateFrom: event.target.value || undefined,
                      dateFieldId: filters.dateFieldId ?? schema.dateFieldId ?? dates[0]?.id,
                    })
                  }
                />
              </FieldWrap>
              <FieldWrap label={t('filters.dateTo')}>
                <Input
                  type="date"
                  value={filters.dateTo ?? ''}
                  onChange={(event) =>
                    onChange({
                      ...filters,
                      dateTo: event.target.value || undefined,
                      dateFieldId: filters.dateFieldId ?? schema.dateFieldId ?? dates[0]?.id,
                    })
                  }
                />
              </FieldWrap>
            </div>
          ) : null}
          {scores.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <FieldWrap label={t('filters.ratingField')}>
                <select
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm"
                  value={filters.ratingFieldId ?? scores[0]?.id ?? ''}
                  onChange={(event) =>
                    onChange({ ...filters, ratingFieldId: event.target.value || undefined })
                  }
                >
                  {scores.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name}
                    </option>
                  ))}
                </select>
              </FieldWrap>
              <FieldWrap label={t('filters.ratingMin')}>
                <Input
                  type="number"
                  min={0}
                  value={filters.ratingMin ?? ''}
                  onChange={(event) =>
                    onChange({
                      ...filters,
                      ratingMin: event.target.value ? Number(event.target.value) : undefined,
                      ratingFieldId: filters.ratingFieldId ?? scores[0]?.id,
                    })
                  }
                />
              </FieldWrap>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
