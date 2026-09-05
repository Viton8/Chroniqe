import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))

const ANNA = 'a11e0000-0000-4000-8000-000000000001'
const KIRILL = 'a11e0000-0000-4000-8000-000000000002'
const LENA = 'a11e0000-0000-4000-8000-000000000003'
const OLEG = 'a11e0000-0000-4000-8000-000000000004'
const VITON = '6c1d42f0-3128-4ea9-bbeb-161f6cd98ba0'

const list = (n) => `b11e0000-0000-4000-8000-${String(n).padStart(12, '0')}`
const item = (n) => `c11e0000-0000-4000-8000-${String(n).padStart(12, '0')}`
const chart = (n) => `d11e0000-0000-4000-8000-${String(n).padStart(12, '0')}`
const note = (n) => `e11e0000-0000-4000-8000-${String(n).padStart(12, '0')}`
const prop = (n) => `f11e0000-0000-4000-8000-${String(n).padStart(12, '0')}`
const auto = (n) => `aa1e0000-0000-4000-8000-${String(n).padStart(12, '0')}`
const friend = (n) => `aa2e0000-0000-4000-8000-${String(n).padStart(12, '0')}`

const L = {
  watch: list(11),
  watched: list(12),
  dropped: list(13),
  shop: list(21),
  bought: list(22),
  later: list(23),
  games: list(31),
  books: list(32),
  week: list(33),
  todos: list(41),
  recipes: list(42),
  vinyl: list(43),
  ideas: list(51),
  backlog: list(61),
  sprint: list(62),
  trips: list(63),
  places: list(64),
  expenses: list(65),
  workouts: list(66),
  release: list(67),
  dinner: list(68),
  podcasts: list(69),
  events: list(70),
}

function esc(value) {
  return String(value).replaceAll("'", "''")
}
function sqlText(value) {
  return value == null ? 'null' : `'${esc(value)}'`
}
function sqlJson(value) {
  return `'${esc(JSON.stringify(value))}'::jsonb`
}
function img(seed) {
  return `https://picsum.photos/seed/${seed}/400/600`
}

const movieKind = {
  options: [
    { value: 'movie', label: 'Фильм' },
    { value: 'series', label: 'Сериал' },
    { value: 'anime', label: 'Аниме' },
    { value: 'doc', label: 'Документальный' },
  ],
}
const priorityOpts = [
  { value: 'now', label: 'Срочно', color: '#be123c' },
  { value: 'soon', label: 'Скоро', color: '#b45309' },
  { value: 'someday', label: 'Когда-нибудь', color: '#6e6578' },
]
const todoPriority = [
  { value: 'high', label: 'Высокий', color: '#be123c' },
  { value: 'mid', label: 'Средний', color: '#b45309' },
  { value: 'low', label: 'Низкий', color: '#0f766e' },
]
const shopCat = [
  { value: 'food', label: 'Еда' },
  { value: 'home', label: 'Дом' },
  { value: 'tech', label: 'Техника' },
  { value: 'other', label: 'Другое' },
]
const platforms = [
  { value: 'pc', label: 'PC' },
  { value: 'ps', label: 'PlayStation' },
  { value: 'xbox', label: 'Xbox' },
  { value: 'switch', label: 'Switch' },
  { value: 'mobile', label: 'Телефон' },
  { value: 'other', label: 'Другое' },
]
const gameStatus = [
  { value: 'completed', label: 'Пройдено' },
  { value: 'main', label: 'Сюжет' },
  { value: 'hundred', label: '100%' },
  { value: 'dropped', label: 'Брошено' },
]
const bookStatus = [
  { value: 'want', label: 'Хочу' },
  { value: 'reading', label: 'Читаю' },
  { value: 'done', label: 'Прочитано' },
  { value: 'dropped', label: 'Брошено' },
]

function views(active, rows, extras = {}) {
  return {
    mode: extras.mode ?? (rows.find((v) => v.id === active)?.kind === 'calendar' ? 'timeline' : rows.find((v) => v.id === active)?.kind ?? 'table'),
    allowedKinds: [...new Set(rows.map((v) => (v.kind === 'cards' ? 'cards' : v.kind)))],
    activeViewId: active,
    imageFieldId: extras.imageFieldId,
    groupFieldId: extras.groupFieldId,
    dateFieldId: extras.dateFieldId,
    views: rows,
  }
}

function f(id, name, type, extra = {}) {
  return { id, key: id, name, type, ...extra }
}

const schemas = {
  watch: {
    fields: [
      f('title', 'Название', 'text', { required: true, config: { maxLength: 200 } }),
      f('year', 'Год', 'integer', { config: { min: 1888, max: 2100 } }),
      f('kind', 'Тип', 'select', { config: movieKind }),
      f('poster', 'Постер', 'image', { config: { maxSizeMb: 2 } }),
      f('priority', 'Приоритет', 'select', { config: { options: priorityOpts } }),
      f('note', 'Заметка', 'textarea', { config: { maxLength: 500 } }),
    ],
    titleFieldId: 'title',
    imageFieldId: 'poster',
    groupFieldId: 'priority',
  },
  watched: {
    fields: [
      f('title', 'Название', 'text', { required: true, config: { maxLength: 200 } }),
      f('year', 'Год', 'integer', { config: { min: 1888, max: 2100 } }),
      f('kind', 'Тип', 'select', { config: movieKind }),
      f('poster', 'Постер', 'image', { config: { maxSizeMb: 2 } }),
      f('watched_at', 'Дата просмотра', 'date'),
      f('ratings', 'Оценки', 'multi_rating', { config: { min: 1, max: 10, ratingMax: 10 } }),
      f('seasons', 'Сезоны', 'sublist', {
        config: {
          subfields: [
            { id: 'season', key: 'season', name: 'Сезон', type: 'integer', required: true, config: { min: 1, max: 80 } },
            { id: 'episodes', key: 'episodes', name: 'Серии', type: 'integer', config: { min: 1, max: 200 } },
            { id: 'finished_at', key: 'finished_at', name: 'Досмотрен', type: 'date' },
            { id: 'score', key: 'score', name: 'Оценка сезона', type: 'rating', config: { ratingMax: 10, min: 1, max: 10 } },
          ],
        },
      }),
      f('review', 'Отзыв', 'textarea', { config: { maxLength: 2000 } }),
    ],
    titleFieldId: 'title',
    imageFieldId: 'poster',
    dateFieldId: 'watched_at',
  },
  dropped: {
    fields: [
      f('title', 'Название', 'text', { required: true, config: { maxLength: 200 } }),
      f('year', 'Год', 'integer', { config: { min: 1888, max: 2100 } }),
      f('kind', 'Тип', 'select', { config: movieKind }),
      f('reason', 'Причина', 'textarea', { config: { maxLength: 500 } }),
      f('decided_at', 'Дата', 'date'),
    ],
    titleFieldId: 'title',
    dateFieldId: 'decided_at',
  },
  shop: {
    fields: [
      f('name', 'Позиция', 'text', { required: true, config: { maxLength: 120 } }),
      f('qty', 'Количество', 'number', { config: { min: 0, max: 9999 } }),
      f('category', 'Категория', 'select', { config: { options: shopCat } }),
      f('note', 'Заметка', 'text', { config: { maxLength: 200 } }),
      f('bought_at', 'Куплено', 'date', { hidden: true }),
    ],
    titleFieldId: 'name',
    dateFieldId: 'bought_at',
    groupFieldId: 'category',
  },
  bought: {
    fields: [
      f('name', 'Позиция', 'text', { required: true, config: { maxLength: 120 } }),
      f('qty', 'Количество', 'number', { config: { min: 0 } }),
      f('bought_at', 'Дата', 'date'),
      f('price', 'Цена', 'number', { config: { min: 0 } }),
      f('category', 'Категория', 'select', { config: { options: shopCat } }),
    ],
    titleFieldId: 'name',
    dateFieldId: 'bought_at',
    groupFieldId: 'category',
  },
  later: {
    fields: [
      f('name', 'Позиция', 'text', { required: true, config: { maxLength: 120 } }),
      f('qty', 'Количество', 'number', { config: { min: 0 } }),
      f('when', 'Когда', 'text', { config: { maxLength: 80 } }),
      f('note', 'Заметка', 'textarea', { config: { maxLength: 400 } }),
    ],
    titleFieldId: 'name',
  },
  games: {
    fields: [
      f('title', 'Название', 'text', { required: true, config: { maxLength: 200 } }),
      f('platform', 'Платформа', 'select', { config: { options: platforms } }),
      f('cover', 'Обложка', 'image', { config: { maxSizeMb: 2 } }),
      f('finished_at', 'Пройдено', 'date'),
      f('hours', 'Часы', 'number', { config: { min: 0, max: 10000 } }),
      f('ratings', 'Оценки', 'multi_rating', { config: { ratingMax: 10, min: 1, max: 10 } }),
      f('status', 'Статус', 'select', { config: { options: gameStatus } }),
      f('note', 'Заметка', 'textarea', { config: { maxLength: 1000 } }),
    ],
    titleFieldId: 'title',
    imageFieldId: 'cover',
    dateFieldId: 'finished_at',
    groupFieldId: 'platform',
  },
  backlog: {
    fields: [
      f('title', 'Название', 'text', { required: true, config: { maxLength: 200 } }),
      f('platform', 'Платформа', 'select', { config: { options: platforms } }),
      f('cover', 'Обложка', 'image', { config: { maxSizeMb: 2 } }),
      f('priority', 'Приоритет', 'select', { config: { options: priorityOpts } }),
      f('note', 'Заметка', 'textarea', { config: { maxLength: 500 } }),
    ],
    titleFieldId: 'title',
    imageFieldId: 'cover',
    groupFieldId: 'priority',
  },
  books: {
    fields: [
      f('title', 'Название', 'text', { required: true, config: { maxLength: 200 } }),
      f('author', 'Автор', 'text', { config: { maxLength: 120 } }),
      f('cover', 'Обложка', 'image', { config: { maxSizeMb: 2 } }),
      f('finished_at', 'Прочитано', 'date'),
      f('ratings', 'Оценки', 'multi_rating', { config: { ratingMax: 10 } }),
      f('status', 'Статус', 'select', { config: { options: bookStatus } }),
      f('note', 'Заметка', 'textarea', { config: { maxLength: 2000 } }),
    ],
    titleFieldId: 'title',
    imageFieldId: 'cover',
    dateFieldId: 'finished_at',
    groupFieldId: 'status',
  },
  todo: {
    fields: [
      f('title', 'Задача', 'text', { required: true, config: { maxLength: 200 } }),
      f('due', 'Срок', 'date'),
      f('priority', 'Приоритет', 'select', { config: { options: todoPriority } }),
      f('done_at', 'Выполнено', 'date', { hidden: true }),
      f('notes', 'Заметки', 'textarea', { config: { maxLength: 1000 } }),
    ],
    titleFieldId: 'title',
    dateFieldId: 'due',
    groupFieldId: 'priority',
  },
  recipes: {
    fields: [
      f('title', 'Название', 'text', { required: true, config: { maxLength: 200 } }),
      f('time', 'Минуты', 'integer', { config: { min: 1, max: 600 } }),
      f('tag', 'Тип', 'select', {
        config: {
          options: [
            { value: 'soup', label: 'Суп' },
            { value: 'main', label: 'Основное' },
            { value: 'dessert', label: 'Десерт' },
            { value: 'bake', label: 'Выпечка' },
          ],
        },
      }),
      f('photo', 'Фото', 'image', { config: { maxSizeMb: 2 } }),
      f('servings', 'Порции', 'integer', { config: { min: 1, max: 20 } }),
    ],
    titleFieldId: 'title',
    imageFieldId: 'photo',
    groupFieldId: 'tag',
  },
  vinyl: {
    fields: [
      f('title', 'Альбом', 'text', { required: true, config: { maxLength: 200 } }),
      f('artist', 'Исполнитель', 'text', { config: { maxLength: 120 } }),
      f('year', 'Год', 'integer', { config: { min: 1900, max: 2100 } }),
      f('cover', 'Обложка', 'image', { config: { maxSizeMb: 2 } }),
      f('cond', 'Состояние', 'select', {
        config: {
          options: [
            { value: 'mint', label: 'Mint', color: '#0f766e' },
            { value: 'vg', label: 'VG+', color: '#b45309' },
            { value: 'g', label: 'G', color: '#6e6578' },
          ],
        },
      }),
    ],
    titleFieldId: 'title',
    imageFieldId: 'cover',
    groupFieldId: 'cond',
  },
  sprint: {
    fields: [
      f('title', 'Задача', 'text', { required: true, config: { maxLength: 200 } }),
      f('status', 'Статус', 'select', {
        config: {
          options: [
            { value: 'backlog', label: 'Бэклог', color: '#6e6578' },
            { value: 'doing', label: 'В работе', color: '#2563eb' },
            { value: 'review', label: 'Ревью', color: '#b45309' },
            { value: 'done', label: 'Готово', color: '#0f766e' },
          ],
        },
      }),
      f('owner', 'Кто', 'select', {
        config: {
          options: [
            { value: 'anna', label: 'Анна' },
            { value: 'kirill', label: 'Кирилл' },
            { value: 'lena', label: 'Лена' },
            { value: 'oleg', label: 'Олег' },
          ],
        },
      }),
      f('points', 'Оценка', 'integer', { config: { min: 1, max: 13 } }),
      f('due', 'Срок', 'date'),
      f('notes', 'Заметки', 'textarea', { config: { maxLength: 800 } }),
    ],
    titleFieldId: 'title',
    dateFieldId: 'due',
    groupFieldId: 'status',
  },
  trips: {
    fields: [
      f('title', 'Поездка', 'text', { required: true, config: { maxLength: 200 } }),
      f('place', 'Куда', 'text', { config: { maxLength: 120 } }),
      f('starts', 'Старт', 'date'),
      f('kind', 'Тип', 'select', {
        config: {
          options: [
            { value: 'city', label: 'Город' },
            { value: 'nature', label: 'Природа' },
            { value: 'visit', label: 'В гости' },
            { value: 'work', label: 'Работа' },
          ],
        },
      }),
      f('budget', 'Бюджет', 'number', { config: { min: 0 } }),
      f('cover', 'Фото', 'image', { config: { maxSizeMb: 2 } }),
      f('note', 'Заметка', 'textarea', { config: { maxLength: 500 } }),
    ],
    titleFieldId: 'title',
    imageFieldId: 'cover',
    dateFieldId: 'starts',
    groupFieldId: 'kind',
  },
  places: {
    fields: [
      f('title', 'Место', 'text', { required: true, config: { maxLength: 200 } }),
      f('city', 'Город', 'text', { config: { maxLength: 80 } }),
      f('kind', 'Тип', 'select', {
        config: {
          options: [
            { value: 'cafe', label: 'Кафе' },
            { value: 'park', label: 'Парк' },
            { value: 'museum', label: 'Музей' },
            { value: 'bar', label: 'Бар' },
            { value: 'walk', label: 'Прогулка' },
          ],
        },
      }),
      f('cover', 'Фото', 'image', { config: { maxSizeMb: 2 } }),
      f('visited_at', 'Были', 'date'),
      f('ratings', 'Оценки', 'multi_rating', { config: { ratingMax: 10, min: 1, max: 10 } }),
      f('note', 'Заметка', 'textarea', { config: { maxLength: 800 } }),
    ],
    titleFieldId: 'title',
    imageFieldId: 'cover',
    dateFieldId: 'visited_at',
    groupFieldId: 'kind',
  },
  expenses: {
    fields: [
      f('name', 'Статья', 'text', { required: true, config: { maxLength: 160 } }),
      f('amount', 'Сумма', 'number', { config: { min: 0 } }),
      f('category', 'Категория', 'select', {
        config: {
          options: [
            { value: 'food', label: 'Еда' },
            { value: 'home', label: 'Жильё' },
            { value: 'transport', label: 'Транспорт' },
            { value: 'fun', label: 'Досуг' },
            { value: 'health', label: 'Здоровье' },
          ],
        },
      }),
      f('paid_at', 'Дата', 'date'),
      f('who', 'Кто', 'select', {
        config: {
          options: [
            { value: 'kirill', label: 'Кирилл' },
            { value: 'anna', label: 'Анна' },
            { value: 'shared', label: 'На всех' },
          ],
        },
      }),
    ],
    titleFieldId: 'name',
    dateFieldId: 'paid_at',
    groupFieldId: 'category',
  },
  workouts: {
    fields: [
      f('title', 'Тренировка', 'text', { required: true, config: { maxLength: 160 } }),
      f('kind', 'Тип', 'select', {
        config: {
          options: [
            { value: 'run', label: 'Бег' },
            { value: 'strength', label: 'Силовая' },
            { value: 'yoga', label: 'Йога' },
            { value: 'walk', label: 'Ходьба' },
          ],
        },
      }),
      f('minutes', 'Минуты', 'integer', { config: { min: 5, max: 300 } }),
      f('done_at', 'Дата', 'date'),
      f('feel', 'Самочувствие', 'rating', { config: { ratingMax: 10, min: 1, max: 10 } }),
    ],
    titleFieldId: 'title',
    dateFieldId: 'done_at',
    groupFieldId: 'kind',
  },
  dinner: {
    fields: [
      f('title', 'Ужин', 'text', { required: true, config: { maxLength: 200 } }),
      f('host', 'Кто зовёт', 'select', {
        config: {
          options: [
            { value: 'anna', label: 'Анна' },
            { value: 'kirill', label: 'Кирилл' },
            { value: 'lena', label: 'Лена' },
            { value: 'oleg', label: 'Олег' },
          ],
        },
      }),
      f('when', 'Когда', 'date'),
      f('dish', 'Блюдо', 'text', { config: { maxLength: 160 } }),
      f('status', 'Статус', 'select', {
        config: {
          options: [
            { value: 'idea', label: 'Идея' },
            { value: 'planned', label: 'Запланирован' },
            { value: 'done', label: 'Состоялся' },
          ],
        },
      }),
      f('ratings', 'Оценки', 'multi_rating', { config: { ratingMax: 10 } }),
      f('note', 'Заметка', 'textarea', { config: { maxLength: 600 } }),
    ],
    titleFieldId: 'title',
    dateFieldId: 'when',
    groupFieldId: 'status',
  },
  podcasts: {
    fields: [
      f('title', 'Выпуск', 'text', { required: true, config: { maxLength: 200 } }),
      f('show', 'Подкаст', 'text', { config: { maxLength: 120 } }),
      f('status', 'Статус', 'select', {
        config: {
          options: [
            { value: 'queue', label: 'В очереди' },
            { value: 'listening', label: 'Слушаю' },
            { value: 'done', label: 'Прослушан' },
          ],
        },
      }),
      f('mins', 'Минуты', 'integer', { config: { min: 1, max: 400 } }),
      f('finished_at', 'Когда', 'date'),
      f('ratings', 'Оценки', 'multi_rating', { config: { ratingMax: 10 } }),
    ],
    titleFieldId: 'title',
    dateFieldId: 'finished_at',
    groupFieldId: 'status',
  },
  events: {
    fields: [
      f('title', 'Событие', 'text', { required: true, config: { maxLength: 200 } }),
      f('venue', 'Место', 'text', { config: { maxLength: 120 } }),
      f('starts', 'Дата', 'date'),
      f('kind', 'Тип', 'select', {
        config: {
          options: [
            { value: 'concert', label: 'Концерт' },
            { value: 'cinema', label: 'Кино' },
            { value: 'sport', label: 'Спорт' },
            { value: 'meetup', label: 'Встреча' },
          ],
        },
      }),
      f('price', 'Цена', 'number', { config: { min: 0 } }),
      f('note', 'Заметка', 'textarea', { config: { maxLength: 400 } }),
    ],
    titleFieldId: 'title',
    dateFieldId: 'starts',
    groupFieldId: 'kind',
  },
}

