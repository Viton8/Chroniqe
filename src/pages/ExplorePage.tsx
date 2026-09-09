import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { fetchPublicLists } from '../services/api'
import type { ListRow, ListSettings } from '../types/domain'
import EmptyState, { Spinner } from '../components/ui/EmptyState'
import { SearchField } from '../components/ui/Input'
import PageHeader from '../components/ui/PageHeader'
import ListCard from '../components/lists/ListCard'
import ListCatalogBar from '../components/lists/ListCatalogBar'
import ForkListButton from '../components/lists/ForkListButton'
import { matchesQuery } from '../lib/search'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useToast } from '../context/ToastContext'
import { filterLists, sortLists, type ListPeopleFilter, type ListSortKey } from '../lib/listCatalog'

const TOPICS = ['views', 'charts', 'collab', 'flow', 'ratings'] as const
type Topic = (typeof TOPICS)[number]

function showcaseOf(list: ListRow) {
  return (list.settings as ListSettings | undefined)?.showcase
}

function ListGrid({
  lists,
  user,
}: {
  lists: ListRow[]
  user: ReturnType<typeof useAuth>['user']
}) {
  const { t } = usePrefs()
  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
      {lists.map((l) => {
        const topic = showcaseOf(l)?.topic
        return (
          <ListCard
            key={l.id}
            list={l}
            favorite={Boolean(user)}
            badge={topic ? t(`explore.topic.${topic}`) : undefined}
            aside={
              <div className="flex items-center justify-between gap-2">
                {l.owner?.username ? (
                  <Link to={`/u/${l.owner.username}`} className="text-accent hover:underline">
                    {l.owner.display_name || `@${l.owner.username}`}
                  </Link>
                ) : (
                  <span>@{t('explore.author')}</span>
                )}
                <ForkListButton list={l} />
              </div>
            }
          />
        )
      })}
    </ul>
  )
}

export default function ExplorePage() {
  const { t, locale } = usePrefs()
  const { user } = useAuth()
  const { toast } = useToast()
  const [rows, setRows] = useState<ListRow[]>([])
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<ListSortKey>('updated')
  const [people, setPeople] = useState<ListPeopleFilter>('all')
  const [topic, setTopic] = useState<Topic | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const debounced = useDebouncedValue(q)

  useEffect(() => {
    void fetchPublicLists()
      .then(setRows)
      .catch((error) => toast(error instanceof Error ? error.message : t('common.error'), 'err'))
      .finally(() => setLoading(false))
  }, [t, toast])

  const filtered = useMemo(
    () =>
      sortLists(
        filterLists(
          rows.filter((l) =>
            matchesQuery(debounced, l.title, l.description, l.icon, l.owner?.username, l.owner?.display_name),
          ),
          { people },
        ),
        sort,
        locale,
      ),
    [rows, debounced, people, sort, locale],
  )

  const featured = useMemo(() => {
    const demos = filtered.filter((l) => showcaseOf(l)?.featured)
    if (topic === 'all') return demos
    return demos.filter((l) => showcaseOf(l)?.topic === topic)
  }, [filtered, topic])

  const rest = useMemo(() => {
    const featuredIds = new Set(featured.map((l) => l.id))
    return filtered.filter((l) => !featuredIds.has(l.id))
  }, [filtered, featured])

  if (loading) return <Spinner />

  return (
    <div>
      <PageHeader title={t('explore.title')} lead={t('explore.lead')} />
      <p className="mt-2 text-xs text-muted">{t('explore.demo')}</p>
      <SearchField
        className="mt-4"
        placeholder={t('explore.find')}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <ListCatalogBar sort={sort} onSort={setSort} people={people} onPeople={setPeople} showPeople />
      {featured.length || topic !== 'all' ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-sm ${topic === 'all' ? 'bg-ink text-paper' : 'bg-ink/5 text-muted'}`}
            onClick={() => setTopic('all')}
          >
            {t('explore.topicAll')}
          </button>
          {TOPICS.map((key) => (
            <button
              key={key}
              type="button"
              className={`rounded-full px-3 py-1 text-sm ${topic === key ? 'bg-ink text-paper' : 'bg-ink/5 text-muted'}`}
              onClick={() => setTopic(key)}
            >
              {t(`explore.topic.${key}`)}
            </button>
          ))}
        </div>
      ) : null}

      {featured.length ? (
        <section className="mt-6">
          <h2 className="font-serif text-xl">{t('explore.featured')}</h2>
          <ListGrid lists={featured} user={user} />
        </section>
      ) : null}

      {rest.length ? (
        <section className="mt-8">
          {featured.length ? <h2 className="font-serif text-xl">{t('explore.all')}</h2> : null}
          <ListGrid lists={rest} user={user} />
        </section>
      ) : null}

      {!featured.length && !rest.length ? (
        <div className="mt-6">
          <EmptyState
            icon="🧭"
            title={debounced || topic !== 'all' || people !== 'all' ? t('explore.noSearch') : t('explore.empty')}
            text={debounced ? t('lists.noSearchText') : undefined}
          />
        </div>
      ) : null}
    </div>
  )
}
