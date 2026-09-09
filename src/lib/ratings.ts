import type { FieldDef, FieldType } from '../types/domain'

export function fieldTypeOf(field: FieldDef | FieldType): FieldType {
  return typeof field === 'string' ? field : field.type
}

/** Ratings stored in `item_ratings`, not in item values. */
export function usesItemRatings(field: FieldDef | FieldType): boolean {
  const type = fieldTypeOf(field)
  return type === 'multi_rating' || type === 'community_rating'
}

/** Anyone who can view the list (and is signed in) may rate. */
export function isOpenRating(field: FieldDef | FieldType): boolean {
  return fieldTypeOf(field) === 'community_rating'
}

export function ratingInputLocked(
  field: FieldDef,
  access: { userId?: string; canEdit: boolean },
): boolean {
  if (!usesItemRatings(field)) return false
  if (!access.userId) return true
  if (isOpenRating(field)) return false
  return !access.canEdit
}