const lists = [
  {
    id: L.watch,
    owner: ANNA,
    title: 'К просмотру',
    description: 'Общая очередь на выходные. Друзья предлагают тайтлы, можно перенести в «Просмотрено».',
    icon: '🍿',
    template: 'movies_watchlist',
    schema: schemas.watch,
    view: views('v-cards', [
      { id: 'v-cards', name: 'Карточки', kind: 'cards', cardLayout: 'grid', groupFieldId: 'priority', coverFieldId: 'poster', titleFieldId: 'title' },
      { id: 'v-board', name: 'Доска', kind: 'board', groupFieldId: 'priority', titleFieldId: 'title' },
      { id: 'v-table', name: 'Таблица', kind: 'table', density: 'comfortable', titleFieldId: 'title' },
    ], { mode: 'cards', imageFieldId: 'poster', groupFieldId: 'priority' }),
    settings: {
      showcase: { featured: true, topic: 'flow' },
      transferActions: [
        { id: 't-watched', label: 'Просмотрено', targetListId: L.watched, fieldMap: { title: 'title', year: 'year', kind: 'kind', poster: 'poster' }, deleteSource: true, setFields: { watched_at: 'today' } },
        { id: 't-dropped', label: 'Не буду смотреть', targetListId: L.dropped, fieldMap: { title: 'title', year: 'year', kind: 'kind' }, deleteSource: true },
      ],
    },
    visibility: 'public',
    edit: 'friends',
  },
  {
    id: L.watched,
    owner: ANNA,
    title: 'Просмотрено',
    description: 'Каталог просмотров клуба: таблица, лента, календарь, коллективные оценки и предложения правок.',
    icon: '🎬',
    template: 'movies_watched',
    schema: schemas.watched,
    view: views('v-table', [
      { id: 'v-table', name: 'Таблица', kind: 'table', density: 'comfortable', dateFieldId: 'watched_at', coverFieldId: 'poster', titleFieldId: 'title' },
      { id: 'v-cards', name: 'Карточки', kind: 'cards', cardLayout: 'grid', coverFieldId: 'poster', titleFieldId: 'title', groupFieldId: 'kind' },
      { id: 'v-media', name: 'Галерея', kind: 'cards', cardLayout: 'media', coverFieldId: 'poster', titleFieldId: 'title' },
      { id: 'v-time', name: 'Лента', kind: 'timeline', dateFieldId: 'watched_at', coverFieldId: 'poster', titleFieldId: 'title' },
      { id: 'v-cal', name: 'Календарь', kind: 'calendar', dateFieldId: 'watched_at', titleFieldId: 'title' },
    ], { mode: 'table', imageFieldId: 'poster', dateFieldId: 'watched_at' }),
    settings: { showcase: { featured: true, topic: 'ratings' } },
    visibility: 'public',
    edit: 'proposals',
  },
  {
    id: L.dropped,
    owner: ANNA,
    title: 'Не буду смотреть',
    description: 'Личный отказник — не светится в ленте.',
    icon: '🚫',
    template: 'movies_dropped',
    schema: schemas.dropped,
    view: views('v-table', [{ id: 'v-table', name: 'Таблица', kind: 'table', titleFieldId: 'title', dateFieldId: 'decided_at' }]),
    settings: {},
    visibility: 'private',
    edit: 'owner',
  },
  {
    id: L.shop,
    owner: KIRILL,
    title: 'Покупки',
    description: 'Семейный список с вычёркиванием и кнопками «Куплено» / «к празднику».',
    icon: '🛒',
    template: 'shopping',
    schema: schemas.shop,
    view: views('v-compact', [
      { id: 'v-compact', name: 'Компактно', kind: 'cards', cardLayout: 'compact', groupFieldId: 'category', titleFieldId: 'name' },
      { id: 'v-board', name: 'По полкам', kind: 'board', groupFieldId: 'category', titleFieldId: 'name' },
      { id: 'v-table', name: 'Таблица', kind: 'table', titleFieldId: 'name' },
    ], { mode: 'compact', groupFieldId: 'category' }),
    settings: {
      showcase: { featured: true, topic: 'flow' },
      enableCheck: true,
      checkLabel: 'Куплено',
      onCheck: [
        { type: 'set_now', fieldId: 'bought_at' },
        { type: 'move_to_list', targetListId: L.bought, fieldMap: { name: 'name', qty: 'qty', category: 'category', bought_at: 'bought_at' }, deleteSource: true },
      ],
      onUncheck: [{ type: 'restore_snapshot' }],
      transferActions: [
        { id: 't-bought', label: 'Куплено', targetListId: L.bought, fieldMap: { name: 'name', qty: 'qty', category: 'category' }, deleteSource: true },
        { id: 't-later', label: 'К Новому году', targetListId: L.later, fieldMap: { name: 'name', qty: 'qty' }, deleteSource: true },
      ],
    },
    visibility: 'public',
    edit: 'friends',
  },
  {
    id: L.bought,
    owner: KIRILL,
    title: 'Куплено',
    description: 'История покупок с ценами — бар и круговая по категориям.',
    icon: '📦',
    template: 'bought',
    schema: schemas.bought,
    view: views('v-table', [
      { id: 'v-table', name: 'Таблица', kind: 'table', dateFieldId: 'bought_at', titleFieldId: 'name' },
      { id: 'v-board', name: 'Категории', kind: 'board', groupFieldId: 'category', titleFieldId: 'name' },
      { id: 'v-time', name: 'Лента', kind: 'timeline', dateFieldId: 'bought_at', titleFieldId: 'name' },
    ], { mode: 'table', dateFieldId: 'bought_at' }),
    settings: { showcase: { featured: true, topic: 'charts' } },
    visibility: 'public',
    edit: 'owner',
  },
  {
    id: L.later,
    owner: KIRILL,
    title: 'Купить к событию',
    description: 'Отложенные покупки к праздникам.',
    icon: '🎄',
    template: 'later_shopping',
    schema: schemas.later,
    view: views('v-compact', [{ id: 'v-compact', name: 'Список', kind: 'cards', cardLayout: 'compact', titleFieldId: 'name' }]),
    settings: {},
    visibility: 'private',
    edit: 'owner',
  },
  {
    id: L.games,
    owner: LENA,
    title: 'Пройденные игры',
    description: 'Галерея пройденного: часы, платформы, оценки друзей и графики.',
    icon: '🎮',
    template: 'games_done',
    schema: schemas.games,
    view: views('v-media', [
      { id: 'v-media', name: 'Галерея', kind: 'cards', cardLayout: 'media', coverFieldId: 'cover', titleFieldId: 'title', dateFieldId: 'finished_at' },
      { id: 'v-board', name: 'По платформам', kind: 'board', groupFieldId: 'platform', titleFieldId: 'title' },
      { id: 'v-table', name: 'Таблица', kind: 'table', dateFieldId: 'finished_at', titleFieldId: 'title' },
      { id: 'v-time', name: 'Лента', kind: 'timeline', dateFieldId: 'finished_at', coverFieldId: 'cover', titleFieldId: 'title' },
    ], { mode: 'gallery', imageFieldId: 'cover', dateFieldId: 'finished_at' }),
    settings: { showcase: { featured: true, topic: 'views' } },
    visibility: 'public',
    edit: 'proposals',
  },
  {
    id: L.books,
    owner: LENA,
    title: 'Книги',
    description: 'Книжный клуб на доске: хочу / читаю / прочитано. Анна — редактор.',
    icon: '📚',
    template: 'books',
    schema: schemas.books,
    view: views('v-board', [
      { id: 'v-board', name: 'Доска', kind: 'board', groupFieldId: 'status', titleFieldId: 'title', coverFieldId: 'cover' },
      { id: 'v-cards', name: 'Карточки', kind: 'cards', cardLayout: 'grid', coverFieldId: 'cover', titleFieldId: 'title' },
      { id: 'v-table', name: 'Таблица', kind: 'table', titleFieldId: 'title' },
    ], { mode: 'board', groupFieldId: 'status' }),
    settings: { showcase: { featured: true, topic: 'views' } },
    visibility: 'public',
    edit: 'friends',
  },
  {
    id: L.week,
    owner: LENA,
    title: 'Дела на неделю',
    description: 'Личные задачи — только для Лены.',
    icon: '✅',
    template: 'todo',
    schema: schemas.todo,
    view: views('v-compact', [{ id: 'v-compact', name: 'Список', kind: 'cards', cardLayout: 'compact', groupFieldId: 'priority', titleFieldId: 'title' }]),
    settings: { enableCheck: true, checkLabel: 'Готово', onCheck: [{ type: 'set_now', fieldId: 'done_at' }] },
    visibility: 'private',
    edit: 'owner',
  },
  {
    id: L.todos,
    owner: OLEG,
    title: 'Дела',
    description: 'Публичный todo: вычёркивание, сроки, просрочки в сводке.',
    icon: '✅',
    template: 'todo',
    schema: schemas.todo,
    view: views('v-compact', [
      { id: 'v-compact', name: 'Список', kind: 'cards', cardLayout: 'compact', groupFieldId: 'priority', titleFieldId: 'title' },
      { id: 'v-cal', name: 'Календарь', kind: 'calendar', dateFieldId: 'due', titleFieldId: 'title' },
      { id: 'v-table', name: 'Таблица', kind: 'table', dateFieldId: 'due', titleFieldId: 'title' },
    ], { mode: 'compact', groupFieldId: 'priority' }),
    settings: { showcase: { featured: true, topic: 'views' }, enableCheck: true, checkLabel: 'Готово', onCheck: [{ type: 'set_now', fieldId: 'done_at' }] },
    visibility: 'public',
    edit: 'owner',
  },
  {
    id: L.recipes,
    owner: OLEG,
    title: 'Рецепты',
    description: 'Карточки блюд по типу: суп, основное, десерт, выпечка.',
    icon: '🍝',
    template: 'blank',
    schema: schemas.recipes,
    view: views('v-cards', [
      { id: 'v-cards', name: 'Карточки', kind: 'cards', cardLayout: 'grid', groupFieldId: 'tag', coverFieldId: 'photo', titleFieldId: 'title' },
      { id: 'v-board', name: 'По типу', kind: 'board', groupFieldId: 'tag', titleFieldId: 'title' },
      { id: 'v-table', name: 'Таблица', kind: 'table', titleFieldId: 'title' },
    ], { mode: 'cards', groupFieldId: 'tag' }),
    settings: { showcase: { featured: true, topic: 'views' } },
    visibility: 'public',
    edit: 'owner',
  },
  {
    id: L.vinyl,
    owner: OLEG,
    title: 'Винил',
    description: 'Коллекция пластинок: состояние, год, обложки.',
    icon: '💿',
    template: 'blank',
    schema: schemas.vinyl,
    view: views('v-table', [
      { id: 'v-table', name: 'Таблица', kind: 'table', titleFieldId: 'title' },
      { id: 'v-media', name: 'Галерея', kind: 'cards', cardLayout: 'media', coverFieldId: 'cover', titleFieldId: 'title' },
      { id: 'v-board', name: 'Состояние', kind: 'board', groupFieldId: 'cond', titleFieldId: 'title' },
    ], { mode: 'table' }),
    settings: { showcase: { featured: true, topic: 'views' } },
    visibility: 'public',
    edit: 'owner',
  },
  {
    id: L.ideas,
    owner: VITON,
    title: 'Идеи для Chroniqe',
    description: 'Публичный бэклог фич: приоритеты, галочки, заметки.',
    icon: '✨',
    template: 'todo',
    schema: schemas.todo,
    view: views('v-compact', [
      { id: 'v-compact', name: 'Список', kind: 'cards', cardLayout: 'compact', groupFieldId: 'priority', titleFieldId: 'title' },
      { id: 'v-board', name: 'Доска', kind: 'board', groupFieldId: 'priority', titleFieldId: 'title' },
    ], { mode: 'compact', groupFieldId: 'priority' }),
    settings: { showcase: { featured: true, topic: 'collab' }, enableCheck: true, checkLabel: 'Готово' },
    visibility: 'public',
    edit: 'owner',
  },
  {
    id: L.backlog,
    owner: LENA,
    title: 'К прохождению',
    description: 'Очередь игр. Кнопка «Пройдено» переносит запись в каталог с сегодняшней датой.',
    icon: '🕹️',
    template: 'games_backlog',
    schema: schemas.backlog,
    view: views('v-cards', [
      { id: 'v-cards', name: 'Карточки', kind: 'cards', cardLayout: 'grid', groupFieldId: 'priority', coverFieldId: 'cover', titleFieldId: 'title' },
      { id: 'v-board', name: 'Приоритет', kind: 'board', groupFieldId: 'priority', titleFieldId: 'title' },
    ], { mode: 'cards', imageFieldId: 'cover', groupFieldId: 'priority' }),
    settings: {
      showcase: { featured: true, topic: 'flow' },
      transferActions: [
        { id: 't-played', label: 'Пройдено', targetListId: L.games, fieldMap: { title: 'title', platform: 'platform', cover: 'cover' }, deleteSource: true, setFields: { finished_at: '$today' } },
      ],
    },
    visibility: 'public',
    edit: 'friends',
  },
  {
    id: L.sprint,
    owner: KIRILL,
    title: 'Спринт команды',
    description: 'Общая доска: Анна, Лена и Олег — редакторы. Статусы, сроки, оценки задач.',
    icon: '🏁',
    template: 'blank',
    schema: schemas.sprint,
    view: views('v-board', [
      { id: 'v-board', name: 'Доска', kind: 'board', groupFieldId: 'status', titleFieldId: 'title' },
      { id: 'v-table', name: 'Таблица', kind: 'table', titleFieldId: 'title' },
      { id: 'v-cal', name: 'Календарь', kind: 'calendar', dateFieldId: 'due', titleFieldId: 'title' },
    ], { mode: 'board', groupFieldId: 'status' }),
    settings: { showcase: { featured: true, topic: 'collab' }, enableCheck: true, checkLabel: 'Закрыто' },
    visibility: 'public',
    edit: 'selected',
  },
  {
    id: L.trips,
    owner: ANNA,
    title: 'Поездки',
    description: 'Календарь и лента поездок с бюджетом — удобно показать виды по датам.',
    icon: '🧳',
    template: 'blank',
    schema: schemas.trips,
    view: views('v-cal', [
      { id: 'v-cal', name: 'Календарь', kind: 'calendar', dateFieldId: 'starts', coverFieldId: 'cover', titleFieldId: 'title' },
      { id: 'v-time', name: 'Лента', kind: 'timeline', dateFieldId: 'starts', coverFieldId: 'cover', titleFieldId: 'title' },
      { id: 'v-cards', name: 'Карточки', kind: 'cards', cardLayout: 'grid', groupFieldId: 'kind', coverFieldId: 'cover', titleFieldId: 'title' },
    ], { mode: 'timeline', dateFieldId: 'starts', imageFieldId: 'cover' }),
    settings: { showcase: { featured: true, topic: 'views' } },
    visibility: 'public',
    edit: 'friends',
  },
  {
    id: L.places,
    owner: OLEG,
    title: 'Любимые места',
    description: 'Галерея мест с оценками всей компании — кафе, парки, музеи.',
    icon: '📍',
    template: 'blank',
    schema: schemas.places,
    view: views('v-media', [
      { id: 'v-media', name: 'Галерея', kind: 'cards', cardLayout: 'media', coverFieldId: 'cover', titleFieldId: 'title' },
      { id: 'v-board', name: 'По типу', kind: 'board', groupFieldId: 'kind', titleFieldId: 'title' },
      { id: 'v-table', name: 'Таблица', kind: 'table', titleFieldId: 'title' },
    ], { mode: 'gallery', imageFieldId: 'cover' }),
    settings: { showcase: { featured: true, topic: 'ratings' } },
    visibility: 'public',
    edit: 'friends',
  },
  {
    id: L.expenses,
    owner: KIRILL,
    title: 'Расходы сентября',
    description: 'Инфографика семейного бюджета: круговая, столбцы, KPI и линия.',
    icon: '💸',
    template: 'blank',
    schema: schemas.expenses,
    view: views('v-table', [
      { id: 'v-table', name: 'Таблица', kind: 'table', dateFieldId: 'paid_at', titleFieldId: 'name' },
      { id: 'v-board', name: 'Категории', kind: 'board', groupFieldId: 'category', titleFieldId: 'name' },
      { id: 'v-time', name: 'Лента', kind: 'timeline', dateFieldId: 'paid_at', titleFieldId: 'name' },
    ], { mode: 'table', dateFieldId: 'paid_at' }),
    settings: { showcase: { featured: true, topic: 'charts' } },
    visibility: 'public',
    edit: 'selected',
  },
  {
    id: L.workouts,
    owner: LENA,
    title: 'Тренировки',
    description: 'Лента и календарь тренировок, минуты и самочувствие на графиках.',
    icon: '🏃',
    template: 'blank',
    schema: schemas.workouts,
    view: views('v-time', [
      { id: 'v-time', name: 'Лента', kind: 'timeline', dateFieldId: 'done_at', titleFieldId: 'title' },
      { id: 'v-cal', name: 'Календарь', kind: 'calendar', dateFieldId: 'done_at', titleFieldId: 'title' },
      { id: 'v-table', name: 'Таблица', kind: 'table', titleFieldId: 'title' },
    ], { mode: 'timeline', dateFieldId: 'done_at' }),
    settings: { showcase: { featured: true, topic: 'charts' } },
    visibility: 'public',
    edit: 'owner',
  },
  {
    id: L.release,
    owner: VITON,
    title: 'Релиз Chroniqe',
    description: 'Совместный чеклист запуска: выбранные редакторы правят, остальные предлагают.',
    icon: '🚀',
    template: 'todo',
    schema: schemas.todo,
    view: views('v-compact', [
      { id: 'v-compact', name: 'Чеклист', kind: 'cards', cardLayout: 'compact', groupFieldId: 'priority', titleFieldId: 'title' },
      { id: 'v-board', name: 'Приоритет', kind: 'board', groupFieldId: 'priority', titleFieldId: 'title' },
      { id: 'v-cal', name: 'Сроки', kind: 'calendar', dateFieldId: 'due', titleFieldId: 'title' },
    ], { mode: 'compact', groupFieldId: 'priority' }),
    settings: {
      showcase: { featured: true, topic: 'collab' },
      enableCheck: true,
      checkLabel: 'Готово',
      onCheck: [{ type: 'set_now', fieldId: 'done_at' }],
    },
    visibility: 'public',
    edit: 'selected',
  },
  {
    id: L.dinner,
    owner: ANNA,
    title: 'Ужины клуба',
    description: 'Кто готовит, когда встречаемся, оценки вечера. Правят друзья.',
    icon: '🍽️',
    template: 'blank',
    schema: schemas.dinner,
    view: views('v-cards', [
      { id: 'v-cards', name: 'Карточки', kind: 'cards', cardLayout: 'grid', groupFieldId: 'status', titleFieldId: 'title' },
      { id: 'v-cal', name: 'Календарь', kind: 'calendar', dateFieldId: 'when', titleFieldId: 'title' },
      { id: 'v-board', name: 'Статус', kind: 'board', groupFieldId: 'status', titleFieldId: 'title' },
    ], { mode: 'cards', groupFieldId: 'status' }),
    settings: { showcase: { featured: true, topic: 'collab' } },
    visibility: 'public',
    edit: 'friends',
  },
  {
    id: L.podcasts,
    owner: OLEG,
    title: 'Подкасты',
    description: 'Очередь выпусков с оценками и статусами на доске.',
    icon: '🎧',
    template: 'blank',
    schema: schemas.podcasts,
    view: views('v-table', [
      { id: 'v-table', name: 'Таблица', kind: 'table', titleFieldId: 'title' },
      { id: 'v-board', name: 'Статус', kind: 'board', groupFieldId: 'status', titleFieldId: 'title' },
    ], { mode: 'table' }),
    settings: { showcase: { featured: true, topic: 'ratings' } },
    visibility: 'public',
    edit: 'owner',
  },
  {
    id: L.events,
    owner: LENA,
    title: 'События осени',
    description: 'Концерты, кино и встречи в календарном виде.',
    icon: '🎫',
    template: 'blank',
    schema: schemas.events,
    view: views('v-cal', [
      { id: 'v-cal', name: 'Календарь', kind: 'calendar', dateFieldId: 'starts', titleFieldId: 'title' },
      { id: 'v-time', name: 'Лента', kind: 'timeline', dateFieldId: 'starts', titleFieldId: 'title' },
      { id: 'v-board', name: 'Тип', kind: 'board', groupFieldId: 'kind', titleFieldId: 'title' },
    ], { mode: 'timeline', dateFieldId: 'starts' }),
    settings: { showcase: { featured: true, topic: 'views' } },
    visibility: 'public',
    edit: 'friends',
  },
]

