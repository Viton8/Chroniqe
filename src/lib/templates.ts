import { uid } from './cn'
import { msg } from './i18n'
import type {
  AutomationAction,
  FieldDef,
  FieldType,
  ListSchema,
  ListSettings,
  TransferAction,
  ViewConfig,
} from '../types/domain'

export interface TemplateSpec {
  key: string
  title: string
  icon: string
  description: string
  hint: string
  example: string
  schema: ListSchema
  settings?: ListSettings
  view?: ViewConfig
  charts?: Array<{
    name: string
    chart_type: 'timeline' | 'stem' | 'bar' | 'pie' | 'kpi' | 'line'
    config: { dateFieldId?: string; valueFieldId?: string; aggregation?: 'count' | 'avg' | 'sum' }
  }>
}

export interface TemplatePack {
  key: string
  title: string
  icon: string
  description: string
  hint: string
  lists: TemplateSpec[]
  transfers?: Array<{
    fromKey: string
    toKey: string
    label: string
    fieldMap: Record<string, string>
  }>
  onCheckMoves?: Array<{
    fromKey: string
    toKey: string
    fieldMap: Record<string, string>
  }>
  /** Wire relation fields to sibling lists created in the same pack. */
  relations?: Array<{
    fromKey: string
    fieldId: string
    toKey: string
  }>
}

function f(
  id: string,
  name: string,
  type: FieldType,
  extra: Partial<FieldDef> = {},
): FieldDef {
  return { id, key: id, name, type, ...extra }
}

const movieKind = {
  options: [
    { value: 'movie', label: 'Фильм' },
    { value: 'series', label: 'Сериал' },
    { value: 'anime', label: 'Аниме' },
    { value: 'doc', label: 'Документальный' },
  ],
}

