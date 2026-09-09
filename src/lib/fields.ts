import { FIELD_TYPES, type FieldDef, type FieldType, type SublistField } from '../types/domain'

export const NESTED_FIELD_TYPES = FIELD_TYPES.filter(
  (type): type is FieldType => type !== 'sublist' && type !== 'multi_rating' && type !== 'community_rating',
)

export function subfieldAsDef(field: SublistField): FieldDef {
  return {
    id: field.id,
    key: field.key,
    name: field.name,
    type: field.type,
    required: field.required,
    config: field.config,
  }
}

export function emptySublistRow(subfields: SublistField[]): Record<string, unknown> {
  const values: Record<string, unknown> = {}
  for (const field of subfields) {
    const fallback = field.config?.defaultValue
    if (fallback !== undefined && fallback !== null && fallback !== '') {
      values[field.id] = Array.isArray(fallback) ? [...fallback] : fallback
      continue
    }
    if (field.type === 'multiselect' || field.type === 'tags') values[field.id] = []
    else if (field.type === 'boolean' || field.type === 'checkbox') values[field.id] = false
  }
  return values
}