function rowItem(id, listId, position, values, createdBy, extra = {}) {
  return {
    id,
    list_id: listId,
    position,
    values,
    created_by: createdBy,
    is_checked: extra.checked ?? false,
    checked_at: extra.checked_at ?? null,
    created_at: extra.created_at ?? null,
  }
}

const items = [
  // watchlist existing + extra
  rowItem(item(101), L.watch, 1, { kind: 'movie', note: 'Досмотреть на большом экране', year: 2024, title: 'Дюна: Часть вторая', priority: 'now', poster: img('dune2') }, ANNA),
  rowItem(item(102), L.watch, 2, { kind: 'series', note: '2 сезон, когда выйдет', year: 2024, title: 'Шогун', priority: 'soon', poster: img('shogun') }, ANNA),
  rowItem(item(103), L.watch, 3, { kind: 'anime', year: 1997, title: 'Perfect Blue', priority: 'someday', poster: img('perfectblue') }, LENA),
  rowItem(item(104), L.watch, 4, { kind: 'movie', year: 2023, title: 'Зона интересов', priority: 'now', note: 'Предложил Кирилл', poster: img('zone') }, KIRILL),
  rowItem(item(105), L.watch, 5, { kind: 'series', year: 2023, title: 'The Bear', priority: 'soon', poster: img('thebear') }, ANNA),
  rowItem(item(106), L.watch, 6, { kind: 'doc', year: 2022, title: 'Fire of Love', priority: 'someday', poster: img('fireoflove') }, OLEG),
  rowItem(item(107), L.watch, 7, { kind: 'anime', year: 2016, title: 'Твоё имя', priority: 'soon', poster: img('yourname') }, LENA),
  rowItem(item(108), L.watch, 8, { kind: 'movie', year: 2019, title: 'Паразиты', priority: 'now', poster: img('parasite') }, ANNA),
  rowItem(item(109), L.watch, 9, { kind: 'series', year: 2024, title: 'Fallout', priority: 'someday', poster: img('fallout') }, KIRILL),

  // watched
  rowItem(item(111), L.watched, 1, { kind: 'movie', year: 2023, title: 'Оппенгеймер', review: 'Долго, но держит', watched_at: '2024-11-02', poster: img('oppenheimer') }, ANNA),
  rowItem(item(112), L.watched, 2, {
    kind: 'series', year: 2021, title: 'Игра в кальмара', review: 'Первый сезон лучше', watched_at: '2025-01-18', poster: img('squid'),
    seasons: [
      { season: 1, episodes: 9, finished_at: '2025-01-12', score: 8 },
      { season: 2, episodes: 7, finished_at: '2025-01-18', score: 6 },
    ],
  }, ANNA),
  rowItem(item(113), L.watched, 3, { kind: 'anime', year: 2001, title: 'Унесённые призраками', watched_at: '2024-06-12', poster: img('spirited') }, ANNA),
  rowItem(item(114), L.watched, 4, { kind: 'movie', year: 2009, title: 'Бесславные ублюдки', watched_at: '2025-03-04', poster: img('inglourious') }, ANNA),
  rowItem(item(115), L.watched, 5, { kind: 'movie', year: 2014, title: 'Интерстеллар', review: 'Пересматриваем раз в год', watched_at: '2025-08-14', poster: img('interstellar') }, KIRILL),
  rowItem(item(116), L.watched, 6, { kind: 'series', year: 2018, title: 'Чёрное зеркало', watched_at: '2025-04-22', poster: img('blackmirror'), seasons: [{ season: 4, episodes: 6, finished_at: '2025-04-22', score: 7 }] }, LENA),
  rowItem(item(117), L.watched, 7, { kind: 'doc', year: 2020, title: 'Мой учитель — осьминог', watched_at: '2024-09-30', poster: img('octopus') }, OLEG),
  rowItem(item(118), L.watched, 8, { kind: 'movie', year: 2022, title: 'Всё везде и сразу', review: 'Хаос, но тёплый', watched_at: '2025-06-01', poster: img('eeaao') }, ANNA),
  rowItem(item(119), L.watched, 9, { kind: 'anime', year: 2019, title: 'Дитя погоды', watched_at: '2025-07-19', poster: img('weathering') }, LENA),
  rowItem(item(120), L.watched, 10, { kind: 'movie', year: 1972, title: 'Крёстный отец', watched_at: '2024-12-28', poster: img('godfather') }, ANNA),
  rowItem(item(125), L.watched, 11, { kind: 'series', year: 2011, title: 'Игра престолов', review: 'Остановились на 6 сезоне', watched_at: '2025-02-08', poster: img('got') }, KIRILL),
  rowItem(item(126), L.watched, 12, { kind: 'movie', year: 2023, title: 'Бедные-несчастные', watched_at: '2025-05-11', poster: img('poorthings') }, ANNA),

  rowItem(item(121), L.dropped, 1, { kind: 'series', year: 2019, title: 'Эйфория', reason: 'Слишком тяжело по тону', decided_at: '2025-02-01' }, ANNA),
  rowItem(item(122), L.dropped, 2, { kind: 'series', year: 2022, title: 'Дом дракона', reason: 'Не зашёл темп', decided_at: '2025-03-12' }, ANNA),
  rowItem(item(123), L.dropped, 3, { kind: 'movie', year: 2023, title: 'Мегалополис', reason: 'Не тянет на вечер', decided_at: '2025-09-01' }, KIRILL),

  rowItem(item(201), L.shop, 1, { qty: 2, name: 'Молоко', category: 'food' }, KIRILL),
  rowItem(item(202), L.shop, 2, { qty: 1, name: 'Хлеб', category: 'food' }, KIRILL, { checked: true, checked_at: '2026-09-04T10:00:00Z' }),
  rowItem(item(203), L.shop, 3, { qty: 4, name: 'Лампочки E27', note: 'тёплый свет', category: 'home' }, KIRILL),
  rowItem(item(204), L.shop, 4, { qty: 1, name: 'Кабель USB-C', category: 'tech' }, KIRILL),
  rowItem(item(205), L.shop, 5, { qty: 1, name: 'Яйца С0', category: 'food', note: 'на завтрак' }, ANNA),
  rowItem(item(206), L.shop, 6, { qty: 2, name: 'Рис басмати', category: 'food' }, KIRILL),
  rowItem(item(207), L.shop, 7, { qty: 1, name: 'Гель для душа', category: 'home' }, LENA),
  rowItem(item(208), L.shop, 8, { qty: 1, name: 'Батарейки AAA', category: 'tech' }, OLEG),
  rowItem(item(209), L.shop, 9, { qty: 3, name: 'Йогурт греческий', category: 'food' }, ANNA),
  rowItem(item(210), L.shop, 10, { qty: 1, name: 'Скотч малярный', category: 'home' }, KIRILL),

  rowItem(item(211), L.bought, 1, { qty: 1, name: 'Кофе зерно', price: 890, category: 'food', bought_at: '2026-09-01' }, KIRILL),
  rowItem(item(212), L.bought, 2, { qty: 2, name: 'Моющие салфетки', price: 240, category: 'home', bought_at: '2026-09-03' }, KIRILL),
  rowItem(item(213), L.bought, 3, { qty: 1, name: 'Оливковое масло', price: 620, category: 'food', bought_at: '2026-09-03' }, ANNA),
  rowItem(item(214), L.bought, 4, { qty: 1, name: 'Мыло хозяйственное', price: 90, category: 'home', bought_at: '2026-09-04' }, KIRILL),
  rowItem(item(215), L.bought, 5, { qty: 1, name: 'Наушники-вкладыши', price: 1490, category: 'tech', bought_at: '2026-09-05' }, OLEG),
  rowItem(item(216), L.bought, 6, { qty: 6, name: 'Яблоки сезонные', price: 210, category: 'food', bought_at: '2026-09-05' }, LENA),
  rowItem(item(217), L.bought, 7, { qty: 1, name: 'Зубная паста', price: 180, category: 'home', bought_at: '2026-08-28' }, KIRILL),
  rowItem(item(218), L.bought, 8, { qty: 1, name: 'SSD 1 ТБ', price: 7990, category: 'tech', bought_at: '2026-08-20' }, KIRILL),
  rowItem(item(219), L.bought, 9, { qty: 2, name: 'Билеты в кино', price: 900, category: 'other', bought_at: '2026-08-30' }, ANNA),
  rowItem(item(220), L.bought, 10, { qty: 1, name: 'Дождевик', price: 650, category: 'other', bought_at: '2026-09-02' }, LENA),

  rowItem(item(221), L.later, 1, { qty: 1, name: 'Гирлянда', note: 'тёплая, 10 м', when: 'к Новому году' }, KIRILL),
  rowItem(item(222), L.later, 2, { qty: 1, name: 'Форма для кекса', when: 'к дню рождения', note: 'разъёмная 24 см' }, ANNA),
  rowItem(item(223), L.later, 3, { qty: 2, name: 'Плед', when: 'к даче' }, KIRILL),

  rowItem(item(301), L.games, 1, { note: 'Залипла надолго', hours: 40, title: 'Hades', status: 'hundred', platform: 'switch', finished_at: '2024-02-11', cover: img('hades') }, LENA),
  rowItem(item(302), L.games, 2, { hours: 92, title: "Baldur's Gate 3", status: 'completed', platform: 'pc', finished_at: '2025-05-20', cover: img('bg3') }, LENA),
  rowItem(item(303), L.games, 3, { hours: 12, title: 'Celeste', status: 'main', platform: 'switch', finished_at: '2023-11-03', cover: img('celeste') }, LENA),
  rowItem(item(304), L.games, 4, { hours: 28, title: 'Hades II', status: 'main', platform: 'pc', finished_at: '2026-03-02', cover: img('hades2'), note: 'Ещё не всё открыто' }, ANNA),
  rowItem(item(305), L.games, 5, { hours: 55, title: 'Elden Ring', status: 'completed', platform: 'ps', finished_at: '2024-08-17', cover: img('elden') }, KIRILL),
  rowItem(item(306), L.games, 6, { hours: 18, title: 'Stardew Valley', status: 'hundred', platform: 'switch', finished_at: '2025-01-09', cover: img('stardew') }, OLEG),
  rowItem(item(307), L.games, 7, { hours: 8, title: 'Unpacking', status: 'completed', platform: 'xbox', finished_at: '2024-12-02', cover: img('unpacking') }, LENA),
  rowItem(item(308), L.games, 8, { hours: 22, title: 'Outer Wilds', status: 'completed', platform: 'pc', finished_at: '2025-09-14', cover: img('outerwilds') }, ANNA),
  rowItem(item(309), L.games, 9, { hours: 6, title: 'Vampire Survivors', status: 'dropped', platform: 'mobile', finished_at: '2026-01-20', cover: img('vampires') }, KIRILL),
  rowItem(item(310), L.games, 10, { hours: 35, title: 'The Witcher 3', status: 'main', platform: 'ps', finished_at: '2023-06-21', cover: img('witcher3') }, OLEG),

  rowItem(item(311), L.books, 1, { title: 'Мастер и Маргарита', author: 'Булгаков', status: 'done', finished_at: '2024-06-01', cover: img('master') }, LENA),
  rowItem(item(312), L.books, 2, { title: 'Проект «Аве Мария»', author: 'Энди Вейер', status: 'reading', cover: img('hailmary') }, LENA),
  rowItem(item(313), L.books, 3, { title: 'Дюна', author: 'Фрэнк Герберт', status: 'want', cover: img('dunebook') }, LENA),
  rowItem(item(314), L.books, 4, { title: '1984', author: 'Оруэлл', status: 'done', finished_at: '2025-02-14', cover: img('orwell') }, ANNA),
  rowItem(item(315), L.books, 5, { title: 'Трудно быть богом', author: 'Стругацкие', status: 'done', finished_at: '2025-11-03', cover: img('hardgod') }, KIRILL),
  rowItem(item(316), L.books, 6, { title: 'Нормальные люди', author: 'Салли Руни', status: 'reading', cover: img('normalpeople') }, ANNA),
  rowItem(item(317), L.books, 7, { title: 'Сияние', author: 'Стивен Кинг', status: 'want', cover: img('shining') }, OLEG),
  rowItem(item(318), L.books, 8, { title: 'Пикник на обочине', author: 'Стругацкие', status: 'done', finished_at: '2024-10-19', cover: img('picnic') }, LENA),
  rowItem(item(319), L.books, 9, { title: 'Кладбище домашних животных', author: 'Стивен Кинг', status: 'dropped', note: 'Не вечером', cover: img('petcemetery') }, ANNA),
  rowItem(item(320), L.books, 10, { title: 'Ход королевы', author: 'Уолтер Тевис', status: 'want', cover: img('gambit') }, KIRILL),

  rowItem(item(321), L.week, 1, { due: '2026-09-08', title: 'Оплатить интернет', priority: 'high' }, LENA),
  rowItem(item(322), L.week, 2, { due: '2026-09-12', title: 'Собрать аптечку', priority: 'mid' }, LENA, { checked: true }),
  rowItem(item(323), L.week, 3, { due: '2026-09-06', title: 'Забрать посылку', priority: 'high' }, LENA),
  rowItem(item(324), L.week, 4, { due: '2026-09-10', title: 'Написать Лене по работе', priority: 'mid' }, LENA),

  rowItem(item(401), L.todos, 1, { due: '2026-09-06', title: 'Заказать фильтр для воды', priority: 'high' }, OLEG),
  rowItem(item(402), L.todos, 2, { due: '2026-09-20', title: 'Разобрать ящик с проводами', priority: 'low' }, OLEG),
  rowItem(item(403), L.todos, 3, { due: '2026-09-07', title: 'Позвонить в УК', priority: 'high', notes: 'Счёт за август' }, OLEG),
  rowItem(item(404), L.todos, 4, { due: '2026-09-09', title: 'Купить грунт для фикуса', priority: 'mid' }, OLEG),
  rowItem(item(405), L.todos, 5, { due: '2026-09-04', title: 'Отдать куртку в химчистку', priority: 'mid' }, OLEG),
  rowItem(item(406), L.todos, 6, { due: '2026-09-15', title: 'Записаться к стоматологу', priority: 'high' }, OLEG),
  rowItem(item(407), L.todos, 7, { due: '2026-09-18', title: 'Протереть окна', priority: 'low' }, OLEG, { checked: true }),
  rowItem(item(408), L.todos, 8, { due: '2026-09-22', title: 'Обновить резюме', priority: 'low' }, OLEG),
  rowItem(item(409), L.todos, 9, { due: '2026-09-11', title: 'Отвезти велосипед', priority: 'mid' }, OLEG),
  rowItem(item(410), L.todos, 10, { due: '2026-09-25', title: 'Купить билеты на выставку', priority: 'low' }, OLEG),

  rowItem(item(411), L.recipes, 1, { tag: 'soup', time: 90, title: 'Борщ', servings: 6, photo: img('borscht') }, OLEG),
  rowItem(item(412), L.recipes, 2, { tag: 'main', time: 25, title: 'Паста карбонара', servings: 2, photo: img('carbonara') }, OLEG),
  rowItem(item(413), L.recipes, 3, { tag: 'dessert', time: 40, title: 'Тирамису', servings: 8, photo: img('tiramisu') }, OLEG),
  rowItem(item(414), L.recipes, 4, { tag: 'main', time: 45, title: 'Плов', servings: 4, photo: img('plov') }, ANNA),
  rowItem(item(415), L.recipes, 5, { tag: 'soup', time: 35, title: 'Тыквенный крем-суп', servings: 4, photo: img('pumpkin') }, LENA),
  rowItem(item(416), L.recipes, 6, { tag: 'bake', time: 70, title: 'Яблочный пирог', servings: 8, photo: img('applepie') }, KIRILL),
  rowItem(item(417), L.recipes, 7, { tag: 'dessert', time: 20, title: 'Панакота', servings: 4, photo: img('panna') }, ANNA),
  rowItem(item(418), L.recipes, 8, { tag: 'main', time: 30, title: 'Лосось в духовке', servings: 2, photo: img('salmon') }, OLEG),
  rowItem(item(419), L.recipes, 9, { tag: 'bake', time: 50, title: 'Фокачча', servings: 6, photo: img('focaccia') }, LENA),
  rowItem(item(420), L.recipes, 10, { tag: 'soup', time: 25, title: 'Мисо', servings: 2, photo: img('miso') }, KIRILL),

  rowItem(item(421), L.vinyl, 1, { cond: 'vg', year: 1959, title: 'Kind of Blue', artist: 'Miles Davis', cover: img('kindofblue') }, OLEG),
  rowItem(item(422), L.vinyl, 2, { cond: 'mint', year: 1973, title: 'The Dark Side of the Moon', artist: 'Pink Floyd', cover: img('dsotm') }, OLEG),
  rowItem(item(423), L.vinyl, 3, { cond: 'mint', year: 1971, title: "What's Going On", artist: 'Marvin Gaye', cover: img('wgo') }, ANNA),
  rowItem(item(424), L.vinyl, 4, { cond: 'vg', year: 1967, title: 'Sgt. Pepper', artist: 'The Beatles', cover: img('pepper') }, KIRILL),
  rowItem(item(425), L.vinyl, 5, { cond: 'g', year: 1975, title: 'Wish You Were Here', artist: 'Pink Floyd', cover: img('wywh') }, OLEG),
  rowItem(item(426), L.vinyl, 6, { cond: 'mint', year: 2015, title: 'To Pimp a Butterfly', artist: 'Kendrick Lamar', cover: img('tpab') }, LENA),
  rowItem(item(427), L.vinyl, 7, { cond: 'vg', year: 1986, title: 'Graceland', artist: 'Paul Simon', cover: img('graceland') }, OLEG),
  rowItem(item(428), L.vinyl, 8, { cond: 'mint', year: 1997, title: 'Homogenic', artist: 'Björk', cover: img('homogenic') }, ANNA),
  rowItem(item(429), L.vinyl, 9, { cond: 'vg', year: 1977, title: 'Rumours', artist: 'Fleetwood Mac', cover: img('rumours') }, KIRILL),
  rowItem(item(430), L.vinyl, 10, { cond: 'g', year: 1969, title: 'Abbey Road', artist: 'The Beatles', cover: img('abbey') }, OLEG),

  rowItem(item(501), L.ideas, 1, { notes: 'Сейчас схема остаётся на языке создания', title: 'Шаблоны полей на выбранном языке', priority: 'high' }, VITON),
  rowItem(item(502), L.ideas, 2, { title: 'Приглашения по ссылке без аккаунта', priority: 'mid' }, VITON),
  rowItem(item(503), L.ideas, 3, { title: 'Экспорт PDF', priority: 'low' }, VITON),
  rowItem(item(504), L.ideas, 4, { title: 'Офлайн-черновик записи', priority: 'mid', notes: 'Если сеть пропала' }, ANNA),
  rowItem(item(505), L.ideas, 5, { title: 'Вид «карта» для мест', priority: 'low' }, OLEG),
  rowItem(item(506), L.ideas, 6, { title: 'Пакетный импорт из Letterboxd', priority: 'high' }, KIRILL),
  rowItem(item(507), L.ideas, 7, { title: 'Тёмные обложки списков', priority: 'low' }, LENA),
  rowItem(item(508), L.ideas, 8, { title: 'Напоминания о сроке в браузере', priority: 'mid' }, VITON),
  rowItem(item(509), L.ideas, 9, { title: 'Общие шаблоны клуба', priority: 'high' }, ANNA),

  rowItem(item(601), L.backlog, 1, { title: 'Clair Obscur: Expedition 33', platform: 'ps', priority: 'now', cover: img('expedition'), note: 'Все хвалят' }, LENA),
  rowItem(item(602), L.backlog, 2, { title: 'Hollow Knight: Silksong', platform: 'switch', priority: 'now', cover: img('silksong') }, ANNA),
  rowItem(item(603), L.backlog, 3, { title: 'Disco Elysium', platform: 'pc', priority: 'soon', cover: img('disco') }, KIRILL),
  rowItem(item(604), L.backlog, 4, { title: 'Animal Crossing', platform: 'switch', priority: 'someday', cover: img('acnh') }, OLEG),
  rowItem(item(605), L.backlog, 5, { title: 'Returnal', platform: 'ps', priority: 'soon', cover: img('returnal') }, LENA),
  rowItem(item(606), L.backlog, 6, { title: 'Slay the Spire 2', platform: 'pc', priority: 'now', cover: img('sts2') }, KIRILL),
  rowItem(item(607), L.backlog, 7, { title: 'Death Stranding', platform: 'pc', priority: 'someday', cover: img('ds') }, ANNA),
  rowItem(item(608), L.backlog, 8, { title: 'Balatro', platform: 'mobile', priority: 'soon', cover: img('balatro') }, OLEG),
  rowItem(item(609), L.backlog, 9, { title: 'Sea of Stars', platform: 'xbox', priority: 'someday', cover: img('sos') }, LENA),

  rowItem(item(621), L.sprint, 1, { title: 'Починить перенос записи', status: 'doing', owner: 'kirill', points: 5, due: '2026-09-08' }, KIRILL),
  rowItem(item(622), L.sprint, 2, { title: 'Календарь: просрочки', status: 'review', owner: 'anna', points: 3, due: '2026-09-07' }, ANNA),
  rowItem(item(623), L.sprint, 3, { title: 'Тексты шаблонов EN', status: 'done', owner: 'lena', points: 2, due: '2026-09-04' }, LENA, { checked: true }),
  rowItem(item(624), L.sprint, 4, { title: 'Онбординг по ссылке', status: 'backlog', owner: 'oleg', points: 8, due: '2026-09-18' }, OLEG),
  rowItem(item(625), L.sprint, 5, { title: 'Фильтры по оценке', status: 'doing', owner: 'anna', points: 3, due: '2026-09-09' }, ANNA),
  rowItem(item(626), L.sprint, 6, { title: 'Экспорт CSV с видами', status: 'backlog', owner: 'kirill', points: 5, due: '2026-09-20' }, KIRILL),
  rowItem(item(627), L.sprint, 7, { title: 'Пустые состояния графиков', status: 'review', owner: 'lena', points: 2, due: '2026-09-06' }, LENA),
  rowItem(item(628), L.sprint, 8, { title: 'Аватар в комментарии', status: 'done', owner: 'oleg', points: 1, due: '2026-09-03' }, OLEG, { checked: true }),
  rowItem(item(629), L.sprint, 9, { title: 'Клавиатура на доске', status: 'doing', owner: 'kirill', points: 5, due: '2026-09-11' }, KIRILL),
  rowItem(item(630), L.sprint, 10, { title: 'Подсказки шаблонов', status: 'backlog', owner: 'anna', points: 3, due: '2026-09-22' }, ANNA),
  rowItem(item(631), L.sprint, 11, { title: 'Сводка на дашборде', status: 'review', owner: 'lena', points: 8, due: '2026-09-10' }, LENA),

  rowItem(item(641), L.trips, 1, { title: 'Выходные в Выборге', place: 'Выборг', starts: '2026-09-12', kind: 'city', budget: 12000, cover: img('vyborg') }, ANNA),
  rowItem(item(642), L.trips, 2, { title: 'Карелия, палатки', place: 'Сортавала', starts: '2026-09-26', kind: 'nature', budget: 18000, cover: img('karelia') }, KIRILL),
  rowItem(item(643), L.trips, 3, { title: 'К родителям', place: 'Тверь', starts: '2026-10-03', kind: 'visit', budget: 4000, cover: img('tver') }, ANNA),
  rowItem(item(644), L.trips, 4, { title: 'Конференция', place: 'Москва', starts: '2026-10-16', kind: 'work', budget: 22000, cover: img('msk') }, LENA),
  rowItem(item(645), L.trips, 5, { title: 'Золотое кольцо', place: 'Суздаль', starts: '2026-11-07', kind: 'city', budget: 15000, cover: img('suzdal') }, OLEG),
  rowItem(item(646), L.trips, 6, { title: 'Новый год в лесу', place: 'Валдай', starts: '2026-12-31', kind: 'nature', budget: 28000, cover: img('valday') }, ANNA),
  rowItem(item(647), L.trips, 7, { title: 'Питер на выходные', place: 'Санкт-Петербург', starts: '2026-09-05', kind: 'city', budget: 9000, cover: img('spb') }, KIRILL),
  rowItem(item(648), L.trips, 8, { title: 'Дача в мае', place: 'Клин', starts: '2026-05-02', kind: 'visit', budget: 6000, cover: img('dacha') }, ANNA),

  rowItem(item(661), L.places, 1, { title: 'Кофейня на углу', city: 'Москва', kind: 'cafe', visited_at: '2026-08-12', cover: img('cafe1'), note: 'Тихий утро' }, OLEG),
  rowItem(item(662), L.places, 2, { title: 'Парк Горького', city: 'Москва', kind: 'park', visited_at: '2026-07-03', cover: img('gorky') }, ANNA),
  rowItem(item(663), L.places, 3, { title: 'Гараж', city: 'Москва', kind: 'museum', visited_at: '2026-06-18', cover: img('garage') }, LENA),
  rowItem(item(664), L.places, 4, { title: 'Винный бар Юность', city: 'Москва', kind: 'bar', visited_at: '2026-08-29', cover: img('bar1') }, KIRILL),
  rowItem(item(665), L.places, 5, { title: 'Набережная', city: 'Санкт-Петербург', kind: 'walk', visited_at: '2026-09-05', cover: img('embankment') }, ANNA),
  rowItem(item(666), L.places, 6, { title: 'Эрмитаж', city: 'Санкт-Петербург', kind: 'museum', visited_at: '2026-09-06', cover: img('hermitage') }, KIRILL),
  rowItem(item(667), L.places, 7, { title: 'Булочная №1', city: 'Москва', kind: 'cafe', visited_at: '2026-05-22', cover: img('bakery') }, OLEG),
  rowItem(item(668), L.places, 8, { title: 'Сокольники', city: 'Москва', kind: 'park', visited_at: '2026-04-11', cover: img('sokolniki') }, LENA),
  rowItem(item(669), L.places, 9, { title: 'Крыша на Покровке', city: 'Москва', kind: 'bar', visited_at: '2026-07-25', cover: img('roof') }, ANNA),
  rowItem(item(670), L.places, 10, { title: 'ВДнХ вечером', city: 'Москва', kind: 'walk', visited_at: '2026-08-01', cover: img('vdnh') }, OLEG),

  rowItem(item(681), L.expenses, 1, { name: 'Продукты на неделю', amount: 6200, category: 'food', paid_at: '2026-09-01', who: 'kirill' }, KIRILL),
  rowItem(item(682), L.expenses, 2, { name: 'Аренда', amount: 55000, category: 'home', paid_at: '2026-09-02', who: 'shared' }, KIRILL),
  rowItem(item(683), L.expenses, 3, { name: 'Метро и такси', amount: 1800, category: 'transport', paid_at: '2026-09-03', who: 'anna' }, ANNA),
  rowItem(item(684), L.expenses, 4, { name: 'Кино', amount: 1400, category: 'fun', paid_at: '2026-09-04', who: 'shared' }, ANNA),
  rowItem(item(685), L.expenses, 5, { name: 'Аптека', amount: 890, category: 'health', paid_at: '2026-09-04', who: 'kirill' }, KIRILL),
  rowItem(item(686), L.expenses, 6, { name: 'Ужин в кафе', amount: 3200, category: 'fun', paid_at: '2026-09-05', who: 'shared' }, OLEG),
  rowItem(item(687), L.expenses, 7, { name: 'Коммуналка', amount: 7100, category: 'home', paid_at: '2026-09-05', who: 'kirill' }, KIRILL),
  rowItem(item(688), L.expenses, 8, { name: 'Кофе с собой', amount: 420, category: 'food', paid_at: '2026-09-06', who: 'anna' }, ANNA),
  rowItem(item(689), L.expenses, 9, { name: 'Велопрокат', amount: 600, category: 'transport', paid_at: '2026-09-06', who: 'lena' }, LENA),
  rowItem(item(690), L.expenses, 10, { name: 'Йога', amount: 1500, category: 'health', paid_at: '2026-09-07', who: 'lena' }, LENA),
  rowItem(item(691), L.expenses, 11, { name: 'Рынок', amount: 2100, category: 'food', paid_at: '2026-08-28', who: 'shared' }, KIRILL),
  rowItem(item(692), L.expenses, 12, { name: 'Настолки', amount: 2400, category: 'fun', paid_at: '2026-08-30', who: 'shared' }, ANNA),

  rowItem(item(701), L.workouts, 1, { title: 'Утренний кросс', kind: 'run', minutes: 32, done_at: '2026-09-01', feel: 8 }, LENA),
  rowItem(item(702), L.workouts, 2, { title: 'Спина и ноги', kind: 'strength', minutes: 50, done_at: '2026-09-02', feel: 7 }, LENA),
  rowItem(item(703), L.workouts, 3, { title: 'Йога перед сном', kind: 'yoga', minutes: 25, done_at: '2026-09-03', feel: 9 }, ANNA),
  rowItem(item(704), L.workouts, 4, { title: 'Прогулка в парке', kind: 'walk', minutes: 40, done_at: '2026-09-04', feel: 8 }, OLEG),
  rowItem(item(705), L.workouts, 5, { title: 'Интервалы', kind: 'run', minutes: 28, done_at: '2026-09-05', feel: 6 }, LENA),
  rowItem(item(706), L.workouts, 6, { title: 'Жим и тяга', kind: 'strength', minutes: 55, done_at: '2026-09-06', feel: 8 }, KIRILL),
  rowItem(item(707), L.workouts, 7, { title: 'Растяжка', kind: 'yoga', minutes: 20, done_at: '2026-08-30', feel: 7 }, LENA),
  rowItem(item(708), L.workouts, 8, { title: '10 км', kind: 'run', minutes: 58, done_at: '2026-08-24', feel: 9 }, LENA),
  rowItem(item(709), L.workouts, 9, { title: 'Ходьба на работу', kind: 'walk', minutes: 35, done_at: '2026-09-07', feel: 7 }, ANNA),
  rowItem(item(710), L.workouts, 10, { title: 'Плечи', kind: 'strength', minutes: 40, done_at: '2026-09-08', feel: 6 }, KIRILL),

  rowItem(item(721), L.release, 1, { title: 'Проверить публичные примеры', priority: 'high', due: '2026-09-06', notes: 'Лента и графики' }, VITON),
  rowItem(item(722), L.release, 2, { title: 'Текст лендинга', priority: 'mid', due: '2026-09-08' }, ANNA),
  rowItem(item(723), L.release, 3, { title: 'Починить шаринг по ссылке', priority: 'high', due: '2026-09-07' }, KIRILL),
  rowItem(item(724), L.release, 4, { title: 'Скриншоты видов', priority: 'mid', due: '2026-09-10' }, LENA),
  rowItem(item(725), L.release, 5, { title: 'Проверка RLS на графиках', priority: 'high', due: '2026-09-05' }, VITON, { checked: true }),
  rowItem(item(726), L.release, 6, { title: 'Демо-аккаунты в README', priority: 'low', due: '2026-09-12' }, OLEG),
  rowItem(item(727), L.release, 7, { title: 'Пустые состояния Explore', priority: 'mid', due: '2026-09-09' }, ANNA),
  rowItem(item(728), L.release, 8, { title: 'Нагрузочный список 50 записей', priority: 'low', due: '2026-09-15' }, KIRILL),
  rowItem(item(729), L.release, 9, { title: 'Перевод шаблонов', priority: 'mid', due: '2026-09-11' }, LENA),
  rowItem(item(730), L.release, 10, { title: 'Финальный проход по мобиле', priority: 'high', due: '2026-09-13' }, VITON),

  rowItem(item(741), L.dinner, 1, { title: 'Паста-вечер', host: 'oleg', when: '2026-09-06', dish: 'Карбонара', status: 'done', note: 'Принесли вино' }, ANNA),
  rowItem(item(742), L.dinner, 2, { title: 'Борщ и пирожки', host: 'anna', when: '2026-09-13', dish: 'Борщ', status: 'planned' }, ANNA),
  rowItem(item(743), L.dinner, 3, { title: 'Азиатская ночь', host: 'lena', when: '2026-09-20', dish: 'Рамен', status: 'idea' }, LENA),
  rowItem(item(744), L.dinner, 4, { title: 'Завтрак на ужин', host: 'kirill', when: '2026-09-27', dish: 'Сырники', status: 'planned' }, KIRILL),
  rowItem(item(745), L.dinner, 5, { title: 'Пикник', host: 'anna', when: '2026-08-16', dish: 'Сэндвичи', status: 'done' }, ANNA),
  rowItem(item(746), L.dinner, 6, { title: 'Веган-эксперимент', host: 'oleg', when: '2026-10-04', dish: 'Нут с тыквой', status: 'idea' }, OLEG),
  rowItem(item(747), L.dinner, 7, { title: 'Суши дома', host: 'lena', when: '2026-08-02', dish: 'Роллы', status: 'done' }, LENA),
  rowItem(item(748), L.dinner, 8, { title: 'День супа', host: 'kirill', when: '2026-10-11', dish: 'Мисо', status: 'idea' }, KIRILL),

  rowItem(item(761), L.podcasts, 1, { title: 'Как устроены списки', show: 'Build Log', status: 'done', mins: 48, finished_at: '2026-08-20' }, OLEG),
  rowItem(item(762), L.podcasts, 2, { title: 'Почему оценки врут', show: 'Data Club', status: 'listening', mins: 62 }, ANNA),
  rowItem(item(763), L.podcasts, 3, { title: 'Настолки 2026', show: 'Table Talk', status: 'queue', mins: 55 }, KIRILL),
  rowItem(item(764), L.podcasts, 4, { title: 'Сон и тренировки', show: 'Body Notes', status: 'done', mins: 34, finished_at: '2026-09-01' }, LENA),
  rowItem(item(765), L.podcasts, 5, { title: 'Питер за выходные', show: 'Города', status: 'queue', mins: 41 }, ANNA),
  rowItem(item(766), L.podcasts, 6, { title: 'Винил vs стриминг', show: 'Sound Room', status: 'done', mins: 52, finished_at: '2026-07-14' }, OLEG),
  rowItem(item(767), L.podcasts, 7, { title: 'Кино без спойлеров', show: 'Кассета', status: 'listening', mins: 70 }, KIRILL),
  rowItem(item(768), L.podcasts, 8, { title: 'Еда в дороге', show: 'Кухня', status: 'queue', mins: 28 }, LENA),

  rowItem(item(781), L.events, 1, { title: 'Концерт на крыше', venue: 'Музеон', starts: '2026-09-12', kind: 'concert', price: 1500 }, LENA),
  rowItem(item(782), L.events, 2, { title: 'Ретро в Иллюзионе', venue: 'Иллюзион', starts: '2026-09-08', kind: 'cinema', price: 450 }, ANNA),
  rowItem(item(783), L.events, 3, { title: 'Парковый забег', venue: 'Сокольники', starts: '2026-09-14', kind: 'sport', price: 0 }, LENA),
  rowItem(item(784), L.events, 4, { title: 'Встреча книжного', venue: 'Фаланстер', starts: '2026-09-18', kind: 'meetup', price: 0 }, KIRILL),
  rowItem(item(785), L.events, 5, { title: 'Джаз в саду', venue: 'Эрмитаж', starts: '2026-09-26', kind: 'concert', price: 2000 }, OLEG),
  rowItem(item(786), L.events, 6, { title: 'Премьера', venue: 'Октябрь', starts: '2026-10-02', kind: 'cinema', price: 700 }, ANNA),
  rowItem(item(787), L.events, 7, { title: 'Настолки у Кирилла', venue: 'Дома', starts: '2026-09-07', kind: 'meetup', price: 0 }, KIRILL),
  rowItem(item(788), L.events, 8, { title: 'Велозаезд', venue: 'Воробьёвы', starts: '2026-09-20', kind: 'sport', price: 0 }, LENA),
]