export const TEMPLATES: TemplateSpec[] = [
  {
    key: 'blank',
    title: 'Пустой список',
    icon: '✨',
    description: 'Соберите поля сами — любой тип, любые ограничения.',
    hint: 'Начните с одного текстового поля «Название», затем добавьте даты, оценки, файлы.',
    example: 'Например: коллекция винила — исполнитель, год, состояние, фото обложки.',
    schema: {
      fields: [f('title', 'Название', 'text', { required: true, config: { maxLength: 200 } })],
      titleFieldId: 'title',
    },
  },
  {
    key: 'movies_watched',
    title: 'Просмотрено',
    icon: '🎬',
    description: 'Фильмы и сериалы, которые уже посмотрели. Оценки может ставить кто угодно.',
    hint: 'Поле «Оценки» — коллективное: каждый зритель ставит свою оценку, считается среднее.',
    example: '«Дюна», 2021, фильм, дата 12.03.2024, оценки 8 и 9 → среднее 8.5.',
    schema: {
      fields: [
        f('title', 'Название', 'text', { required: true, config: { maxLength: 200 } }),
        f('year', 'Год', 'integer', { config: { min: 1888, max: 2100 } }),
        f('kind', 'Тип', 'select', { config: movieKind }),
        f('poster', 'Постер', 'image', { config: { maxSizeMb: 2, accept: ['image/jpeg', 'image/png', 'image/webp'] } }),
        f('watched_at', 'Дата просмотра', 'date'),
        f('ratings', 'Оценки', 'multi_rating', { config: { min: 1, max: 10, ratingMax: 10 } }),
        f('seasons', 'Сезоны', 'sublist', {
          config: {
            subfields: [
              {
                id: 'season',
                key: 'season',
                name: 'Сезон',
                type: 'integer',
                required: true,
                config: { min: 1, max: 80 },
              },
              {
                id: 'episodes',
                key: 'episodes',
                name: 'Серии',
                type: 'integer',
                config: { min: 1, max: 200 },
              },
              {
                id: 'finished_at',
                key: 'finished_at',
                name: 'Досмотрен',
                type: 'date',
              },
              {
                id: 'score',
                key: 'score',
                name: 'Оценка сезона',
                type: 'rating',
                config: { ratingMax: 10, min: 1, max: 10 },
              },
            ],
          },
        }),
        f('review', 'Отзыв', 'textarea', { config: { maxLength: 2000 } }),
      ],
      titleFieldId: 'title',
      imageFieldId: 'poster',
      dateFieldId: 'watched_at',
    },
    view: { mode: 'table', dateFieldId: 'watched_at', imageFieldId: 'poster' },
    charts: [
      {
        name: 'Лента просмотров',
        chart_type: 'timeline',
        config: { dateFieldId: 'watched_at', aggregation: 'count' },
      },
      {
        name: 'Средние оценки во времени',
        chart_type: 'stem',
        config: { dateFieldId: 'watched_at', valueFieldId: 'ratings', aggregation: 'avg' },
      },
    ],
  },
  {
    key: 'movies_watchlist',
    title: 'К просмотру',
    icon: '🍿',
    description: 'Очередь фильмов и сериалов. Перекидывайте в «Просмотрено» или «Не буду».',
    hint: 'Кнопки переноса появятся, если создать набор «Кино» — он свяжет три списка.',
    example: 'Нажали «Просмотрено» → запись уходит в другой список, дата просмотра ставится сегодня.',
    schema: {
      fields: [
        f('title', 'Название', 'text', { required: true, config: { maxLength: 200 } }),
        f('year', 'Год', 'integer', { config: { min: 1888, max: 2100 } }),
        f('kind', 'Тип', 'select', { config: movieKind }),
        f('poster', 'Постер', 'image', { config: { maxSizeMb: 2 } }),
        f('priority', 'Приоритет', 'select', {
          config: {
            options: [
              { value: 'now', label: 'Срочно', color: '#be123c' },
              { value: 'soon', label: 'Скоро', color: '#b45309' },
              { value: 'someday', label: 'Когда-нибудь', color: '#6e6578' },
            ],
          },
        }),
        f('note', 'Заметка', 'textarea', { config: { maxLength: 500 } }),
      ],
      titleFieldId: 'title',
      imageFieldId: 'poster',
      groupFieldId: 'priority',
    },
    view: { mode: 'cards', imageFieldId: 'poster', groupFieldId: 'priority' },
  },
  {
    key: 'movies_dropped',
    title: 'Не буду смотреть',
    icon: '🚫',
    description: 'Отложенные или отвергнутые тайтлы — чтобы не предлагать их снова.',
    hint: 'Укажите причину: так проще понять, почему список «к просмотру» сократился.',
    example: '«Не зашёл тон» + дата решения.',
    schema: {
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
  },
  {
    key: 'games_done',
    title: 'Пройденные игры',
    icon: '🎮',
    description: 'Каталог пройденного с платформой, часами и оценкой.',
    hint: 'Дата прохождения нужна для таймлайна «во что играли в каком году».',
    example: 'Hades, Switch, 40 ч, оценка 9, пройдено 02.2024.',
    schema: {
      fields: [
        f('title', 'Название', 'text', { required: true, config: { maxLength: 200 } }),
        f('platform', 'Платформа', 'select', {
          config: {
            options: [
              { value: 'pc', label: 'PC' },
              { value: 'ps', label: 'PlayStation' },
              { value: 'xbox', label: 'Xbox' },
              { value: 'switch', label: 'Switch' },
              { value: 'mobile', label: 'Телефон' },
              { value: 'other', label: 'Другое' },
            ],
          },
        }),
        f('cover', 'Обложка', 'image', { config: { maxSizeMb: 2 } }),
        f('finished_at', 'Пройдено', 'date'),
        f('hours', 'Часы', 'number', { config: { min: 0, max: 10000 } }),
        f('ratings', 'Оценки', 'multi_rating', { config: { ratingMax: 10, min: 1, max: 10 } }),
        f('status', 'Статус', 'select', {
          config: {
            options: [
              { value: 'completed', label: 'Пройдено' },
              { value: 'main', label: 'Сюжет' },
              { value: 'hundred', label: '100%' },
              { value: 'dropped', label: 'Брошено' },
            ],
          },
        }),
        f('note', 'Заметка', 'textarea', { config: { maxLength: 1000 } }),
      ],
      titleFieldId: 'title',
      imageFieldId: 'cover',
      dateFieldId: 'finished_at',
      groupFieldId: 'platform',
    },
    view: { mode: 'gallery', imageFieldId: 'cover', dateFieldId: 'finished_at' },
    charts: [
      {
        name: 'Когда проходили',
        chart_type: 'timeline',
        config: { dateFieldId: 'finished_at', aggregation: 'count' },
      },
      {
        name: 'Оценки по времени',
        chart_type: 'stem',
        config: { dateFieldId: 'finished_at', valueFieldId: 'ratings', aggregation: 'avg' },
      },
    ],
  },
  {
    key: 'games_backlog',
    title: 'К прохождению',
    icon: '🕹️',
    description: 'Очередь игр. Перекидывайте в «Пройденные» кнопкой.',
    hint: 'Набор «Игры» свяжет очередь и каталог пройденного — дата прохождения поставится сама.',
    example: 'Hades, Switch, срочно → «Пройдено» → часы и оценка уже в другом списке.',
    schema: {
      fields: [
        f('title', 'Название', 'text', { required: true, config: { maxLength: 200 } }),
        f('platform', 'Платформа', 'select', {
          config: {
            options: [
              { value: 'pc', label: 'PC' },
              { value: 'ps', label: 'PlayStation' },
              { value: 'xbox', label: 'Xbox' },
              { value: 'switch', label: 'Switch' },
              { value: 'mobile', label: 'Телефон' },
              { value: 'other', label: 'Другое' },
            ],
          },
        }),
        f('cover', 'Обложка', 'image', { config: { maxSizeMb: 2 } }),
        f('priority', 'Приоритет', 'select', {
          config: {
            options: [
              { value: 'now', label: 'Срочно', color: '#be123c' },
              { value: 'soon', label: 'Скоро', color: '#b45309' },
              { value: 'someday', label: 'Когда-нибудь', color: '#6e6578' },
            ],
          },
        }),
        f('note', 'Заметка', 'textarea', { config: { maxLength: 500 } }),
      ],
      titleFieldId: 'title',
      imageFieldId: 'cover',
      groupFieldId: 'priority',
    },
    view: { mode: 'cards', imageFieldId: 'cover', groupFieldId: 'priority' },
  },
  {
    key: 'shopping',
    title: 'Покупки',
    icon: '🛒',
    description: 'Список покупок с вычёркиванием. Можно переносить в «Куплено».',
    hint: 'Включите вычёркивание: при галочке можно ставить дату и двигать позицию в другой список.',
    example: 'Молоко ×2 → галочка → уходит в «Куплено» с сегодняшней датой.',
    schema: {
      fields: [
        f('name', 'Позиция', 'text', { required: true, config: { maxLength: 120 } }),
        f('qty', 'Количество', 'number', { config: { min: 0, max: 9999 } }),
        f('category', 'Категория', 'select', {
          config: {
            options: [
              { value: 'food', label: 'Еда' },
              { value: 'home', label: 'Дом' },
              { value: 'tech', label: 'Техника' },
              { value: 'other', label: 'Другое' },
            ],
          },
        }),
        f('note', 'Заметка', 'text', { config: { maxLength: 200 } }),
        f('bought_at', 'Куплено', 'date', { hidden: true }),
      ],
      titleFieldId: 'name',
      dateFieldId: 'bought_at',
      groupFieldId: 'category',
    },
    settings: {
      enableCheck: true,
      checkLabel: 'Куплено',
      onCheck: [{ type: 'set_now', fieldId: 'bought_at' }],
      onUncheck: [{ type: 'restore_snapshot' }],
    },
    view: { mode: 'compact', groupFieldId: 'category' },
  },
  {
    key: 'bought',
    title: 'Куплено',
    icon: '📦',
    description: 'История покупок с датой и ценой.',
    hint: 'Сюда удобно перекидывать позиции из списка покупок кнопкой или автоматизацией.',
    example: 'Молоко, 2 шт, 04.09.2026, 120 ₽.',
    schema: {
      fields: [
        f('name', 'Позиция', 'text', { required: true, config: { maxLength: 120 } }),
        f('qty', 'Количество', 'number', { config: { min: 0 } }),
        f('bought_at', 'Дата', 'date'),
        f('price', 'Цена', 'number', { config: { min: 0 } }),
        f('category', 'Категория', 'select', {
          config: {
            options: [
              { value: 'food', label: 'Еда' },
              { value: 'home', label: 'Дом' },
              { value: 'tech', label: 'Техника' },
              { value: 'other', label: 'Другое' },
            ],
          },
        }),
      ],
      titleFieldId: 'name',
      dateFieldId: 'bought_at',
    },
    charts: [
      {
        name: 'Траты по дням',
        chart_type: 'bar',
        config: { dateFieldId: 'bought_at', valueFieldId: 'price', aggregation: 'sum' },
      },
    ],
  },
  {
    key: 'later_shopping',
    title: 'Купить к событию',
    icon: '🎄',
    description: 'Отложенные покупки — к Новому году, дню рождения, отпуску.',
    hint: 'Поле «Когда» можно сделать датой или выбором события.',
    example: 'Гирлянда → «к Новому году».',
    schema: {
      fields: [
        f('name', 'Позиция', 'text', { required: true, config: { maxLength: 120 } }),
        f('qty', 'Количество', 'number', { config: { min: 0 } }),
        f('when', 'Когда', 'text', { config: { maxLength: 80, placeholder: 'к Новому году' } }),
        f('note', 'Заметка', 'textarea', { config: { maxLength: 400 } }),
      ],
      titleFieldId: 'name',
    },
  },
  {
    key: 'todo',
    title: 'Дела',
    icon: '✅',
    description: 'Классический todo: вычёркивание, приоритет, срок.',
    hint: 'При вычёркивании можно автоматически проставлять дату выполнения.',
    example: '«Оплатить интернет» до пятницы → галочка → дата выполнения сегодня.',
    schema: {
      fields: [
        f('title', 'Задача', 'text', { required: true, config: { maxLength: 200 } }),
        f('due', 'Срок', 'date'),
        f('priority', 'Приоритет', 'select', {
          config: {
            options: [
              { value: 'high', label: 'Высокий', color: '#be123c' },
              { value: 'mid', label: 'Средний', color: '#b45309' },
              { value: 'low', label: 'Низкий', color: '#0f766e' },
            ],
          },
        }),
        f('done_at', 'Выполнено', 'date', { hidden: true }),
        f('notes', 'Заметки', 'textarea', { config: { maxLength: 1000 } }),
      ],
      titleFieldId: 'title',
      dateFieldId: 'due',
      groupFieldId: 'priority',
    },
    settings: {
      enableCheck: true,
      checkLabel: 'Готово',
      onCheck: [{ type: 'set_now', fieldId: 'done_at' }],
      onUncheck: [{ type: 'restore_snapshot' }],
    },
    view: { mode: 'compact', groupFieldId: 'priority' },
  },
  {
    key: 'books',
    title: 'Книги',
    icon: '📚',
    description: 'Прочитанное и в процессе — с оценками и датами.',
    hint: 'Таймлайн строится по дате окончания. Коллективные оценки работают так же, как у фильмов.',
    example: '«Мастер и Маргарита», закончили 01.06.2024, оценка 10.',
    schema: {
      fields: [
        f('title', 'Название', 'text', { required: true, config: { maxLength: 200 } }),
        f('author', 'Автор', 'text', { config: { maxLength: 120 } }),
        f('finished_at', 'Прочитано', 'date'),
        f('ratings', 'Оценки', 'multi_rating', { config: { ratingMax: 10 } }),
        f('status', 'Статус', 'select', {
          config: {
            options: [
              { value: 'want', label: 'Хочу' },
              { value: 'reading', label: 'Читаю' },
              { value: 'done', label: 'Прочитано' },
              { value: 'dropped', label: 'Брошено' },
            ],
          },
        }),
        f('note', 'Заметка', 'textarea', { config: { maxLength: 2000 } }),
      ],
      titleFieldId: 'title',
      dateFieldId: 'finished_at',
      groupFieldId: 'status',
    },
    view: { mode: 'board', groupFieldId: 'status' },
  },
  {
    key: 'catalog_items',
    title: 'Каталог',
    icon: '📚',
    description: 'Справочник сущностей без повторов: фильмы, книги, места, блюда — что угодно.',
    hint: 'Одна запись = один объект. Повторные события с датами и оценками ведите в журнале из набора «Каталог и журнал».',
    example: '«Дюна», 2021, постер. Сам фильм один — просмотры с разными оценками живут в журнале.',
    schema: {
      fields: [
        f('title', 'Название', 'text', { required: true, config: { maxLength: 200 } }),
        f('year', 'Год', 'integer', { config: { min: 1, max: 2100 } }),
        f('kind', 'Тип', 'select', {
          config: {
            options: [
              { value: 'film', label: 'Фильм' },
              { value: 'book', label: 'Книга' },
              { value: 'game', label: 'Игра' },
              { value: 'place', label: 'Место' },
              { value: 'other', label: 'Другое' },
            ],
          },
        }),
        f('cover', 'Обложка', 'image', {
          config: { maxSizeMb: 2, accept: ['image/jpeg', 'image/png', 'image/webp'] },
        }),
        f('note', 'Заметка', 'textarea', { config: { maxLength: 2000 } }),
      ],
      titleFieldId: 'title',
      imageFieldId: 'cover',
      groupFieldId: 'kind',
    },
    view: { mode: 'cards', imageFieldId: 'cover', groupFieldId: 'kind' },
  },
  {
    key: 'event_log',
    title: 'Журнал',
    icon: '🗒️',
    description: 'Повторяющиеся события: каждый раз — своя дата, оценка и заметка, ссылка на запись каталога.',
    hint: 'Свяжите поле «Что» со списком-каталогом. Один фильм можно открыть много раз — каждый просмотр отдельной строкой.',
    example: 'Дюна · 12.03.2024 · 9; Дюна · 01.09.2025 · 8 — два просмотра, две оценки.',
    schema: {
      fields: [
        f('subject', 'Что', 'relation', {
          required: true,
          config: { relationDisplay: 'title_cover', allowMultiple: false },
        }),
        f('happened_at', 'Дата', 'date', { required: true }),
        f('score', 'Оценка', 'rating', { config: { ratingMax: 10, min: 1, max: 10 } }),
        f('note', 'Заметка', 'textarea', { config: { maxLength: 2000 } }),
      ],
      titleFieldId: 'subject',
      dateFieldId: 'happened_at',
    },
    view: { mode: 'table', dateFieldId: 'happened_at' },
    charts: [
      {
        name: 'Лента событий',
        chart_type: 'timeline',
        config: { dateFieldId: 'happened_at', aggregation: 'count' },
      },
      {
        name: 'Оценки во времени',
        chart_type: 'stem',
        config: { dateFieldId: 'happened_at', valueFieldId: 'score', aggregation: 'avg' },
      },
    ],
  },
]

export const TEMPLATE_PACKS: TemplatePack[] = [
  {
    key: 'catalog_log',
    title: 'Каталог и журнал',
    icon: '📖',
    description: 'Справочник объектов + журнал повторений: одна сущность — много дат и оценок.',
    hint: 'Создаются «Каталог» и «Журнал». В журнале поле «Что» уже связано с каталогом и показывает название с обложкой.',
    lists: [
      TEMPLATES.find((t) => t.key === 'catalog_items')!,
      TEMPLATES.find((t) => t.key === 'event_log')!,
    ],
    relations: [{ fromKey: 'event_log', fieldId: 'subject', toKey: 'catalog_items' }],
  },
  {
    key: 'cinema',
    title: 'Кино и сериалы',
    icon: '🎬',
    description: 'Три связанных списка: очередь, просмотрено, отказ. Кнопки переноса уже настроены.',
    hint: 'Создаётся сразу три списка. В «К просмотру» появятся кнопки «Просмотрено» и «Не буду».',
    lists: [
      TEMPLATES.find((t) => t.key === 'movies_watchlist')!,
      TEMPLATES.find((t) => t.key === 'movies_watched')!,
      TEMPLATES.find((t) => t.key === 'movies_dropped')!,
    ],
    transfers: [
      {
        fromKey: 'movies_watchlist',
        toKey: 'movies_watched',
        label: 'Просмотрено',
        fieldMap: { title: 'title', year: 'year', kind: 'kind', poster: 'poster' },
      },
      {
        fromKey: 'movies_watchlist',
        toKey: 'movies_dropped',
        label: 'Не буду смотреть',
        fieldMap: { title: 'title', year: 'year', kind: 'kind' },
      },
    ],
  },
  {
    key: 'groceries',
    title: 'Покупки',
    icon: '🛒',
    description: 'Текущий список, купленное и отложенное к празднику.',
    hint: 'Вычеркните позицию — или нажмите кнопку, чтобы отправить её в «Куплено» / «к Новому году».',
    lists: [
      TEMPLATES.find((t) => t.key === 'shopping')!,
      TEMPLATES.find((t) => t.key === 'bought')!,
      TEMPLATES.find((t) => t.key === 'later_shopping')!,
    ],
    transfers: [
      {
        fromKey: 'shopping',
        toKey: 'bought',
        label: 'Куплено',
        fieldMap: { name: 'name', qty: 'qty', category: 'category' },
      },
      {
        fromKey: 'shopping',
        toKey: 'later_shopping',
        label: 'К Новому году',
        fieldMap: { name: 'name', qty: 'qty' },
      },
      {
        fromKey: 'bought',
        toKey: 'shopping',
        label: 'Вернуть в покупки',
        fieldMap: { name: 'name', qty: 'qty', category: 'category' },
      },
    ],
    onCheckMoves: [
      {
        fromKey: 'shopping',
        toKey: 'bought',
        fieldMap: { name: 'name', qty: 'qty', category: 'category', bought_at: 'bought_at' },
      },
    ],
  },
  {
    key: 'games',
    title: 'Игры',
    icon: '🎮',
    description: 'Очередь и пройденное. Кнопка переноса уже настроена.',
    hint: 'В «К прохождению» появится кнопка «Пройдено» — дата прохождения ставится сегодня.',
    lists: [
      TEMPLATES.find((t) => t.key === 'games_backlog')!,
      TEMPLATES.find((t) => t.key === 'games_done')!,
    ],
    transfers: [
      {
        fromKey: 'games_backlog',
        toKey: 'games_done',
        label: 'Пройдено',
        fieldMap: { title: 'title', platform: 'platform', cover: 'cover' },
      },
    ],
  },
]

export function blankSchema(titleFieldName: string): ListSchema {
  return {
    fields: [f('title', titleFieldName, 'text', { required: true, config: { maxLength: 200 } })],
    titleFieldId: 'title',
  }
}

export function cloneTemplate(spec: TemplateSpec): {
  title: string
  icon: string
  schema: ListSchema
  settings: ListSettings
  view_config: ViewConfig
  template_key: string
} {
  return {
    title: spec.title,
    icon: spec.icon,
    schema: structuredClone(spec.schema),
    settings: structuredClone(spec.settings ?? {}),
    view_config: structuredClone(spec.view ?? { mode: 'table' }),
    template_key: spec.key,
  }
}

export function newField(type: FieldType = 'text'): FieldDef {
  const id = uid()
  return {
    id,
    key: id.slice(0, 8),
    name: msg('schema.newField'),
    type,
    config: type === 'rating' || type === 'multi_rating' ? { ratingMax: 10, min: 1, max: 10 } : {},
  }
}

export function applyTransferDefaults(
  actions: TransferAction[],
  extraSet?: Record<string, unknown>,
): TransferAction[] {
  return actions.map((a) => ({
    ...a,
    deleteSource: a.deleteSource ?? true,
    setFields: { ...(a.setFields ?? {}), ...(extraSet ?? {}) },
  }))
}

const STAMP_FIELDS = ['watched_at', 'bought_at', 'decided_at', 'finished_at'] as const

function stampFieldsFor(target: TemplateSpec | undefined): Record<string, unknown> {
  const ids = new Set((target?.schema.fields ?? []).map((field) => field.id))
  return Object.fromEntries(STAMP_FIELDS.filter((id) => ids.has(id)).map((id) => [id, '$today']))
}

export function applyPackSettings(
  pack: TemplatePack,
  created: Record<string, string>,
): Array<{ listId: string; settings: ListSettings; schema?: ListSchema }> {
  const byKey: Record<string, ListSettings> = {}
  const schemaByKey: Record<string, ListSchema> = {}
  for (const spec of pack.lists) {
    byKey[spec.key] = structuredClone(spec.settings ?? {})
    schemaByKey[spec.key] = structuredClone(spec.schema)
  }

  for (const link of pack.relations ?? []) {
    const relatedId = created[link.toKey]
    const schema = schemaByKey[link.fromKey]
    if (!relatedId || !schema) continue
    const field = schema.fields.find((row) => row.id === link.fieldId)
    if (!field) continue
    field.config = { ...field.config, relatedListId: relatedId }
  }

  for (const transfer of pack.transfers ?? []) {
    const fromId = created[transfer.fromKey]
    const toId = created[transfer.toKey]
    if (!fromId || !toId) continue
    const target = pack.lists.find((row) => row.key === transfer.toKey)
    const settings = byKey[transfer.fromKey] ?? {}
    settings.transferActions = [
      ...(settings.transferActions ?? []),
      {
        id: crypto.randomUUID(),
        label: transfer.label,
        targetListId: toId,
        fieldMap: transfer.fieldMap,
        deleteSource: true,
        setFields: stampFieldsFor(target),
      },
    ]
    byKey[transfer.fromKey] = settings
  }

  for (const move of pack.onCheckMoves ?? []) {
    const toId = created[move.toKey]
    if (!toId) continue
    const settings = byKey[move.fromKey] ?? {}
    settings.onCheck = [
      ...(settings.onCheck ?? []),
      { type: 'move_to_list', targetListId: toId, fieldMap: move.fieldMap, deleteSource: true },
    ]
    settings.onUncheck = settings.onUncheck ?? [{ type: 'restore_snapshot' }]
    byKey[move.fromKey] = settings
  }

  return pack.lists
    .map((spec) => {
      const listId = created[spec.key]
      if (!listId) return null
      const schema = schemaByKey[spec.key]
      const linked = Boolean(pack.relations?.some((row) => row.fromKey === spec.key))
      return {
        listId,
        settings: byKey[spec.key] ?? {},
        schema: linked ? schema : undefined,
      }
    })
    .filter((row): row is { listId: string; settings: ListSettings; schema?: ListSchema } => Boolean(row))
}

export function checkActionsFromTemplate(spec: TemplateSpec): AutomationAction[] {
  return spec.settings?.onCheck ?? []
}
