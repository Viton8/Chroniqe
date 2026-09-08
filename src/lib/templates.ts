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
    config: {
      dateFieldId?: string
      valueFieldId?: string
      groupFieldId?: string
      aggregation?: 'count' | 'avg' | 'sum'
    }
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

const painScale = [
  {
    value: '0',
    label: '0 — не болит',
    description: 'Боли нет.',
    color: '#6e6578',
  },
  {
    value: '1',
    label: '1 — едва заметно',
    description: 'Ощущается, только если специально прислушаться.',
    color: '#0f766e',
  },
  {
    value: '2',
    label: '2 — слабая',
    description: 'Лёгкая боль, на неё можно не обращать внимания.',
    color: '#0f766e',
  },
  {
    value: '3',
    label: '3 — заметная',
    description: 'Боль есть, но почти не мешает делам.',
    color: '#0f766e',
  },
  {
    value: '4',
    label: '4 — умеренная',
    description: 'Отвлекает, но работу ещё можно продолжать.',
    color: '#b45309',
  },
  {
    value: '5',
    label: '5 — мешает',
    description: 'Трудно игнорировать, концентрация падает.',
    color: '#b45309',
  },
  {
    value: '6',
    label: '6 — сильная',
    description: 'Мешает думать и работать, хочется остановиться.',
    color: '#b45309',
  },
  {
    value: '7',
    label: '7 — очень сильная',
    description: 'Сложно выполнять обычные действия.',
    color: '#c2410c',
  },
  {
    value: '8',
    label: '8 — тяжёлая',
    description: 'Почти ни о чём другом не получается думать.',
    color: '#c2410c',
  },
  {
    value: '9',
    label: '9 — невыносимая',
    description: 'Почти невозможно что-либо делать.',
    color: '#be123c',
  },
  {
    value: '10',
    label: '10 — максимум',
    description: 'Худшая боль, какую можно представить.',
    color: '#9f1239',
  },
]

const amountScale = [
  { value: 'none', label: 'Нет', color: '#0f766e' },
  { value: 'little', label: 'Немного', color: '#6e6578' },
  { value: 'moderate', label: 'Умеренно', color: '#b45309' },
  { value: 'a_lot', label: 'Много', color: '#be123c' },
]