const ratings = [
  [item(111), 'ratings', ANNA, 9],
  [item(111), 'ratings', LENA, 8],
  [item(111), 'ratings', KIRILL, 9],
  [item(112), 'ratings', ANNA, 7],
  [item(112), 'ratings', OLEG, 6],
  [item(113), 'ratings', ANNA, 10],
  [item(113), 'ratings', KIRILL, 9],
  [item(113), 'ratings', LENA, 10],
  [item(114), 'ratings', ANNA, 8],
  [item(114), 'ratings', OLEG, 9],
  [item(115), 'ratings', KIRILL, 10],
  [item(115), 'ratings', ANNA, 9],
  [item(115), 'ratings', LENA, 8],
  [item(116), 'ratings', LENA, 7],
  [item(117), 'ratings', OLEG, 9],
  [item(117), 'ratings', ANNA, 8],
  [item(118), 'ratings', ANNA, 9],
  [item(118), 'ratings', KIRILL, 8],
  [item(120), 'ratings', ANNA, 10],
  [item(120), 'ratings', KIRILL, 10],
  [item(120), 'ratings', LENA, 9],
  [item(301), 'ratings', LENA, 10],
  [item(301), 'ratings', ANNA, 9],
  [item(301), 'ratings', KIRILL, 9],
  [item(302), 'ratings', LENA, 9],
  [item(302), 'ratings', OLEG, 10],
  [item(303), 'ratings', LENA, 10],
  [item(305), 'ratings', KIRILL, 10],
  [item(305), 'ratings', LENA, 8],
  [item(306), 'ratings', OLEG, 9],
  [item(308), 'ratings', ANNA, 10],
  [item(308), 'ratings', LENA, 10],
  [item(311), 'ratings', LENA, 10],
  [item(311), 'ratings', ANNA, 9],
  [item(314), 'ratings', ANNA, 9],
  [item(314), 'ratings', KIRILL, 8],
  [item(318), 'ratings', LENA, 10],
  [item(318), 'ratings', OLEG, 9],
  [item(661), 'ratings', OLEG, 8],
  [item(661), 'ratings', ANNA, 9],
  [item(661), 'ratings', LENA, 7],
  [item(662), 'ratings', ANNA, 9],
  [item(662), 'ratings', KIRILL, 8],
  [item(663), 'ratings', LENA, 10],
  [item(663), 'ratings', ANNA, 8],
  [item(664), 'ratings', KIRILL, 7],
  [item(664), 'ratings', OLEG, 8],
  [item(666), 'ratings', KIRILL, 10],
  [item(666), 'ratings', ANNA, 10],
  [item(666), 'ratings', LENA, 9],
  [item(741), 'ratings', ANNA, 9],
  [item(741), 'ratings', KIRILL, 8],
  [item(741), 'ratings', LENA, 9],
  [item(741), 'ratings', OLEG, 8],
  [item(745), 'ratings', ANNA, 8],
  [item(745), 'ratings', OLEG, 7],
  [item(747), 'ratings', LENA, 9],
  [item(747), 'ratings', ANNA, 8],
  [item(761), 'ratings', OLEG, 8],
  [item(764), 'ratings', LENA, 9],
  [item(766), 'ratings', OLEG, 10],
  [item(766), 'ratings', ANNA, 8],
]

