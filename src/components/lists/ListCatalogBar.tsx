import { VISIBILITY, type Visibility } from '../../types/domain'
import { FieldWrap, Select } from '../ui/Input'
import { usePrefs } from '../../context/PrefsContext'
import {
  LIST_PEOPLE_FILTERS,
  LIST_SORT_KEYS,
  type ListPeopleFilter,
  type ListSortKey,
} from '../../lib/listCatalog'

export default function ListCatalogBar({
  sort,
  onSort,
  visibility,
  onVisibility,
  people,
  onPeople,
  showVisibility = false,
  showPeople = false,
}: {
  sort: ListSortKey
  onSort: (sort: ListSortKey) => void
  visibility?: Visibility | 'all'
  onVisibility?: (value: Visibility | 'all') => void
  people?: ListPeopleFilter
  onPeople?: (value: ListPeopleFilter) => void
  showVisibility?: boolean
  showPeople?: boolean
}) {
  const { t } = usePrefs()
  const sortLabels: Record<ListSortKey, string> = {
    updated: t('lists.sortUpdated'),
    created: t('lists.sortCreated'),
    az: t('common.sortAz'),
    za: t('common.sortZa'),
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2">
      <FieldWrap label={t('common.sort')}>
        <Select
          className="h-10 min-w-44"
          value={sort}
          onChange={(e) => onSort(e.target.value as ListSortKey)}
        >
          {LIST_SORT_KEYS.map((key) => (
            <option key={key} value={key}>
              {sortLabels[key]}
            </option>
          ))}
        </Select>
      </FieldWrap>
      {showVisibility && onVisibility ? (
        <FieldWrap label={t('lists.filterVisibility')}>
          <Select
            className="h-10 min-w-44"
            value={visibility ?? 'all'}
            onChange={(e) => onVisibility(e.target.value as Visibility | 'all')}
          >
            <option value="all">{t('lists.visibilityAll')}</option>
            {VISIBILITY.map((key) => (
              <option key={key} value={key}>
                {t(`visibility.${key}`)}
              </option>
            ))}
          </Select>
        </FieldWrap>
      ) : null}
      {showPeople && onPeople ? (
        <FieldWrap label={t('lists.filterPeople')}>
          <Select
            className="h-10 min-w-44"
            value={people ?? 'all'}
            onChange={(e) => onPeople(e.target.value as ListPeopleFilter)}
          >
            {LIST_PEOPLE_FILTERS.map((key) => (
              <option key={key} value={key}>
                {t(`lists.people.${key}`)}
              </option>
            ))}
          </Select>
        </FieldWrap>
      ) : null}
    </div>
  )
}