const headacheTemplate: TemplateSpec = {
  key: 'headache_diary',
  title: 'Дневник головных болей',
  icon: '🤕',
  description:
    'Приступы с шкалой боли во времени, симптомами, лекарствами, нагрузкой и связью с давлением.',
  hint: 'Интенсивность — вложенный список: свёрнут показывает пик и начало–конец, раскрыт — каждый промежуток.',
  example:
    'Пик 8 · 08:20–14:45; аура и тошнота; ибупрофен 400 мг в 08:40, эффект в 09:10.',
  schema: {
    fields: [
      f('title', 'Эпизод', 'text', {
        required: true,
        config: { maxLength: 160, placeholder: 'Утренняя мигрень' },
      }),
      f('kind', 'Тип', 'select', {
        config: {
          options: [
            { value: 'migraine', label: 'Мигрень', color: '#be123c' },
            { value: 'tension', label: 'Напряжения', color: '#b45309' },
            { value: 'cluster', label: 'Кластерная', color: '#7c3aed' },
            { value: 'mixed', label: 'Смешанная', color: '#2563eb' },
            { value: 'unknown', label: 'Неясно', color: '#6e6578' },
            { value: 'other', label: 'Другое' },
          ],
        },
      }),
      f('started_at', 'Начало', 'datetime', { required: true }),
      f('ended_at', 'Конец', 'datetime'),
      f('ongoing', 'Ещё идёт', 'boolean'),
      f('intensity', 'Интенсивность', 'sublist', {
        description:
          'Каждая строка — момент или промежуток, когда боль была на этом уровне. В таблице список свёрнут до пика и границ приступа.',
        config: {
          sublistSummary: {
            mode: 'peak_span',
            valueFieldId: 'level',
            startFieldId: 'at',
            endFieldId: 'until',
          },
          subfields: [
            {
              id: 'at',
              key: 'at',
              name: 'С',
              type: 'datetime',
              required: true,
            },
            { id: 'until', key: 'until', name: 'До', type: 'datetime' },
            {
              id: 'level',
              key: 'level',
              name: 'Уровень',
              type: 'select',
              required: true,
              config: { options: painScale },
            },
            {
              id: 'note',
              key: 'note',
              name: 'Комментарий',
              type: 'text',
              config: { maxLength: 200, placeholder: 'на работе стало хуже' },
            },
          ],
        },
      }),
      f('laterality', 'Сторона', 'select', {
        config: {
          options: [
            { value: 'left', label: 'Слева' },
            { value: 'right', label: 'Справа' },
            { value: 'both', label: 'С обеих сторон' },
            { value: 'shifting', label: 'Переходит' },
          ],
        },
      }),
      f('location', 'Место', 'multiselect', {
        config: {
          options: [
            { value: 'forehead', label: 'Лоб' },
            { value: 'left_temple', label: 'Левый висок' },
            { value: 'right_temple', label: 'Правый висок' },
            { value: 'crown', label: 'Макушка' },
            { value: 'occiput', label: 'Затылок' },
            { value: 'neck', label: 'Шея' },
            { value: 'left_eye', label: 'Левый глаз' },
            { value: 'right_eye', label: 'Правый глаз' },
            { value: 'face', label: 'Лицо' },
            { value: 'whole', label: 'Вся голова' },
          ],
        },
      }),
      f('character', 'Характер', 'multiselect', {
        config: {
          options: [
            { value: 'throbbing', label: 'Пульсирующая' },
            { value: 'pressing', label: 'Давящая' },
            { value: 'tight', label: 'Сжимающая' },
            { value: 'stabbing', label: 'Колющая' },
            { value: 'burning', label: 'Жгучая' },
            { value: 'dull', label: 'Тупая' },
            { value: 'exploding', label: 'Распирающая' },
          ],
        },
      }),
      f('symptoms', 'Симптомы', 'multiselect', {
        description:
          'Можно отметить несколько: зрение, звук, тошнота и остальное в одной колонке.',
        config: {
          options: [
            { value: 'visual', label: 'Нарушения зрения / аура' },
            { value: 'photophobia', label: 'Свет режет' },
            { value: 'phonophobia', label: 'Звук мешает' },
            { value: 'osmophobia', label: 'Запахи раздражают' },
            { value: 'nausea', label: 'Тошнота' },
            { value: 'vomiting', label: 'Рвота' },
            { value: 'dizziness', label: 'Головокружение' },
            { value: 'neck', label: 'Скована шея' },
            { value: 'tearing', label: 'Слезотечение' },
            { value: 'nasal', label: 'Заложен нос' },
            { value: 'speech', label: 'Трудно говорить' },
            { value: 'numbness', label: 'Онемение' },
            { value: 'confusion', label: 'Путаница' },
            { value: 'yawning', label: 'Зевота' },
            { value: 'tinnitus', label: 'Шум в ушах' },
            { value: 'other', label: 'Другое' },
          ],
        },
      }),
      f('started_asleep', 'Началась во сне', 'boolean'),
      f('ended_asleep', 'Закончилась во сне', 'boolean'),
      f('impact', 'Влияние на дела', 'select', {
        config: {
          options: [
            { value: 'none', label: 'Не мешала', color: '#0f766e' },
            { value: 'slowed', label: 'Замедлила', color: '#b45309' },
            { value: 'stopped', label: 'Пришлось лечь', color: '#be123c' },
          ],
        },
      }),
      f('meds', 'Лекарства', 'sublist', {
        description:
          'Когда приняли, препарат и доза, когда почувствовали эффект.',
        config: {
          subfields: [
            {
              id: 'taken_at',
              key: 'taken_at',
              name: 'Принял',
              type: 'datetime',
              required: true,
            },
            {
              id: 'name',
              key: 'name',
              name: 'Препарат',
              type: 'text',
              required: true,
              config: { maxLength: 80, placeholder: 'Ибупрофен' },
            },
            {
              id: 'dose',
              key: 'dose',
              name: 'Доза',
              type: 'text',
              config: { maxLength: 40, placeholder: '400 мг' },
            },
            {
              id: 'felt_at',
              key: 'felt_at',
              name: 'Эффект ощутил',
              type: 'datetime',
            },
            {
              id: 'effect',
              key: 'effect',
              name: 'Эффект',
              type: 'select',
              config: {
                options: [
                  { value: 'none', label: 'Не помогло', color: '#6e6578' },
                  { value: 'partial', label: 'Чуть легче', color: '#b45309' },
                  { value: 'good', label: 'Заметно лучше', color: '#0f766e' },
                  { value: 'gone', label: 'Боль ушла', color: '#0f766e' },
                  { value: 'worse', label: 'Стало хуже', color: '#be123c' },
                ],
              },
            },
            {
              id: 'note',
              key: 'note',
              name: 'Заметка',
              type: 'text',
              config: { maxLength: 160 },
            },
          ],
        },
      }),
      f('activity', 'Нагрузка', 'sublist', {
        description:
          'Несколько эпизодов: время, тип, интенсивность и как боль на это ответила.',
        config: {
          subfields: [
            { id: 'at', key: 'at', name: 'Когда', type: 'datetime' },
            {
              id: 'kind',
              key: 'kind',
              name: 'Тип',
              type: 'select',
              config: {
                options: [
                  { value: 'walk', label: 'Ходьба' },
                  { value: 'run', label: 'Бег' },
                  { value: 'gym', label: 'Силовая' },
                  { value: 'yoga', label: 'Йога / растяжка' },
                  { value: 'cycle', label: 'Велосипед' },
                  { value: 'chores', label: 'Домашние дела' },
                  { value: 'other', label: 'Другое' },
                ],
              },
            },
            {
              id: 'intensity',
              key: 'intensity',
              name: 'Интенсивность',
              type: 'select',
              config: {
                options: [
                  { value: 'light', label: 'Лёгкая', color: '#0f766e' },
                  { value: 'moderate', label: 'Средняя', color: '#b45309' },
                  { value: 'vigorous', label: 'Тяжёлая', color: '#be123c' },
                ],
              },
            },
            {
              id: 'effect',
              key: 'effect',
              name: 'Эффект на боль',
              type: 'select',
              config: {
                options: [
                  { value: 'better_during', label: 'Во время легче' },
                  { value: 'worse_during', label: 'Во время хуже' },
                  { value: 'better_after', label: 'После легче' },
                  { value: 'worse_after', label: 'После хуже' },
                  { value: 'none', label: 'Без эффекта' },
                  { value: 'mixed', label: 'Смешанно' },
                ],
              },
            },
            {
              id: 'note',
              key: 'note',
              name: 'Комментарий',
              type: 'text',
              config: {
                maxLength: 200,
                placeholder: 'во время прогулки легче, дома снова накрыло',
              },
            },
          ],
        },
      }),
      f('triggers', 'Возможные причины', 'multiselect', {
        config: {
          options: [
            { value: 'sleep_loss', label: 'Недосып' },
            { value: 'oversleep', label: 'Переспал' },
            { value: 'stress', label: 'Стресс' },
            { value: 'weather', label: 'Погода / давление' },
            { value: 'screens', label: 'Экраны' },
            { value: 'skipped_meal', label: 'Пропустил еду' },
            { value: 'alcohol', label: 'Алкоголь' },
            { value: 'caffeine', label: 'Кофеин / отмена' },
            { value: 'hormones', label: 'Гормоны / цикл' },
            { value: 'neck', label: 'Шея / осанка' },
            { value: 'smell', label: 'Запах' },
            { value: 'light', label: 'Яркий свет' },
            { value: 'dehydration', label: 'Мало воды' },
            { value: 'heat', label: 'Жара' },
            { value: 'travel', label: 'Дорога' },
            { value: 'food', label: 'Еда' },
            { value: 'exercise', label: 'Нагрузка' },
          ],
        },
      }),
      f('helped', 'Что помогло', 'multiselect', {
        config: {
          options: [
            { value: 'dark', label: 'Темнота' },
            { value: 'sleep', label: 'Сон' },
            { value: 'water', label: 'Вода' },
            { value: 'caffeine', label: 'Кофеин' },
            { value: 'painkiller', label: 'Обезболивающее' },
            { value: 'cold', label: 'Холод' },
            { value: 'walk', label: 'Прогулка' },
            { value: 'air', label: 'Свежий воздух' },
            { value: 'massage', label: 'Массаж / шея' },
            { value: 'rest', label: 'Покой' },
            { value: 'time', label: 'Само прошло' },
          ],
        },
      }),
      f('bp_readings', 'Давление', 'relation', {
        description:
          'Привяжите измерения давления до, во время или после приступа.',
        config: { allowMultiple: true, relationDisplay: 'title' },
      }),
      f('notes', 'Комментарий', 'textarea', { config: { maxLength: 2000 } }),
    ],
    titleFieldId: 'title',
    dateFieldId: 'started_at',
    groupFieldId: 'kind',
  },
  view: { mode: 'table', dateFieldId: 'started_at', groupFieldId: 'kind' },
  charts: [
    {
      name: 'Приступы по дням',
      chart_type: 'timeline',
      config: { dateFieldId: 'started_at', aggregation: 'count' },
    },
    {
      name: 'Пик боли во времени',
      chart_type: 'stem',
      config: {
        dateFieldId: 'started_at',
        valueFieldId: 'intensity',
        aggregation: 'avg',
      },
    },
    {
      name: 'Типы приступов',
      chart_type: 'pie',
      config: { groupFieldId: 'kind' },
    },
    {
      name: 'Средний пик',
      chart_type: 'kpi',
      config: { valueFieldId: 'intensity', aggregation: 'avg' },
    },
  ],
}