const comments = [
  [note(1), item(111), LENA, 'Второй раз смотрела уже спокойнее.', 'teal'],
  [note(2), item(111), KIRILL, 'Звук в кинотеатре решает.', 'amber'],
  [note(3), item(112), OLEG, 'Второй сезон можно было короче.', 'rose'],
  [note(4), item(301), ANNA, 'Рогалики навсегда.', 'violet'],
  [note(5), item(302), KIRILL, '92 часа — это ещё скромно.', 'sky'],
  [note(6), item(311), ANNA, 'Перечитываем каждые пару лет.', 'emerald'],
  [note(7), item(622), LENA, 'На ревью после фильтров.', 'slate'],
  [note(8), item(621), ANNA, 'Проверила на покупках — ок.', 'teal'],
  [note(9), item(641), KIRILL, 'Беру выходной в пятницу.', 'amber'],
  [note(10), item(661), ANNA, 'Там отличный флет уайт.', 'rose'],
  [note(11), item(682), ANNA, 'Делим как обычно 50/50.', 'violet'],
  [note(12), item(721), ANNA, 'Ленту уже можно показывать.', 'emerald'],
  [note(13), item(741), OLEG, 'В следующий раз больше сыра.', 'amber'],
  [note(14), item(781), KIRILL, 'Беру два билета.', 'sky'],
  [note(15), item(108), LENA, 'Если не будет на большом — дома.', 'slate'],
  [note(16), item(318), OLEG, 'После этого всегда хочется в Зону.', 'teal'],
]

const charts = [
  [chart(1), L.watched, 'Лента просмотров', 'timeline', { aggregation: 'count', dateFieldId: 'watched_at' }],
  [chart(2), L.watched, 'Средние оценки во времени', 'stem', { aggregation: 'avg', dateFieldId: 'watched_at', valueFieldId: 'ratings' }],
  [chart(3), L.watched, 'Типы тайтлов', 'pie', { groupFieldId: 'kind' }],
  [chart(4), L.watched, 'Сводка клуба', 'kpi', { valueFieldId: 'ratings', aggregation: 'avg' }],
  [chart(5), L.bought, 'Траты по дням', 'bar', { aggregation: 'sum', dateFieldId: 'bought_at', valueFieldId: 'price' }],
  [chart(6), L.bought, 'Категории покупок', 'pie', { groupFieldId: 'category' }],
  [chart(7), L.bought, 'KPI покупок', 'kpi', { valueFieldId: 'price', aggregation: 'sum' }],
  [chart(8), L.games, 'Когда проходили', 'timeline', { aggregation: 'count', dateFieldId: 'finished_at' }],
  [chart(9), L.games, 'Оценки по времени', 'stem', { aggregation: 'avg', dateFieldId: 'finished_at', valueFieldId: 'ratings' }],
  [chart(10), L.games, 'Платформы', 'pie', { groupFieldId: 'platform' }],
  [chart(11), L.books, 'Статусы полок', 'pie', { groupFieldId: 'status' }],
  [chart(12), L.books, 'Сводка клуба', 'kpi', { valueFieldId: 'ratings', aggregation: 'avg' }],
  [chart(13), L.sprint, 'Колонки спринта', 'pie', { groupFieldId: 'status' }],
  [chart(14), L.sprint, 'KPI спринта', 'kpi', { aggregation: 'count' }],
  [chart(15), L.trips, 'Бюджет по датам', 'bar', { aggregation: 'sum', dateFieldId: 'starts', valueFieldId: 'budget' }],
  [chart(16), L.trips, 'Типы поездок', 'pie', { groupFieldId: 'kind' }],
  [chart(17), L.places, 'Типы мест', 'pie', { groupFieldId: 'kind' }],
  [chart(18), L.places, 'Оценки во времени', 'stem', { aggregation: 'avg', dateFieldId: 'visited_at', valueFieldId: 'ratings' }],
  [chart(19), L.places, 'Сводка мест', 'kpi', { valueFieldId: 'ratings', aggregation: 'avg' }],
  [chart(20), L.expenses, 'Траты по дням', 'bar', { aggregation: 'sum', dateFieldId: 'paid_at', valueFieldId: 'amount' }],
  [chart(21), L.expenses, 'Категории', 'pie', { groupFieldId: 'category' }],
  [chart(22), L.expenses, 'Линия расходов', 'line', { aggregation: 'sum', dateFieldId: 'paid_at', valueFieldId: 'amount' }],
  [chart(23), L.expenses, 'KPI сентября', 'kpi', { valueFieldId: 'amount', aggregation: 'sum' }],
  [chart(24), L.workouts, 'Минуты по дням', 'line', { aggregation: 'sum', dateFieldId: 'done_at', valueFieldId: 'minutes' }],
  [chart(25), L.workouts, 'Типы тренировок', 'pie', { groupFieldId: 'kind' }],
  [chart(26), L.workouts, 'KPI формы', 'kpi', { valueFieldId: 'minutes', aggregation: 'sum' }],
  [chart(27), L.todos, 'Приоритеты', 'pie', { groupFieldId: 'priority' }],
  [chart(28), L.todos, 'KPI дел', 'kpi', { aggregation: 'count' }],
  [chart(29), L.dinner, 'Статусы ужинов', 'pie', { groupFieldId: 'status' }],
  [chart(30), L.events, 'События по типу', 'pie', { groupFieldId: 'kind' }],
  [chart(31), L.release, 'Приоритеты релиза', 'pie', { groupFieldId: 'priority' }],
  [chart(32), L.release, 'KPI чеклиста', 'kpi', { aggregation: 'count' }],
]