const bloodPressureTemplate: TemplateSpec = {
  key: 'blood_pressure',
  title: 'Давление',
  icon: '❤️',
  description:
    'Измерения с пульсом, фото, положением, кофеином, сном, стрессом и связью с приступом боли.',
  hint: 'Систолическое, диастолическое и пульс идут на графики. Набор «Головные боли и давление» свяжет списки.',
  example:
    '8 сен 08:15, 148/92, пульс 78, сидя, немного кофе, связь с утренней мигренью.',
  schema: {
    fields: [
      f('title', 'Запись', 'text', {
        required: true,
        config: { maxLength: 160, placeholder: 'Утро дома' },
      }),
      f('measured_at', 'Дата и время', 'datetime', { required: true }),
      f('systolic', 'Систолическое', 'integer', {
        required: true,
        config: { min: 70, max: 260, placeholder: '120' },
      }),
      f('diastolic', 'Диастолическое', 'integer', {
        required: true,
        config: { min: 40, max: 160, placeholder: '80' },
      }),
      f('pulse', 'Пульс', 'integer', { config: { min: 30, max: 220 } }),
      f('irregular', 'Неровный пульс', 'boolean'),
      f('photo', 'Фото измерения', 'image', {
        config: {
          maxSizeMb: 2,
          accept: ['image/jpeg', 'image/png', 'image/webp'],
        },
      }),
      f('comment', 'Комментарий', 'text', { config: { maxLength: 200 } }),
      f('position', 'Положение', 'select', {
        config: {
          defaultValue: 'sitting',
          options: [
            { value: 'sitting', label: 'Сидя' },
            { value: 'lying', label: 'Лёжа' },
            { value: 'standing', label: 'Стоя' },
          ],
        },
      }),
      f('arm', 'Рука', 'select', {
        config: {
          options: [
            { value: 'left', label: 'Левая' },
            { value: 'right', label: 'Правая' },
          ],
        },
      }),
      f('mins_exercise', 'Минут после нагрузки', 'integer', {
        description: 'Оставьте пустым, если нагрузки не было. 0 — сразу после.',
        config: { min: 0, max: 300 },
      }),
      f('mins_meal', 'Минут после еды', 'integer', {
        description: 'Оставьте пустым, если не ели недавно.',
        config: { min: 0, max: 300 },
      }),
      f('caffeine', 'Кофеин', 'select', {
        config: { defaultValue: 'none', options: amountScale },
      }),
      f('nicotine', 'Никотин', 'select', {
        config: { defaultValue: 'none', options: amountScale },
      }),
      f('sleep_hours', 'Сон, часы', 'number', { config: { min: 0, max: 16 } }),
      f('sleep_quality', 'Сон', 'select', {
        config: {
          options: [
            { value: 'poor', label: 'Плохой', color: '#be123c' },
            { value: 'fair', label: 'Так себе', color: '#b45309' },
            { value: 'good', label: 'Хороший', color: '#0f766e' },
            { value: 'excellent', label: 'Отличный', color: '#0f766e' },
          ],
        },
      }),
      f('stress', 'Стресс', 'select', {
        config: {
          options: [
            { value: 'none', label: 'Нет', color: '#0f766e' },
            { value: 'mild', label: 'Слабый', color: '#6e6578' },
            { value: 'moderate', label: 'Умеренный', color: '#b45309' },
            { value: 'high', label: 'Сильный', color: '#be123c' },
          ],
        },
      }),
      f('wellbeing', 'Самочувствие', 'rating', {
        config: { ratingMax: 10, min: 1, max: 10 },
      }),
      f('headache_now', 'Головная боль сейчас', 'select', {
        config: {
          options: [
            { value: 'none', label: 'Нет', color: '#0f766e' },
            { value: 'mild', label: 'Слабая', color: '#b45309' },
            { value: 'moderate', label: 'Средняя', color: '#c2410c' },
            { value: 'severe', label: 'Сильная', color: '#be123c' },
          ],
        },
      }),
      f('headache', 'Приступ', 'relation', {
        description: 'Свяжите измерение с записью дневника головных болей.',
        config: { allowMultiple: true, relationDisplay: 'title' },
      }),
      f('category', 'Оценка', 'select', {
        description: 'Ориентир по цифрам: норма, повышено, высокое, кризис.',
        config: {
          options: [
            { value: 'low', label: 'Пониженное', color: '#2563eb' },
            { value: 'normal', label: 'Норма', color: '#0f766e' },
            { value: 'elevated', label: 'Повышенное', color: '#b45309' },
            { value: 'high', label: 'Высокое', color: '#be123c' },
            { value: 'crisis', label: 'Кризис', color: '#9f1239' },
          ],
        },
      }),
      f('notes', 'Примечания', 'textarea', { config: { maxLength: 1500 } }),
    ],
    titleFieldId: 'title',
    dateFieldId: 'measured_at',
    imageFieldId: 'photo',
    groupFieldId: 'category',
  },
  view: { mode: 'table', dateFieldId: 'measured_at', groupFieldId: 'category' },
  charts: [
    {
      name: 'Систолическое',
      chart_type: 'line',
      config: {
        dateFieldId: 'measured_at',
        valueFieldId: 'systolic',
        aggregation: 'avg',
      },
    },
    {
      name: 'Пульс',
      chart_type: 'line',
      config: {
        dateFieldId: 'measured_at',
        valueFieldId: 'pulse',
        aggregation: 'avg',
      },
    },
    {
      name: 'Давление по дням',
      chart_type: 'bar',
      config: {
        dateFieldId: 'measured_at',
        valueFieldId: 'systolic',
        aggregation: 'avg',
      },
    },
    { name: 'Оценки', chart_type: 'pie', config: { groupFieldId: 'category' } },
    {
      name: 'Среднее давление',
      chart_type: 'kpi',
      config: { valueFieldId: 'systolic', aggregation: 'avg' },
    },
  ],
}