const members = [
  [L.watch, LENA, 'editor'],
  [L.watch, KIRILL, 'editor'],
  [L.watched, KIRILL, 'viewer'],
  [L.watched, LENA, 'proposer'],
  [L.watched, OLEG, 'proposer'],
  [L.shop, ANNA, 'editor'],
  [L.shop, LENA, 'editor'],
  [L.books, ANNA, 'editor'],
  [L.books, KIRILL, 'editor'],
  [L.backlog, ANNA, 'editor'],
  [L.backlog, KIRILL, 'editor'],
  [L.sprint, ANNA, 'editor'],
  [L.sprint, LENA, 'editor'],
  [L.sprint, OLEG, 'editor'],
  [L.sprint, VITON, 'viewer'],
  [L.trips, KIRILL, 'editor'],
  [L.trips, LENA, 'editor'],
  [L.places, ANNA, 'editor'],
  [L.places, LENA, 'editor'],
  [L.places, KIRILL, 'editor'],
  [L.expenses, ANNA, 'editor'],
  [L.expenses, LENA, 'viewer'],
  [L.release, ANNA, 'editor'],
  [L.release, KIRILL, 'editor'],
  [L.release, LENA, 'proposer'],
  [L.dinner, KIRILL, 'editor'],
  [L.dinner, LENA, 'editor'],
  [L.dinner, OLEG, 'editor'],
  [L.events, ANNA, 'editor'],
  [L.events, KIRILL, 'editor'],
  [L.ideas, ANNA, 'proposer'],
  [L.ideas, KIRILL, 'proposer'],
]

const proposals = [
  [prop(1), L.watched, null, LENA, 'create', { values: { title: 'Чернобыль', year: 2019, kind: 'series', watched_at: '2026-08-01' } }, 'pending'],
  [prop(2), L.watched, item(111), KIRILL, 'update', { values: { title: 'Оппенгеймер', year: 2023, kind: 'movie', watched_at: '2024-11-02', review: 'Долго, но держит. Стоит пересмотреть сноску про Гроves.' } }, 'pending'],
  [prop(3), L.games, null, ANNA, 'create', { values: { title: 'Inscryption', platform: 'pc', status: 'completed', hours: 14, finished_at: '2025-12-01' } }, 'pending'],
  [prop(4), L.release, null, LENA, 'create', { values: { title: 'Короткий ролик по видам', priority: 'mid', due: '2026-09-14' } }, 'pending'],
  [prop(5), L.ideas, item(503), ANNA, 'update', { values: { title: 'Экспорт PDF', priority: 'mid', notes: 'Сначала таблица, потом карточки' } }, 'pending'],
]

const friendships = [
  [friend(1), ANNA, KIRILL, 'accepted'],
  [friend(2), ANNA, LENA, 'accepted'],
  [friend(3), ANNA, VITON, 'pending'],
  [friend(4), KIRILL, LENA, 'accepted'],
  [friend(5), OLEG, KIRILL, 'accepted'],
  [friend(6), OLEG, ANNA, 'accepted'],
  [friend(7), OLEG, LENA, 'accepted'],
]

const automations = [
  [auto(1), L.shop, 'Дата при галочке', { type: 'checked' }, [{ type: 'set_now', fieldId: 'bought_at' }]],
  [auto(2), L.todos, 'Дата выполнения', { type: 'checked' }, [{ type: 'set_now', fieldId: 'done_at' }]],
  [auto(3), L.release, 'Закрыли задачу', { type: 'checked' }, [{ type: 'set_now', fieldId: 'done_at' }]],
  [auto(4), L.sprint, 'Готово → закрыто', { type: 'field_equals', fieldId: 'status', value: 'done' }, [{ type: 'set_field', fieldId: 'notes', value: 'Закрыто в спринте' }]],
]

const subscriptions = [
  [L.watched, KIRILL],
  [L.watched, LENA],
  [L.games, ANNA],
  [L.sprint, ANNA],
  [L.sprint, LENA],
  [L.release, ANNA],
  [L.release, KIRILL],
  [L.dinner, OLEG],
]

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

const parts = []
parts.push(`-- Demo users and sample lists for Chroniqe.
-- Applied on the remote project; safe to re-run (idempotent on fixed UUIDs).
-- Demo password for *@chroniqe.test accounts: Demo1234!
--
-- Public showcase (Explore → «Примеры для демонстрации»):
--   views   Пройденные игры, Книги, Дела, Рецепты, Винил, Поездки, События осени
--   charts  Куплено, Расходы сентября, Тренировки
--   collab  Спринт команды, Релиз Chroniqe, Ужины клуба, Идеи для Chroniqe
--   flow    К просмотру, Покупки, К прохождению
--   ratings Просмотрено, Любимые места, Подкасты
--
-- Users / identities are created separately via Auth inserts.
-- This file holds lists, items, ratings, charts, memberships.

-- === CHUNK lists ===
insert into public.lists (
  id, owner_id, title, description, icon, template_key,
  schema, view_config, settings, visibility, edit_mode
)
values
${lists
  .map(
    (row) => `(
  '${row.id}',
  '${row.owner}',
  ${sqlText(row.title)},
  ${sqlText(row.description)},
  ${sqlText(row.icon)},
  ${sqlText(row.template)},
  ${sqlJson(row.schema)},
  ${sqlJson(row.view)},
  ${sqlJson(row.settings)},
  '${row.visibility}',
  '${row.edit}'
)`,
  )
  .join(',\n')}
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  template_key = excluded.template_key,
  schema = excluded.schema,
  view_config = excluded.view_config,
  settings = excluded.settings,
  visibility = excluded.visibility,
  edit_mode = excluded.edit_mode,
  updated_at = now();
`)

parts.push(`-- === CHUNK items_prepare ===
alter table public.items disable trigger items_activity;
delete from public.list_charts
where list_id in (${lists.map((row) => `'${row.id}'`).join(', ')})
  and id::text not like 'd11e0000-0000-4000-8000-%';
`)

for (const [i, group] of chunk(items, 40).entries()) {
  parts.push(`-- === CHUNK items_${i + 1} ===
insert into public.items (id, list_id, values, position, is_checked, checked_at, created_by, updated_by)
values
${group
  .map((row) => {
    const checkedAt = row.checked_at ? `'${row.checked_at}'` : row.is_checked ? 'now()' : 'null'
    return `('${row.id}', '${row.list_id}', ${sqlJson(row.values)}, ${row.position}, ${row.is_checked}, ${checkedAt}, '${row.created_by}', '${row.created_by}')`
  })
  .join(',\n')}
on conflict (id) do update set
  values = excluded.values,
  position = excluded.position,
  is_checked = excluded.is_checked,
  checked_at = excluded.checked_at,
  updated_by = excluded.updated_by;
`)
}

parts.push(`-- === CHUNK items_finish ===
alter table public.items enable trigger items_activity;
`)

parts.push(`-- === CHUNK ratings ===
insert into public.item_ratings (item_id, field_id, user_id, value)
values
${ratings.map(([id, field, user, value]) => `('${id}', '${field}', '${user}', ${value})`).join(',\n')}
on conflict (item_id, field_id, user_id) do update set value = excluded.value, updated_at = now();
`)

parts.push(`-- === CHUNK comments ===
insert into public.item_comments (id, item_id, user_id, body, color, show_author, show_time)
values
${comments.map(([id, itemId, user, body, color]) => `('${id}', '${itemId}', '${user}', ${sqlText(body)}, '${color}', true, true)`).join(',\n')}
on conflict (id) do update set body = excluded.body, color = excluded.color;
`)

parts.push(`-- === CHUNK charts ===
insert into public.list_charts (id, list_id, name, chart_type, config)
values
${charts.map(([id, listId, name, type, config]) => `('${id}', '${listId}', ${sqlText(name)}, '${type}', ${sqlJson(config)})`).join(',\n')}
on conflict (id) do update set name = excluded.name, chart_type = excluded.chart_type, config = excluded.config;
`)

parts.push(`-- === CHUNK members ===
insert into public.list_members (list_id, user_id, role)
values
${members.map(([listId, user, role]) => `('${listId}', '${user}', '${role}')`).join(',\n')}
on conflict (list_id, user_id) do update set role = excluded.role;
`)

parts.push(`-- === CHUNK proposals ===
insert into public.change_proposals (id, list_id, item_id, user_id, action, payload, status)
values
${proposals
  .map(
    ([id, listId, itemId, user, action, payload, status]) =>
      `('${id}', '${listId}', ${itemId ? `'${itemId}'` : 'null'}, '${user}', '${action}', ${sqlJson(payload)}, '${status}')`,
  )
  .join(',\n')}
on conflict (id) do update set payload = excluded.payload, status = excluded.status;
`)

parts.push(`-- === CHUNK friendships ===
insert into public.friendships (id, requester_id, addressee_id, status, responded_at)
select v.id, v.requester_id, v.addressee_id, v.status, v.responded_at
from (values
${friendships
  .map(
    ([id, a, b, status]) =>
      `('${id}'::uuid, '${a}'::uuid, '${b}'::uuid, '${status}', ${status === 'accepted' ? 'now()' : 'null::timestamptz'})`,
  )
  .join(',\n')}
) as v(id, requester_id, addressee_id, status, responded_at)
where not exists (
  select 1 from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(v.requester_id, v.addressee_id)
    and greatest(f.requester_id, f.addressee_id) = greatest(v.requester_id, v.addressee_id)
);
`)

parts.push(`-- === CHUNK automations ===
insert into public.list_automations (id, list_id, name, enabled, trigger, actions)
values
${automations
  .map(([id, listId, name, trigger, actions]) => `('${id}', '${listId}', ${sqlText(name)}, true, ${sqlJson(trigger)}, ${sqlJson(actions)})`)
  .join(',\n')}
on conflict (id) do update set name = excluded.name, trigger = excluded.trigger, actions = excluded.actions, enabled = true;
`)

parts.push(`-- === CHUNK subscriptions ===
insert into public.list_subscriptions (list_id, user_id)
values
${subscriptions.map(([listId, user]) => `('${listId}', '${user}')`).join(',\n')}
on conflict (list_id, user_id) do nothing;
`)

parts.push(`-- === CHUNK activity ===
insert into public.activity_events (id, list_id, item_id, actor_id, event_type, payload, created_at)
values
  ('aa3e0000-0000-4000-8000-000000000001', '${L.watched}', '${item(115)}', '${KIRILL}', 'item_created', ${sqlJson({ values: { title: 'Интерстеллар' } })}, '2025-08-14T18:00:00Z'),
  ('aa3e0000-0000-4000-8000-000000000002', '${L.watched}', '${item(111)}', '${LENA}', 'item_updated', ${sqlJson({ values: { title: 'Оппенгеймер' } })}, '2025-11-03T12:00:00Z'),
  ('aa3e0000-0000-4000-8000-000000000003', '${L.sprint}', '${item(623)}', '${LENA}', 'item_checked', ${sqlJson({ values: { title: 'Тексты шаблонов EN' } })}, '2026-09-04T16:20:00Z'),
  ('aa3e0000-0000-4000-8000-000000000004', '${L.shop}', '${item(202)}', '${KIRILL}', 'item_checked', ${sqlJson({ values: { name: 'Хлеб' } })}, '2026-09-04T10:00:00Z'),
  ('aa3e0000-0000-4000-8000-000000000005', '${L.games}', '${item(304)}', '${ANNA}', 'item_created', ${sqlJson({ values: { title: 'Hades II' } })}, '2026-03-02T21:00:00Z'),
  ('aa3e0000-0000-4000-8000-000000000006', '${L.release}', '${item(725)}', '${VITON}', 'item_checked', ${sqlJson({ values: { title: 'Проверка RLS на графиках' } })}, '2026-09-05T09:30:00Z'),
  ('aa3e0000-0000-4000-8000-000000000007', '${L.dinner}', '${item(741)}', '${OLEG}', 'item_created', ${sqlJson({ values: { title: 'Паста-вечер' } })}, '2026-09-06T19:00:00Z'),
  ('aa3e0000-0000-4000-8000-000000000008', '${L.places}', '${item(661)}', '${ANNA}', 'item_updated', ${sqlJson({ values: { title: 'Кофейня на углу' } })}, '2026-08-12T11:15:00Z')
on conflict (id) do nothing;
`)

const sql = parts.join('\n')
writeFileSync(join(root, 'seed.sql'), sql)
console.log(`wrote seed.sql (${sql.length} chars, ${items.length} items, ${lists.length} lists)`)