export const TEMPLATES: TemplateSpec[] = [
  headacheTemplate,
  bloodPressureTemplate,
  {
    key: 'blank',
    title: 'Пустой список',
    icon: '✨',
    description: 'Соберите поля сами — любой тип, любые ограничения.',
    hint: 'Начните с одного текстового поля «Название», затем добавьте даты, оценки, файлы.',
    example:
      'Например: коллекция винила — исполнитель, год, состояние, фото обложки.',
    schema: {
      fields: [
        f('title', 'Название', 'text', {
          required: true,
          config: { maxLength: 200 },
        }),
      ],
      titleFieldId: 'title',
    },
  },
  {
    key: 'movies_watched',
    title: 'Просмотрено',
    icon: '🎬',
    description:
      'Фильмы и сериалы, которые уже посмотрели. Оценки может ставить кто угодно.',
    hint: 'Поле «Оценки» — коллективное: каждый зритель ставит свою оценку, считается среднее.',
    example:
      '«Дюна», 2021, фильм, дата 12.03.2024, оценки 8 и 9 → среднее 8.5.',
    schema: {
      fields: [
        f('title', 'Название', 'text', {
          required: true,
          config: { maxLength: 200 },
        }),
        f('year', 'Год', 'integer', { config: { min: 1888, max: 2100 } }),
        f('kind', 'Тип', 'select', { config: movieKind }),
        f('poster', 'Постер', 'image', {
          config: {
            maxSizeMb: 2,
            accept: ['image/jpeg', 'image/png', 'image/webp'],
          },
        }),
        f('watched_at', 'Дата просмотра', 'date'),
        f('ratings', 'Оценки', 'multi_rating', {
          config: { min: 1, max: 10, ratingMax: 10 },
        }),
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
        config: {
          dateFieldId: 'watched_at',
          valueFieldId: 'ratings',
          aggregation: 'avg',
        },
      },
    ],
  },
  {
    key: 'movies_watchlist',
    title: 'К просмотру',
    icon: '🍿',
    description:
      'Очередь фильмов и сериалов. Перекидывайте в «Просмотрено» или «Не буду».',
    hint: 'Кнопки переноса появятся, если создать набор «Кино» — он свяжет три списка.',
    example:
      'Нажали «Просмотрено» → запись уходит в другой список, дата просмотра ставится сегодня.',
    schema: {
      fields: [
        f('title', 'Название', 'text', {
          required: true,
          config: { maxLength: 200 },
        }),
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
    description:
      'Отложенные или отвергнутые тайтлы — чтобы не предлагать их снова.',
    hint: 'Укажите причину: так проще понять, почему список «к просмотру» сократился.',
    example: '«Не зашёл тон» + дата решения.',
    schema: {
      fields: [
        f('title', 'Название', 'text', {
          required: true,
          config: { maxLength: 200 },
        }),
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
        f('title', 'Название', 'text', {
          required: true,
          config: { maxLength: 200 },
        }),
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
        f('ratings', 'Оценки', 'multi_rating', {
          config: { ratingMax: 10, min: 1, max: 10 },
        }),
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
    view: {
      mode: 'gallery',
      imageFieldId: 'cover',
      dateFieldId: 'finished_at',
    },
    charts: [
      {
        name: 'Когда проходили',
        chart_type: 'timeline',
        config: { dateFieldId: 'finished_at', aggregation: 'count' },
      },
      {
        name: 'Оценки по времени',
        chart_type: 'stem',
        config: {
          dateFieldId: 'finished_at',
          valueFieldId: 'ratings',
          aggregation: 'avg',
        },
      },
    ],
  },
  {
    key: 'games_backlog',
    title: 'К прохождению',
    icon: '🕹️',
    description: 'Очередь игр. Перекидывайте в «Пройденные» кнопкой.',
    hint: 'Набор «Игры» свяжет очередь и каталог пройденного — дата прохождения поставится сама.',
    example:
      'Hades, Switch, срочно → «Пройдено» → часы и оценка уже в другом списке.',
    schema: {
      fields: [
        f('title', 'Название', 'text', {
          required: true,
          config: { maxLength: 200 },
        }),
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
    description:
      'Список покупок с вычёркиванием. Можно переносить в «Куплено».',
    hint: 'Включите вычёркивание: при галочке можно ставить дату и двигать позицию в другой список.',
    example: 'Молоко ×2 → галочка → уходит в «Куплено» с сегодняшней датой.',
    schema: {
      fields: [
        f('name', 'Позиция', 'text', {
          required: true,
          config: { maxLength: 120 },
        }),
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
        f('name', 'Позиция', 'text', {
          required: true,
          config: { maxLength: 120 },
        }),
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
        config: {
          dateFieldId: 'bought_at',
          valueFieldId: 'price',
          aggregation: 'sum',
        },
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
        f('name', 'Позиция', 'text', {
          required: true,
          config: { maxLength: 120 },
        }),
        f('qty', 'Количество', 'number', { config: { min: 0 } }),
        f('when', 'Когда', 'text', {
          config: { maxLength: 80, placeholder: 'к Новому году' },
        }),
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
    example:
      '«Оплатить интернет» до пятницы → галочка → дата выполнения сегодня.',
    schema: {
      fields: [
        f('title', 'Задача', 'text', {
          required: true,
          config: { maxLength: 200 },
        }),
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
        f('title', 'Название', 'text', {
          required: true,
          config: { maxLength: 200 },
        }),
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
    description:
      'Справочник сущностей без повторов: фильмы, книги, места, блюда — что угодно.',
    hint: 'Одна запись = один объект. Повторные события с датами и оценками ведите в журнале из набора «Каталог и журнал».',
    example:
      '«Дюна», 2021, постер. Сам фильм один — просмотры с разными оценками живут в журнале.',
    schema: {
      fields: [
        f('title', 'Название', 'text', {
          required: true,
          config: { maxLength: 200 },
        }),
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
          config: {
            maxSizeMb: 2,
            accept: ['image/jpeg', 'image/png', 'image/webp'],
          },
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
    description:
      'Повторяющиеся события: каждый раз — своя дата, оценка и заметка, ссылка на запись каталога.',
    hint: 'Свяжите поле «Что» со списком-каталогом. Один фильм можно открыть много раз — каждый просмотр отдельной строкой.',
    example:
      'Дюна · 12.03.2024 · 9; Дюна · 01.09.2025 · 8 — два просмотра, две оценки.',
    schema: {
      fields: [
        f('subject', 'Что', 'relation', {
          required: true,
          config: { relationDisplay: 'title_cover', allowMultiple: false },
        }),
        f('happened_at', 'Дата', 'date', { required: true }),
        f('score', 'Оценка', 'rating', {
          config: { ratingMax: 10, min: 1, max: 10 },
        }),
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
        config: {
          dateFieldId: 'happened_at',
          valueFieldId: 'score',
          aggregation: 'avg',
        },
      },
    ],
  },
]

export const TEMPLATE_PACKS: TemplatePack[] = [
  {
    key: 'health',
    title: 'Головные боли и давление',
    icon: '🩺',
    description:
      'Дневник приступов и журнал давления. Списки связаны в обе стороны: к приступу — несколько измерений, к измерению — приступ.',
    hint: 'Создаются оба списка. В приступе поле «Давление» уже смотрит на журнал, в измерении «Приступ» — на дневник.',
    lists: [
      TEMPLATES.find((t) => t.key === 'headache_diary')!,
      TEMPLATES.find((t) => t.key === 'blood_pressure')!,
    ],
    relations: [
      {
        fromKey: 'headache_diary',
        fieldId: 'bp_readings',
        toKey: 'blood_pressure',
      },
      {
        fromKey: 'blood_pressure',
        fieldId: 'headache',
        toKey: 'headache_diary',
      },
    ],
  },
  {
    key: 'catalog_log',
    title: 'Каталог и журнал',
    icon: '📖',
    description:
      'Справочник объектов + журнал повторений: одна сущность — много дат и оценок.',
    hint: 'Создаются «Каталог» и «Журнал». В журнале поле «Что» уже связано с каталогом и показывает название с обложкой.',
    lists: [
      TEMPLATES.find((t) => t.key === 'catalog_items')!,
      TEMPLATES.find((t) => t.key === 'event_log')!,
    ],
    relations: [
      { fromKey: 'event_log', fieldId: 'subject', toKey: 'catalog_items' },
    ],
  },
  {
    key: 'cinema',
    title: 'Кино и сериалы',
    icon: '🎬',
    description:
      'Три связанных списка: очередь, просмотрено, отказ. Кнопки переноса уже настроены.',
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
        fieldMap: {
          title: 'title',
          year: 'year',
          kind: 'kind',
          poster: 'poster',
        },
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
        fieldMap: {
          name: 'name',
          qty: 'qty',
          category: 'category',
          bought_at: 'bought_at',
        },
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
    fields: [
      f('title', titleFieldName, 'text', {
        required: true,
        config: { maxLength: 200 },
      }),
    ],
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
    config:
      type === 'rating' || type === 'multi_rating'
        ? { ratingMax: 10, min: 1, max: 10 }
        : {},
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

const STAMP_FIELDS = [
  'watched_at',
  'bought_at',
  'decided_at',
  'finished_at',
] as const

function stampFieldsFor(
  target: TemplateSpec | undefined,
): Record<string, unknown> {
  const ids = new Set((target?.schema.fields ?? []).map((field) => field.id))
  return Object.fromEntries(
    STAMP_FIELDS.filter((id) => ids.has(id)).map((id) => [id, '$today']),
  )
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
      {
        type: 'move_to_list',
        targetListId: toId,
        fieldMap: move.fieldMap,
        deleteSource: true,
      },
    ]
    settings.onUncheck = settings.onUncheck ?? [{ type: 'restore_snapshot' }]
    byKey[move.fromKey] = settings
  }

  return pack.lists
    .map((spec) => {
      const listId = created[spec.key]
      if (!listId) return null
      const schema = schemaByKey[spec.key]
      const linked = Boolean(
        pack.relations?.some((row) => row.fromKey === spec.key),
      )
      const row: {
        listId: string
        settings: ListSettings
        schema?: ListSchema
      } = {
        listId,
        settings: byKey[spec.key] ?? {},
      }
      if (linked) row.schema = schema
      return row
    })
    .filter(
      (
        row,
      ): row is {
        listId: string
        settings: ListSettings
        schema?: ListSchema
      } => row != null,
    )
}

export function checkActionsFromTemplate(
  spec: TemplateSpec,
): AutomationAction[] {
  return spec.settings?.onCheck ?? []
}
