-- Demo users and sample lists for Chroniqe.
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
(
  'b11e0000-0000-4000-8000-000000000011',
  'a11e0000-0000-4000-8000-000000000001',
  'К просмотру',
  'Общая очередь на выходные. Друзья предлагают тайтлы, можно перенести в «Просмотрено».',
  '🍿',
  'movies_watchlist',
  '{"fields":[{"id":"title","key":"title","name":"Название","type":"text","required":true,"config":{"maxLength":200}},{"id":"year","key":"year","name":"Год","type":"integer","config":{"min":1888,"max":2100}},{"id":"kind","key":"kind","name":"Тип","type":"select","config":{"options":[{"value":"movie","label":"Фильм"},{"value":"series","label":"Сериал"},{"value":"anime","label":"Аниме"},{"value":"doc","label":"Документальный"}]}},{"id":"poster","key":"poster","name":"Постер","type":"image","config":{"maxSizeMb":2}},{"id":"priority","key":"priority","name":"Приоритет","type":"select","config":{"options":[{"value":"now","label":"Срочно","color":"#be123c"},{"value":"soon","label":"Скоро","color":"#b45309"},{"value":"someday","label":"Когда-нибудь","color":"#6e6578"}]}},{"id":"note","key":"note","name":"Заметка","type":"textarea","config":{"maxLength":500}}],"titleFieldId":"title","imageFieldId":"poster","groupFieldId":"priority"}'::jsonb,
  '{"mode":"cards","allowedKinds":["cards","board","table"],"activeViewId":"v-cards","imageFieldId":"poster","groupFieldId":"priority","views":[{"id":"v-cards","name":"Карточки","kind":"cards","cardLayout":"grid","groupFieldId":"priority","coverFieldId":"poster","titleFieldId":"title"},{"id":"v-board","name":"Доска","kind":"board","groupFieldId":"priority","titleFieldId":"title"},{"id":"v-table","name":"Таблица","kind":"table","density":"comfortable","titleFieldId":"title"}]}'::jsonb,
  '{"showcase":{"featured":true,"topic":"flow"},"transferActions":[{"id":"t-watched","label":"Просмотрено","targetListId":"b11e0000-0000-4000-8000-000000000012","fieldMap":{"title":"title","year":"year","kind":"kind","poster":"poster"},"deleteSource":true,"setFields":{"watched_at":"today"}},{"id":"t-dropped","label":"Не буду смотреть","targetListId":"b11e0000-0000-4000-8000-000000000013","fieldMap":{"title":"title","year":"year","kind":"kind"},"deleteSource":true}]}'::jsonb,
  'public',
  'friends'
),
(
  'b11e0000-0000-4000-8000-000000000012',
  'a11e0000-0000-4000-8000-000000000001',
  'Просмотрено',
  'Каталог просмотров клуба: таблица, лента, календарь, коллективные оценки и предложения правок.',
  '🎬',
  'movies_watched',
  '{"fields":[{"id":"title","key":"title","name":"Название","type":"text","required":true,"config":{"maxLength":200}},{"id":"year","key":"year","name":"Год","type":"integer","config":{"min":1888,"max":2100}},{"id":"kind","key":"kind","name":"Тип","type":"select","config":{"options":[{"value":"movie","label":"Фильм"},{"value":"series","label":"Сериал"},{"value":"anime","label":"Аниме"},{"value":"doc","label":"Документальный"}]}},{"id":"poster","key":"poster","name":"Постер","type":"image","config":{"maxSizeMb":2}},{"id":"watched_at","key":"watched_at","name":"Дата просмотра","type":"date"},{"id":"ratings","key":"ratings","name":"Оценки","type":"multi_rating","config":{"min":1,"max":10,"ratingMax":10}},{"id":"seasons","key":"seasons","name":"Сезоны","type":"sublist","config":{"subfields":[{"id":"season","key":"season","name":"Сезон","type":"integer","required":true,"config":{"min":1,"max":80}},{"id":"episodes","key":"episodes","name":"Серии","type":"integer","config":{"min":1,"max":200}},{"id":"finished_at","key":"finished_at","name":"Досмотрен","type":"date"},{"id":"score","key":"score","name":"Оценка сезона","type":"rating","config":{"ratingMax":10,"min":1,"max":10}}]}},{"id":"review","key":"review","name":"Отзыв","type":"textarea","config":{"maxLength":2000}}],"titleFieldId":"title","imageFieldId":"poster","dateFieldId":"watched_at"}'::jsonb,
  '{"mode":"table","allowedKinds":["table","cards","timeline","calendar"],"activeViewId":"v-table","imageFieldId":"poster","dateFieldId":"watched_at","views":[{"id":"v-table","name":"Таблица","kind":"table","density":"comfortable","dateFieldId":"watched_at","coverFieldId":"poster","titleFieldId":"title"},{"id":"v-cards","name":"Карточки","kind":"cards","cardLayout":"grid","coverFieldId":"poster","titleFieldId":"title","groupFieldId":"kind"},{"id":"v-media","name":"Галерея","kind":"cards","cardLayout":"media","coverFieldId":"poster","titleFieldId":"title"},{"id":"v-time","name":"Лента","kind":"timeline","dateFieldId":"watched_at","coverFieldId":"poster","titleFieldId":"title"},{"id":"v-cal","name":"Календарь","kind":"calendar","dateFieldId":"watched_at","titleFieldId":"title"}]}'::jsonb,
  '{"showcase":{"featured":true,"topic":"ratings"}}'::jsonb,
  'public',
  'proposals'
),
(
  'b11e0000-0000-4000-8000-000000000013',
  'a11e0000-0000-4000-8000-000000000001',
  'Не буду смотреть',
  'Личный отказник — не светится в ленте.',
  '🚫',
  'movies_dropped',
  '{"fields":[{"id":"title","key":"title","name":"Название","type":"text","required":true,"config":{"maxLength":200}},{"id":"year","key":"year","name":"Год","type":"integer","config":{"min":1888,"max":2100}},{"id":"kind","key":"kind","name":"Тип","type":"select","config":{"options":[{"value":"movie","label":"Фильм"},{"value":"series","label":"Сериал"},{"value":"anime","label":"Аниме"},{"value":"doc","label":"Документальный"}]}},{"id":"reason","key":"reason","name":"Причина","type":"textarea","config":{"maxLength":500}},{"id":"decided_at","key":"decided_at","name":"Дата","type":"date"}],"titleFieldId":"title","dateFieldId":"decided_at"}'::jsonb,
  '{"mode":"table","allowedKinds":["table"],"activeViewId":"v-table","views":[{"id":"v-table","name":"Таблица","kind":"table","titleFieldId":"title","dateFieldId":"decided_at"}]}'::jsonb,
  '{}'::jsonb,
  'private',
  'owner'
),
(
  'b11e0000-0000-4000-8000-000000000021',
  'a11e0000-0000-4000-8000-000000000002',
  'Покупки',
  'Семейный список с вычёркиванием и кнопками «Куплено» / «к празднику».',
  '🛒',
  'shopping',
  '{"fields":[{"id":"name","key":"name","name":"Позиция","type":"text","required":true,"config":{"maxLength":120}},{"id":"qty","key":"qty","name":"Количество","type":"number","config":{"min":0,"max":9999}},{"id":"category","key":"category","name":"Категория","type":"select","config":{"options":[{"value":"food","label":"Еда"},{"value":"home","label":"Дом"},{"value":"tech","label":"Техника"},{"value":"other","label":"Другое"}]}},{"id":"note","key":"note","name":"Заметка","type":"text","config":{"maxLength":200}},{"id":"bought_at","key":"bought_at","name":"Куплено","type":"date","hidden":true}],"titleFieldId":"name","dateFieldId":"bought_at","groupFieldId":"category"}'::jsonb,
  '{"mode":"compact","allowedKinds":["cards","board","table"],"activeViewId":"v-compact","groupFieldId":"category","views":[{"id":"v-compact","name":"Компактно","kind":"cards","cardLayout":"compact","groupFieldId":"category","titleFieldId":"name"},{"id":"v-board","name":"По полкам","kind":"board","groupFieldId":"category","titleFieldId":"name"},{"id":"v-table","name":"Таблица","kind":"table","titleFieldId":"name"}]}'::jsonb,
  '{"showcase":{"featured":true,"topic":"flow"},"enableCheck":true,"checkLabel":"Куплено","onCheck":[{"type":"set_now","fieldId":"bought_at"},{"type":"move_to_list","targetListId":"b11e0000-0000-4000-8000-000000000022","fieldMap":{"name":"name","qty":"qty","category":"category","bought_at":"bought_at"},"deleteSource":true}],"onUncheck":[{"type":"restore_snapshot"}],"transferActions":[{"id":"t-bought","label":"Куплено","targetListId":"b11e0000-0000-4000-8000-000000000022","fieldMap":{"name":"name","qty":"qty","category":"category"},"deleteSource":true},{"id":"t-later","label":"К Новому году","targetListId":"b11e0000-0000-4000-8000-000000000023","fieldMap":{"name":"name","qty":"qty"},"deleteSource":true}]}'::jsonb,
  'public',
  'friends'
),
(
  'b11e0000-0000-4000-8000-000000000022',
  'a11e0000-0000-4000-8000-000000000002',
  'Куплено',
  'История покупок с ценами — бар и круговая по категориям.',
  '📦',
  'bought',
  '{"fields":[{"id":"name","key":"name","name":"Позиция","type":"text","required":true,"config":{"maxLength":120}},{"id":"qty","key":"qty","name":"Количество","type":"number","config":{"min":0}},{"id":"bought_at","key":"bought_at","name":"Дата","type":"date"},{"id":"price","key":"price","name":"Цена","type":"number","config":{"min":0}},{"id":"category","key":"category","name":"Категория","type":"select","config":{"options":[{"value":"food","label":"Еда"},{"value":"home","label":"Дом"},{"value":"tech","label":"Техника"},{"value":"other","label":"Другое"}]}}],"titleFieldId":"name","dateFieldId":"bought_at","groupFieldId":"category"}'::jsonb,
  '{"mode":"table","allowedKinds":["table","board","timeline"],"activeViewId":"v-table","dateFieldId":"bought_at","views":[{"id":"v-table","name":"Таблица","kind":"table","dateFieldId":"bought_at","titleFieldId":"name"},{"id":"v-board","name":"Категории","kind":"board","groupFieldId":"category","titleFieldId":"name"},{"id":"v-time","name":"Лента","kind":"timeline","dateFieldId":"bought_at","titleFieldId":"name"}]}'::jsonb,
  '{"showcase":{"featured":true,"topic":"charts"}}'::jsonb,
  'public',
  'owner'
),
(
  'b11e0000-0000-4000-8000-000000000023',
  'a11e0000-0000-4000-8000-000000000002',
  'Купить к событию',
  'Отложенные покупки к праздникам.',
  '🎄',
  'later_shopping',
  '{"fields":[{"id":"name","key":"name","name":"Позиция","type":"text","required":true,"config":{"maxLength":120}},{"id":"qty","key":"qty","name":"Количество","type":"number","config":{"min":0}},{"id":"when","key":"when","name":"Когда","type":"text","config":{"maxLength":80}},{"id":"note","key":"note","name":"Заметка","type":"textarea","config":{"maxLength":400}}],"titleFieldId":"name"}'::jsonb,
  '{"mode":"cards","allowedKinds":["cards"],"activeViewId":"v-compact","views":[{"id":"v-compact","name":"Список","kind":"cards","cardLayout":"compact","titleFieldId":"name"}]}'::jsonb,
  '{}'::jsonb,
  'private',
  'owner'
),
(
  'b11e0000-0000-4000-8000-000000000031',
  'a11e0000-0000-4000-8000-000000000003',
  'Пройденные игры',
  'Галерея пройденного: часы, платформы, оценки друзей и графики.',
  '🎮',
  'games_done',
  '{"fields":[{"id":"title","key":"title","name":"Название","type":"text","required":true,"config":{"maxLength":200}},{"id":"platform","key":"platform","name":"Платформа","type":"select","config":{"options":[{"value":"pc","label":"PC"},{"value":"ps","label":"PlayStation"},{"value":"xbox","label":"Xbox"},{"value":"switch","label":"Switch"},{"value":"mobile","label":"Телефон"},{"value":"other","label":"Другое"}]}},{"id":"cover","key":"cover","name":"Обложка","type":"image","config":{"maxSizeMb":2}},{"id":"finished_at","key":"finished_at","name":"Пройдено","type":"date"},{"id":"hours","key":"hours","name":"Часы","type":"number","config":{"min":0,"max":10000}},{"id":"ratings","key":"ratings","name":"Оценки","type":"multi_rating","config":{"ratingMax":10,"min":1,"max":10}},{"id":"status","key":"status","name":"Статус","type":"select","config":{"options":[{"value":"completed","label":"Пройдено"},{"value":"main","label":"Сюжет"},{"value":"hundred","label":"100%"},{"value":"dropped","label":"Брошено"}]}},{"id":"note","key":"note","name":"Заметка","type":"textarea","config":{"maxLength":1000}}],"titleFieldId":"title","imageFieldId":"cover","dateFieldId":"finished_at","groupFieldId":"platform"}'::jsonb,
  '{"mode":"gallery","allowedKinds":["cards","board","table","timeline"],"activeViewId":"v-media","imageFieldId":"cover","dateFieldId":"finished_at","views":[{"id":"v-media","name":"Галерея","kind":"cards","cardLayout":"media","coverFieldId":"cover","titleFieldId":"title","dateFieldId":"finished_at"},{"id":"v-board","name":"По платформам","kind":"board","groupFieldId":"platform","titleFieldId":"title"},{"id":"v-table","name":"Таблица","kind":"table","dateFieldId":"finished_at","titleFieldId":"title"},{"id":"v-time","name":"Лента","kind":"timeline","dateFieldId":"finished_at","coverFieldId":"cover","titleFieldId":"title"}]}'::jsonb,
  '{"showcase":{"featured":true,"topic":"views"}}'::jsonb,
  'public',
  'proposals'
),
(
  'b11e0000-0000-4000-8000-000000000032',
  'a11e0000-0000-4000-8000-000000000003',
  'Книги',
  'Книжный клуб на доске: хочу / читаю / прочитано. Анна — редактор.',
  '📚',
  'books',
  '{"fields":[{"id":"title","key":"title","name":"Название","type":"text","required":true,"config":{"maxLength":200}},{"id":"author","key":"author","name":"Автор","type":"text","config":{"maxLength":120}},{"id":"cover","key":"cover","name":"Обложка","type":"image","config":{"maxSizeMb":2}},{"id":"finished_at","key":"finished_at","name":"Прочитано","type":"date"},{"id":"ratings","key":"ratings","name":"Оценки","type":"multi_rating","config":{"ratingMax":10}},{"id":"status","key":"status","name":"Статус","type":"select","config":{"options":[{"value":"want","label":"Хочу"},{"value":"reading","label":"Читаю"},{"value":"done","label":"Прочитано"},{"value":"dropped","label":"Брошено"}]}},{"id":"note","key":"note","name":"Заметка","type":"textarea","config":{"maxLength":2000}}],"titleFieldId":"title","imageFieldId":"cover","dateFieldId":"finished_at","groupFieldId":"status"}'::jsonb,
  '{"mode":"board","allowedKinds":["board","cards","table"],"activeViewId":"v-board","groupFieldId":"status","views":[{"id":"v-board","name":"Доска","kind":"board","groupFieldId":"status","titleFieldId":"title","coverFieldId":"cover"},{"id":"v-cards","name":"Карточки","kind":"cards","cardLayout":"grid","coverFieldId":"cover","titleFieldId":"title"},{"id":"v-table","name":"Таблица","kind":"table","titleFieldId":"title"}]}'::jsonb,
  '{"showcase":{"featured":true,"topic":"views"}}'::jsonb,
  'public',
  'friends'
),
(
  'b11e0000-0000-4000-8000-000000000033',
  'a11e0000-0000-4000-8000-000000000003',
  'Дела на неделю',
  'Личные задачи — только для Лены.',
  '✅',
  'todo',
  '{"fields":[{"id":"title","key":"title","name":"Задача","type":"text","required":true,"config":{"maxLength":200}},{"id":"due","key":"due","name":"Срок","type":"date"},{"id":"priority","key":"priority","name":"Приоритет","type":"select","config":{"options":[{"value":"high","label":"Высокий","color":"#be123c"},{"value":"mid","label":"Средний","color":"#b45309"},{"value":"low","label":"Низкий","color":"#0f766e"}]}},{"id":"done_at","key":"done_at","name":"Выполнено","type":"date","hidden":true},{"id":"notes","key":"notes","name":"Заметки","type":"textarea","config":{"maxLength":1000}}],"titleFieldId":"title","dateFieldId":"due","groupFieldId":"priority"}'::jsonb,
  '{"mode":"cards","allowedKinds":["cards"],"activeViewId":"v-compact","views":[{"id":"v-compact","name":"Список","kind":"cards","cardLayout":"compact","groupFieldId":"priority","titleFieldId":"title"}]}'::jsonb,
  '{"enableCheck":true,"checkLabel":"Готово","onCheck":[{"type":"set_now","fieldId":"done_at"}]}'::jsonb,
  'private',
  'owner'
),
(
  'b11e0000-0000-4000-8000-000000000041',
  'a11e0000-0000-4000-8000-000000000004',
  'Дела',
  'Публичный todo: вычёркивание, сроки, просрочки в сводке.',
  '✅',
  'todo',
  '{"fields":[{"id":"title","key":"title","name":"Задача","type":"text","required":true,"config":{"maxLength":200}},{"id":"due","key":"due","name":"Срок","type":"date"},{"id":"priority","key":"priority","name":"Приоритет","type":"select","config":{"options":[{"value":"high","label":"Высокий","color":"#be123c"},{"value":"mid","label":"Средний","color":"#b45309"},{"value":"low","label":"Низкий","color":"#0f766e"}]}},{"id":"done_at","key":"done_at","name":"Выполнено","type":"date","hidden":true},{"id":"notes","key":"notes","name":"Заметки","type":"textarea","config":{"maxLength":1000}}],"titleFieldId":"title","dateFieldId":"due","groupFieldId":"priority"}'::jsonb,
  '{"mode":"compact","allowedKinds":["cards","calendar","table"],"activeViewId":"v-compact","groupFieldId":"priority","views":[{"id":"v-compact","name":"Список","kind":"cards","cardLayout":"compact","groupFieldId":"priority","titleFieldId":"title"},{"id":"v-cal","name":"Календарь","kind":"calendar","dateFieldId":"due","titleFieldId":"title"},{"id":"v-table","name":"Таблица","kind":"table","dateFieldId":"due","titleFieldId":"title"}]}'::jsonb,
  '{"showcase":{"featured":true,"topic":"views"},"enableCheck":true,"checkLabel":"Готово","onCheck":[{"type":"set_now","fieldId":"done_at"}]}'::jsonb,
  'public',
  'owner'
),
(
  'b11e0000-0000-4000-8000-000000000042',
  'a11e0000-0000-4000-8000-000000000004',
  'Рецепты',
  'Карточки блюд по типу: суп, основное, десерт, выпечка.',
  '🍝',
  'blank',
  '{"fields":[{"id":"title","key":"title","name":"Название","type":"text","required":true,"config":{"maxLength":200}},{"id":"time","key":"time","name":"Минуты","type":"integer","config":{"min":1,"max":600}},{"id":"tag","key":"tag","name":"Тип","type":"select","config":{"options":[{"value":"soup","label":"Суп"},{"value":"main","label":"Основное"},{"value":"dessert","label":"Десерт"},{"value":"bake","label":"Выпечка"}]}},{"id":"photo","key":"photo","name":"Фото","type":"image","config":{"maxSizeMb":2}},{"id":"servings","key":"servings","name":"Порции","type":"integer","config":{"min":1,"max":20}}],"titleFieldId":"title","imageFieldId":"photo","groupFieldId":"tag"}'::jsonb,
  '{"mode":"cards","allowedKinds":["cards","board","table"],"activeViewId":"v-cards","groupFieldId":"tag","views":[{"id":"v-cards","name":"Карточки","kind":"cards","cardLayout":"grid","groupFieldId":"tag","coverFieldId":"photo","titleFieldId":"title"},{"id":"v-board","name":"По типу","kind":"board","groupFieldId":"tag","titleFieldId":"title"},{"id":"v-table","name":"Таблица","kind":"table","titleFieldId":"title"}]}'::jsonb,
  '{"showcase":{"featured":true,"topic":"views"}}'::jsonb,
  'public',
  'owner'
),
(
  'b11e0000-0000-4000-8000-000000000043',
  'a11e0000-0000-4000-8000-000000000004',
  'Винил',
  'Коллекция пластинок: состояние, год, обложки.',
  '💿',
  'blank',
  '{"fields":[{"id":"title","key":"title","name":"Альбом","type":"text","required":true,"config":{"maxLength":200}},{"id":"artist","key":"artist","name":"Исполнитель","type":"text","config":{"maxLength":120}},{"id":"year","key":"year","name":"Год","type":"integer","config":{"min":1900,"max":2100}},{"id":"cover","key":"cover","name":"Обложка","type":"image","config":{"maxSizeMb":2}},{"id":"cond","key":"cond","name":"Состояние","type":"select","config":{"options":[{"value":"mint","label":"Mint","color":"#0f766e"},{"value":"vg","label":"VG+","color":"#b45309"},{"value":"g","label":"G","color":"#6e6578"}]}}],"titleFieldId":"title","imageFieldId":"cover","groupFieldId":"cond"}'::jsonb,
  '{"mode":"table","allowedKinds":["table","cards","board"],"activeViewId":"v-table","views":[{"id":"v-table","name":"Таблица","kind":"table","titleFieldId":"title"},{"id":"v-media","name":"Галерея","kind":"cards","cardLayout":"media","coverFieldId":"cover","titleFieldId":"title"},{"id":"v-board","name":"Состояние","kind":"board","groupFieldId":"cond","titleFieldId":"title"}]}'::jsonb,
  '{"showcase":{"featured":true,"topic":"views"}}'::jsonb,
  'public',
  'owner'
),
(
  'b11e0000-0000-4000-8000-000000000051',
  '6c1d42f0-3128-4ea9-bbeb-161f6cd98ba0',
  'Идеи для Chroniqe',
  'Публичный бэклог фич: приоритеты, галочки, заметки.',
  '✨',
  'todo',
  '{"fields":[{"id":"title","key":"title","name":"Задача","type":"text","required":true,"config":{"maxLength":200}},{"id":"due","key":"due","name":"Срок","type":"date"},{"id":"priority","key":"priority","name":"Приоритет","type":"select","config":{"options":[{"value":"high","label":"Высокий","color":"#be123c"},{"value":"mid","label":"Средний","color":"#b45309"},{"value":"low","label":"Низкий","color":"#0f766e"}]}},{"id":"done_at","key":"done_at","name":"Выполнено","type":"date","hidden":true},{"id":"notes","key":"notes","name":"Заметки","type":"textarea","config":{"maxLength":1000}}],"titleFieldId":"title","dateFieldId":"due","groupFieldId":"priority"}'::jsonb,
  '{"mode":"compact","allowedKinds":["cards","board"],"activeViewId":"v-compact","groupFieldId":"priority","views":[{"id":"v-compact","name":"Список","kind":"cards","cardLayout":"compact","groupFieldId":"priority","titleFieldId":"title"},{"id":"v-board","name":"Доска","kind":"board","groupFieldId":"priority","titleFieldId":"title"}]}'::jsonb,
  '{"showcase":{"featured":true,"topic":"collab"},"enableCheck":true,"checkLabel":"Готово"}'::jsonb,
  'public',
  'owner'
),
(
  'b11e0000-0000-4000-8000-000000000061',
  'a11e0000-0000-4000-8000-000000000003',
  'К прохождению',
  'Очередь игр. Кнопка «Пройдено» переносит запись в каталог с сегодняшней датой.',
  '🕹️',
  'games_backlog',
  '{"fields":[{"id":"title","key":"title","name":"Название","type":"text","required":true,"config":{"maxLength":200}},{"id":"platform","key":"platform","name":"Платформа","type":"select","config":{"options":[{"value":"pc","label":"PC"},{"value":"ps","label":"PlayStation"},{"value":"xbox","label":"Xbox"},{"value":"switch","label":"Switch"},{"value":"mobile","label":"Телефон"},{"value":"other","label":"Другое"}]}},{"id":"cover","key":"cover","name":"Обложка","type":"image","config":{"maxSizeMb":2}},{"id":"priority","key":"priority","name":"Приоритет","type":"select","config":{"options":[{"value":"now","label":"Срочно","color":"#be123c"},{"value":"soon","label":"Скоро","color":"#b45309"},{"value":"someday","label":"Когда-нибудь","color":"#6e6578"}]}},{"id":"note","key":"note","name":"Заметка","type":"textarea","config":{"maxLength":500}}],"titleFieldId":"title","imageFieldId":"cover","groupFieldId":"priority"}'::jsonb,
  '{"mode":"cards","allowedKinds":["cards","board"],"activeViewId":"v-cards","imageFieldId":"cover","groupFieldId":"priority","views":[{"id":"v-cards","name":"Карточки","kind":"cards","cardLayout":"grid","groupFieldId":"priority","coverFieldId":"cover","titleFieldId":"title"},{"id":"v-board","name":"Приоритет","kind":"board","groupFieldId":"priority","titleFieldId":"title"}]}'::jsonb,
  '{"showcase":{"featured":true,"topic":"flow"},"transferActions":[{"id":"t-played","label":"Пройдено","targetListId":"b11e0000-0000-4000-8000-000000000031","fieldMap":{"title":"title","platform":"platform","cover":"cover"},"deleteSource":true,"setFields":{"finished_at":"$today"}}]}'::jsonb,
  'public',
  'friends'
),
(
  'b11e0000-0000-4000-8000-000000000062',
  'a11e0000-0000-4000-8000-000000000002',
  'Спринт команды',
  'Общая доска: Анна, Лена и Олег — редакторы. Статусы, сроки, оценки задач.',
  '🏁',
  'blank',
  '{"fields":[{"id":"title","key":"title","name":"Задача","type":"text","required":true,"config":{"maxLength":200}},{"id":"status","key":"status","name":"Статус","type":"select","config":{"options":[{"value":"backlog","label":"Бэклог","color":"#6e6578"},{"value":"doing","label":"В работе","color":"#2563eb"},{"value":"review","label":"Ревью","color":"#b45309"},{"value":"done","label":"Готово","color":"#0f766e"}]}},{"id":"owner","key":"owner","name":"Кто","type":"select","config":{"options":[{"value":"anna","label":"Анна"},{"value":"kirill","label":"Кирилл"},{"value":"lena","label":"Лена"},{"value":"oleg","label":"Олег"}]}},{"id":"points","key":"points","name":"Оценка","type":"integer","config":{"min":1,"max":13}},{"id":"due","key":"due","name":"Срок","type":"date"},{"id":"notes","key":"notes","name":"Заметки","type":"textarea","config":{"maxLength":800}}],"titleFieldId":"title","dateFieldId":"due","groupFieldId":"status"}'::jsonb,
  '{"mode":"board","allowedKinds":["board","table","calendar"],"activeViewId":"v-board","groupFieldId":"status","views":[{"id":"v-board","name":"Доска","kind":"board","groupFieldId":"status","titleFieldId":"title"},{"id":"v-table","name":"Таблица","kind":"table","titleFieldId":"title"},{"id":"v-cal","name":"Календарь","kind":"calendar","dateFieldId":"due","titleFieldId":"title"}]}'::jsonb,
  '{"showcase":{"featured":true,"topic":"collab"},"enableCheck":true,"checkLabel":"Закрыто"}'::jsonb,
  'public',
  'selected'
),
(
  'b11e0000-0000-4000-8000-000000000063',
  'a11e0000-0000-4000-8000-000000000001',
  'Поездки',
  'Календарь и лента поездок с бюджетом — удобно показать виды по датам.',
  '🧳',
  'blank',
  '{"fields":[{"id":"title","key":"title","name":"Поездка","type":"text","required":true,"config":{"maxLength":200}},{"id":"place","key":"place","name":"Куда","type":"text","config":{"maxLength":120}},{"id":"starts","key":"starts","name":"Старт","type":"date"},{"id":"kind","key":"kind","name":"Тип","type":"select","config":{"options":[{"value":"city","label":"Город"},{"value":"nature","label":"Природа"},{"value":"visit","label":"В гости"},{"value":"work","label":"Работа"}]}},{"id":"budget","key":"budget","name":"Бюджет","type":"number","config":{"min":0}},{"id":"cover","key":"cover","name":"Фото","type":"image","config":{"maxSizeMb":2}},{"id":"note","key":"note","name":"Заметка","type":"textarea","config":{"maxLength":500}}],"titleFieldId":"title","imageFieldId":"cover","dateFieldId":"starts","groupFieldId":"kind"}'::jsonb,
  '{"mode":"timeline","allowedKinds":["calendar","timeline","cards"],"activeViewId":"v-cal","imageFieldId":"cover","dateFieldId":"starts","views":[{"id":"v-cal","name":"Календарь","kind":"calendar","dateFieldId":"starts","coverFieldId":"cover","titleFieldId":"title"},{"id":"v-time","name":"Лента","kind":"timeline","dateFieldId":"starts","coverFieldId":"cover","titleFieldId":"title"},{"id":"v-cards","name":"Карточки","kind":"cards","cardLayout":"grid","groupFieldId":"kind","coverFieldId":"cover","titleFieldId":"title"}]}'::jsonb,
  '{"showcase":{"featured":true,"topic":"views"}}'::jsonb,
  'public',
  'friends'
),
(
  'b11e0000-0000-4000-8000-000000000064',
  'a11e0000-0000-4000-8000-000000000004',
  'Любимые места',
  'Галерея мест с оценками всей компании — кафе, парки, музеи.',
  '📍',
  'blank',
  '{"fields":[{"id":"title","key":"title","name":"Место","type":"text","required":true,"config":{"maxLength":200}},{"id":"city","key":"city","name":"Город","type":"text","config":{"maxLength":80}},{"id":"kind","key":"kind","name":"Тип","type":"select","config":{"options":[{"value":"cafe","label":"Кафе"},{"value":"park","label":"Парк"},{"value":"museum","label":"Музей"},{"value":"bar","label":"Бар"},{"value":"walk","label":"Прогулка"}]}},{"id":"cover","key":"cover","name":"Фото","type":"image","config":{"maxSizeMb":2}},{"id":"visited_at","key":"visited_at","name":"Были","type":"date"},{"id":"ratings","key":"ratings","name":"Оценки","type":"multi_rating","config":{"ratingMax":10,"min":1,"max":10}},{"id":"note","key":"note","name":"Заметка","type":"textarea","config":{"maxLength":800}}],"titleFieldId":"title","imageFieldId":"cover","dateFieldId":"visited_at","groupFieldId":"kind"}'::jsonb,
  '{"mode":"gallery","allowedKinds":["cards","board","table"],"activeViewId":"v-media","imageFieldId":"cover","views":[{"id":"v-media","name":"Галерея","kind":"cards","cardLayout":"media","coverFieldId":"cover","titleFieldId":"title"},{"id":"v-board","name":"По типу","kind":"board","groupFieldId":"kind","titleFieldId":"title"},{"id":"v-table","name":"Таблица","kind":"table","titleFieldId":"title"}]}'::jsonb,
  '{"showcase":{"featured":true,"topic":"ratings"}}'::jsonb,
  'public',
  'friends'
),
(
  'b11e0000-0000-4000-8000-000000000065',
  'a11e0000-0000-4000-8000-000000000002',
  'Расходы сентября',
  'Инфографика семейного бюджета: круговая, столбцы, KPI и линия.',
  '💸',
  'blank',
  '{"fields":[{"id":"name","key":"name","name":"Статья","type":"text","required":true,"config":{"maxLength":160}},{"id":"amount","key":"amount","name":"Сумма","type":"number","config":{"min":0}},{"id":"category","key":"category","name":"Категория","type":"select","config":{"options":[{"value":"food","label":"Еда"},{"value":"home","label":"Жильё"},{"value":"transport","label":"Транспорт"},{"value":"fun","label":"Досуг"},{"value":"health","label":"Здоровье"}]}},{"id":"paid_at","key":"paid_at","name":"Дата","type":"date"},{"id":"who","key":"who","name":"Кто","type":"select","config":{"options":[{"value":"kirill","label":"Кирилл"},{"value":"anna","label":"Анна"},{"value":"shared","label":"На всех"}]}}],"titleFieldId":"name","dateFieldId":"paid_at","groupFieldId":"category"}'::jsonb,
  '{"mode":"table","allowedKinds":["table","board","timeline"],"activeViewId":"v-table","dateFieldId":"paid_at","views":[{"id":"v-table","name":"Таблица","kind":"table","dateFieldId":"paid_at","titleFieldId":"name"},{"id":"v-board","name":"Категории","kind":"board","groupFieldId":"category","titleFieldId":"name"},{"id":"v-time","name":"Лента","kind":"timeline","dateFieldId":"paid_at","titleFieldId":"name"}]}'::jsonb,
  '{"showcase":{"featured":true,"topic":"charts"}}'::jsonb,
  'public',
  'selected'
),
(
  'b11e0000-0000-4000-8000-000000000066',
  'a11e0000-0000-4000-8000-000000000003',
  'Тренировки',
  'Лента и календарь тренировок, минуты и самочувствие на графиках.',
  '🏃',
  'blank',
  '{"fields":[{"id":"title","key":"title","name":"Тренировка","type":"text","required":true,"config":{"maxLength":160}},{"id":"kind","key":"kind","name":"Тип","type":"select","config":{"options":[{"value":"run","label":"Бег"},{"value":"strength","label":"Силовая"},{"value":"yoga","label":"Йога"},{"value":"walk","label":"Ходьба"}]}},{"id":"minutes","key":"minutes","name":"Минуты","type":"integer","config":{"min":5,"max":300}},{"id":"done_at","key":"done_at","name":"Дата","type":"date"},{"id":"feel","key":"feel","name":"Самочувствие","type":"rating","config":{"ratingMax":10,"min":1,"max":10}}],"titleFieldId":"title","dateFieldId":"done_at","groupFieldId":"kind"}'::jsonb,
  '{"mode":"timeline","allowedKinds":["timeline","calendar","table"],"activeViewId":"v-time","dateFieldId":"done_at","views":[{"id":"v-time","name":"Лента","kind":"timeline","dateFieldId":"done_at","titleFieldId":"title"},{"id":"v-cal","name":"Календарь","kind":"calendar","dateFieldId":"done_at","titleFieldId":"title"},{"id":"v-table","name":"Таблица","kind":"table","titleFieldId":"title"}]}'::jsonb,
  '{"showcase":{"featured":true,"topic":"charts"}}'::jsonb,
  'public',
  'owner'
),
(
  'b11e0000-0000-4000-8000-000000000067',
  '6c1d42f0-3128-4ea9-bbeb-161f6cd98ba0',
  'Релиз Chroniqe',
  'Совместный чеклист запуска: выбранные редакторы правят, остальные предлагают.',
  '🚀',
  'todo',
  '{"fields":[{"id":"title","key":"title","name":"Задача","type":"text","required":true,"config":{"maxLength":200}},{"id":"due","key":"due","name":"Срок","type":"date"},{"id":"priority","key":"priority","name":"Приоритет","type":"select","config":{"options":[{"value":"high","label":"Высокий","color":"#be123c"},{"value":"mid","label":"Средний","color":"#b45309"},{"value":"low","label":"Низкий","color":"#0f766e"}]}},{"id":"done_at","key":"done_at","name":"Выполнено","type":"date","hidden":true},{"id":"notes","key":"notes","name":"Заметки","type":"textarea","config":{"maxLength":1000}}],"titleFieldId":"title","dateFieldId":"due","groupFieldId":"priority"}'::jsonb,
  '{"mode":"compact","allowedKinds":["cards","board","calendar"],"activeViewId":"v-compact","groupFieldId":"priority","views":[{"id":"v-compact","name":"Чеклист","kind":"cards","cardLayout":"compact","groupFieldId":"priority","titleFieldId":"title"},{"id":"v-board","name":"Приоритет","kind":"board","groupFieldId":"priority","titleFieldId":"title"},{"id":"v-cal","name":"Сроки","kind":"calendar","dateFieldId":"due","titleFieldId":"title"}]}'::jsonb,
  '{"showcase":{"featured":true,"topic":"collab"},"enableCheck":true,"checkLabel":"Готово","onCheck":[{"type":"set_now","fieldId":"done_at"}]}'::jsonb,
  'public',
  'selected'
),
(
  'b11e0000-0000-4000-8000-000000000068',
  'a11e0000-0000-4000-8000-000000000001',
  'Ужины клуба',
  'Кто готовит, когда встречаемся, оценки вечера. Правят друзья.',
  '🍽️',
  'blank',
  '{"fields":[{"id":"title","key":"title","name":"Ужин","type":"text","required":true,"config":{"maxLength":200}},{"id":"host","key":"host","name":"Кто зовёт","type":"select","config":{"options":[{"value":"anna","label":"Анна"},{"value":"kirill","label":"Кирилл"},{"value":"lena","label":"Лена"},{"value":"oleg","label":"Олег"}]}},{"id":"when","key":"when","name":"Когда","type":"date"},{"id":"dish","key":"dish","name":"Блюдо","type":"text","config":{"maxLength":160}},{"id":"status","key":"status","name":"Статус","type":"select","config":{"options":[{"value":"idea","label":"Идея"},{"value":"planned","label":"Запланирован"},{"value":"done","label":"Состоялся"}]}},{"id":"ratings","key":"ratings","name":"Оценки","type":"multi_rating","config":{"ratingMax":10}},{"id":"note","key":"note","name":"Заметка","type":"textarea","config":{"maxLength":600}}],"titleFieldId":"title","dateFieldId":"when","groupFieldId":"status"}'::jsonb,
  '{"mode":"cards","allowedKinds":["cards","calendar","board"],"activeViewId":"v-cards","groupFieldId":"status","views":[{"id":"v-cards","name":"Карточки","kind":"cards","cardLayout":"grid","groupFieldId":"status","titleFieldId":"title"},{"id":"v-cal","name":"Календарь","kind":"calendar","dateFieldId":"when","titleFieldId":"title"},{"id":"v-board","name":"Статус","kind":"board","groupFieldId":"status","titleFieldId":"title"}]}'::jsonb,
  '{"showcase":{"featured":true,"topic":"collab"}}'::jsonb,
  'public',
  'friends'
),
(
  'b11e0000-0000-4000-8000-000000000069',
  'a11e0000-0000-4000-8000-000000000004',
  'Подкасты',
  'Очередь выпусков с оценками и статусами на доске.',
  '🎧',
  'blank',
  '{"fields":[{"id":"title","key":"title","name":"Выпуск","type":"text","required":true,"config":{"maxLength":200}},{"id":"show","key":"show","name":"Подкаст","type":"text","config":{"maxLength":120}},{"id":"status","key":"status","name":"Статус","type":"select","config":{"options":[{"value":"queue","label":"В очереди"},{"value":"listening","label":"Слушаю"},{"value":"done","label":"Прослушан"}]}},{"id":"mins","key":"mins","name":"Минуты","type":"integer","config":{"min":1,"max":400}},{"id":"finished_at","key":"finished_at","name":"Когда","type":"date"},{"id":"ratings","key":"ratings","name":"Оценки","type":"multi_rating","config":{"ratingMax":10}}],"titleFieldId":"title","dateFieldId":"finished_at","groupFieldId":"status"}'::jsonb,
  '{"mode":"table","allowedKinds":["table","board"],"activeViewId":"v-table","views":[{"id":"v-table","name":"Таблица","kind":"table","titleFieldId":"title"},{"id":"v-board","name":"Статус","kind":"board","groupFieldId":"status","titleFieldId":"title"}]}'::jsonb,
  '{"showcase":{"featured":true,"topic":"ratings"}}'::jsonb,
  'public',
  'owner'
),
(
  'b11e0000-0000-4000-8000-000000000070',
  'a11e0000-0000-4000-8000-000000000003',
  'События осени',
  'Концерты, кино и встречи в календарном виде.',
  '🎫',
  'blank',
  '{"fields":[{"id":"title","key":"title","name":"Событие","type":"text","required":true,"config":{"maxLength":200}},{"id":"venue","key":"venue","name":"Место","type":"text","config":{"maxLength":120}},{"id":"starts","key":"starts","name":"Дата","type":"date"},{"id":"kind","key":"kind","name":"Тип","type":"select","config":{"options":[{"value":"concert","label":"Концерт"},{"value":"cinema","label":"Кино"},{"value":"sport","label":"Спорт"},{"value":"meetup","label":"Встреча"}]}},{"id":"price","key":"price","name":"Цена","type":"number","config":{"min":0}},{"id":"note","key":"note","name":"Заметка","type":"textarea","config":{"maxLength":400}}],"titleFieldId":"title","dateFieldId":"starts","groupFieldId":"kind"}'::jsonb,
  '{"mode":"timeline","allowedKinds":["calendar","timeline","board"],"activeViewId":"v-cal","dateFieldId":"starts","views":[{"id":"v-cal","name":"Календарь","kind":"calendar","dateFieldId":"starts","titleFieldId":"title"},{"id":"v-time","name":"Лента","kind":"timeline","dateFieldId":"starts","titleFieldId":"title"},{"id":"v-board","name":"Тип","kind":"board","groupFieldId":"kind","titleFieldId":"title"}]}'::jsonb,
  '{"showcase":{"featured":true,"topic":"views"}}'::jsonb,
  'public',
  'friends'
)
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

-- === CHUNK items_prepare ===
alter table public.items disable trigger items_activity;
delete from public.list_charts
where list_id in ('b11e0000-0000-4000-8000-000000000011', 'b11e0000-0000-4000-8000-000000000012', 'b11e0000-0000-4000-8000-000000000013', 'b11e0000-0000-4000-8000-000000000021', 'b11e0000-0000-4000-8000-000000000022', 'b11e0000-0000-4000-8000-000000000023', 'b11e0000-0000-4000-8000-000000000031', 'b11e0000-0000-4000-8000-000000000032', 'b11e0000-0000-4000-8000-000000000033', 'b11e0000-0000-4000-8000-000000000041', 'b11e0000-0000-4000-8000-000000000042', 'b11e0000-0000-4000-8000-000000000043', 'b11e0000-0000-4000-8000-000000000051', 'b11e0000-0000-4000-8000-000000000061', 'b11e0000-0000-4000-8000-000000000062', 'b11e0000-0000-4000-8000-000000000063', 'b11e0000-0000-4000-8000-000000000064', 'b11e0000-0000-4000-8000-000000000065', 'b11e0000-0000-4000-8000-000000000066', 'b11e0000-0000-4000-8000-000000000067', 'b11e0000-0000-4000-8000-000000000068', 'b11e0000-0000-4000-8000-000000000069', 'b11e0000-0000-4000-8000-000000000070')
  and id::text not like 'd11e0000-0000-4000-8000-%';

-- === CHUNK items_1 ===
insert into public.items (id, list_id, values, position, is_checked, checked_at, created_by, updated_by)
values
('c11e0000-0000-4000-8000-000000000101', 'b11e0000-0000-4000-8000-000000000011', '{"kind":"movie","note":"Досмотреть на большом экране","year":2024,"title":"Дюна: Часть вторая","priority":"now","poster":"https://picsum.photos/seed/dune2/400/600"}'::jsonb, 1, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000102', 'b11e0000-0000-4000-8000-000000000011', '{"kind":"series","note":"2 сезон, когда выйдет","year":2024,"title":"Шогун","priority":"soon","poster":"https://picsum.photos/seed/shogun/400/600"}'::jsonb, 2, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000103', 'b11e0000-0000-4000-8000-000000000011', '{"kind":"anime","year":1997,"title":"Perfect Blue","priority":"someday","poster":"https://picsum.photos/seed/perfectblue/400/600"}'::jsonb, 3, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000104', 'b11e0000-0000-4000-8000-000000000011', '{"kind":"movie","year":2023,"title":"Зона интересов","priority":"now","note":"Предложил Кирилл","poster":"https://picsum.photos/seed/zone/400/600"}'::jsonb, 4, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000105', 'b11e0000-0000-4000-8000-000000000011', '{"kind":"series","year":2023,"title":"The Bear","priority":"soon","poster":"https://picsum.photos/seed/thebear/400/600"}'::jsonb, 5, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000106', 'b11e0000-0000-4000-8000-000000000011', '{"kind":"doc","year":2022,"title":"Fire of Love","priority":"someday","poster":"https://picsum.photos/seed/fireoflove/400/600"}'::jsonb, 6, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000107', 'b11e0000-0000-4000-8000-000000000011', '{"kind":"anime","year":2016,"title":"Твоё имя","priority":"soon","poster":"https://picsum.photos/seed/yourname/400/600"}'::jsonb, 7, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000108', 'b11e0000-0000-4000-8000-000000000011', '{"kind":"movie","year":2019,"title":"Паразиты","priority":"now","poster":"https://picsum.photos/seed/parasite/400/600"}'::jsonb, 8, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000109', 'b11e0000-0000-4000-8000-000000000011', '{"kind":"series","year":2024,"title":"Fallout","priority":"someday","poster":"https://picsum.photos/seed/fallout/400/600"}'::jsonb, 9, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000111', 'b11e0000-0000-4000-8000-000000000012', '{"kind":"movie","year":2023,"title":"Оппенгеймер","review":"Долго, но держит","watched_at":"2024-11-02","poster":"https://picsum.photos/seed/oppenheimer/400/600"}'::jsonb, 1, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000112', 'b11e0000-0000-4000-8000-000000000012', '{"kind":"series","year":2021,"title":"Игра в кальмара","review":"Первый сезон лучше","watched_at":"2025-01-18","poster":"https://picsum.photos/seed/squid/400/600","seasons":[{"season":1,"episodes":9,"finished_at":"2025-01-12","score":8},{"season":2,"episodes":7,"finished_at":"2025-01-18","score":6}]}'::jsonb, 2, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000113', 'b11e0000-0000-4000-8000-000000000012', '{"kind":"anime","year":2001,"title":"Унесённые призраками","watched_at":"2024-06-12","poster":"https://picsum.photos/seed/spirited/400/600"}'::jsonb, 3, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000114', 'b11e0000-0000-4000-8000-000000000012', '{"kind":"movie","year":2009,"title":"Бесславные ублюдки","watched_at":"2025-03-04","poster":"https://picsum.photos/seed/inglourious/400/600"}'::jsonb, 4, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000115', 'b11e0000-0000-4000-8000-000000000012', '{"kind":"movie","year":2014,"title":"Интерстеллар","review":"Пересматриваем раз в год","watched_at":"2025-08-14","poster":"https://picsum.photos/seed/interstellar/400/600"}'::jsonb, 5, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000116', 'b11e0000-0000-4000-8000-000000000012', '{"kind":"series","year":2018,"title":"Чёрное зеркало","watched_at":"2025-04-22","poster":"https://picsum.photos/seed/blackmirror/400/600","seasons":[{"season":4,"episodes":6,"finished_at":"2025-04-22","score":7}]}'::jsonb, 6, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000117', 'b11e0000-0000-4000-8000-000000000012', '{"kind":"doc","year":2020,"title":"Мой учитель — осьминог","watched_at":"2024-09-30","poster":"https://picsum.photos/seed/octopus/400/600"}'::jsonb, 7, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000118', 'b11e0000-0000-4000-8000-000000000012', '{"kind":"movie","year":2022,"title":"Всё везде и сразу","review":"Хаос, но тёплый","watched_at":"2025-06-01","poster":"https://picsum.photos/seed/eeaao/400/600"}'::jsonb, 8, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000119', 'b11e0000-0000-4000-8000-000000000012', '{"kind":"anime","year":2019,"title":"Дитя погоды","watched_at":"2025-07-19","poster":"https://picsum.photos/seed/weathering/400/600"}'::jsonb, 9, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000120', 'b11e0000-0000-4000-8000-000000000012', '{"kind":"movie","year":1972,"title":"Крёстный отец","watched_at":"2024-12-28","poster":"https://picsum.photos/seed/godfather/400/600"}'::jsonb, 10, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000125', 'b11e0000-0000-4000-8000-000000000012', '{"kind":"series","year":2011,"title":"Игра престолов","review":"Остановились на 6 сезоне","watched_at":"2025-02-08","poster":"https://picsum.photos/seed/got/400/600"}'::jsonb, 11, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000126', 'b11e0000-0000-4000-8000-000000000012', '{"kind":"movie","year":2023,"title":"Бедные-несчастные","watched_at":"2025-05-11","poster":"https://picsum.photos/seed/poorthings/400/600"}'::jsonb, 12, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000121', 'b11e0000-0000-4000-8000-000000000013', '{"kind":"series","year":2019,"title":"Эйфория","reason":"Слишком тяжело по тону","decided_at":"2025-02-01"}'::jsonb, 1, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000122', 'b11e0000-0000-4000-8000-000000000013', '{"kind":"series","year":2022,"title":"Дом дракона","reason":"Не зашёл темп","decided_at":"2025-03-12"}'::jsonb, 2, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000123', 'b11e0000-0000-4000-8000-000000000013', '{"kind":"movie","year":2023,"title":"Мегалополис","reason":"Не тянет на вечер","decided_at":"2025-09-01"}'::jsonb, 3, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000201', 'b11e0000-0000-4000-8000-000000000021', '{"qty":2,"name":"Молоко","category":"food"}'::jsonb, 1, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000202', 'b11e0000-0000-4000-8000-000000000021', '{"qty":1,"name":"Хлеб","category":"food"}'::jsonb, 2, true, '2026-09-04T10:00:00Z', 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000203', 'b11e0000-0000-4000-8000-000000000021', '{"qty":4,"name":"Лампочки E27","note":"тёплый свет","category":"home"}'::jsonb, 3, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000204', 'b11e0000-0000-4000-8000-000000000021', '{"qty":1,"name":"Кабель USB-C","category":"tech"}'::jsonb, 4, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000205', 'b11e0000-0000-4000-8000-000000000021', '{"qty":1,"name":"Яйца С0","category":"food","note":"на завтрак"}'::jsonb, 5, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000206', 'b11e0000-0000-4000-8000-000000000021', '{"qty":2,"name":"Рис басмати","category":"food"}'::jsonb, 6, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000207', 'b11e0000-0000-4000-8000-000000000021', '{"qty":1,"name":"Гель для душа","category":"home"}'::jsonb, 7, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000208', 'b11e0000-0000-4000-8000-000000000021', '{"qty":1,"name":"Батарейки AAA","category":"tech"}'::jsonb, 8, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000209', 'b11e0000-0000-4000-8000-000000000021', '{"qty":3,"name":"Йогурт греческий","category":"food"}'::jsonb, 9, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000210', 'b11e0000-0000-4000-8000-000000000021', '{"qty":1,"name":"Скотч малярный","category":"home"}'::jsonb, 10, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000211', 'b11e0000-0000-4000-8000-000000000022', '{"qty":1,"name":"Кофе зерно","price":890,"category":"food","bought_at":"2026-09-01"}'::jsonb, 1, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000212', 'b11e0000-0000-4000-8000-000000000022', '{"qty":2,"name":"Моющие салфетки","price":240,"category":"home","bought_at":"2026-09-03"}'::jsonb, 2, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000213', 'b11e0000-0000-4000-8000-000000000022', '{"qty":1,"name":"Оливковое масло","price":620,"category":"food","bought_at":"2026-09-03"}'::jsonb, 3, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000214', 'b11e0000-0000-4000-8000-000000000022', '{"qty":1,"name":"Мыло хозяйственное","price":90,"category":"home","bought_at":"2026-09-04"}'::jsonb, 4, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000215', 'b11e0000-0000-4000-8000-000000000022', '{"qty":1,"name":"Наушники-вкладыши","price":1490,"category":"tech","bought_at":"2026-09-05"}'::jsonb, 5, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000216', 'b11e0000-0000-4000-8000-000000000022', '{"qty":6,"name":"Яблоки сезонные","price":210,"category":"food","bought_at":"2026-09-05"}'::jsonb, 6, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003')
on conflict (id) do update set
  values = excluded.values,
  position = excluded.position,
  is_checked = excluded.is_checked,
  checked_at = excluded.checked_at,
  updated_by = excluded.updated_by;

-- === CHUNK items_2 ===
insert into public.items (id, list_id, values, position, is_checked, checked_at, created_by, updated_by)
values
('c11e0000-0000-4000-8000-000000000217', 'b11e0000-0000-4000-8000-000000000022', '{"qty":1,"name":"Зубная паста","price":180,"category":"home","bought_at":"2026-08-28"}'::jsonb, 7, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000218', 'b11e0000-0000-4000-8000-000000000022', '{"qty":1,"name":"SSD 1 ТБ","price":7990,"category":"tech","bought_at":"2026-08-20"}'::jsonb, 8, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000219', 'b11e0000-0000-4000-8000-000000000022', '{"qty":2,"name":"Билеты в кино","price":900,"category":"other","bought_at":"2026-08-30"}'::jsonb, 9, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000220', 'b11e0000-0000-4000-8000-000000000022', '{"qty":1,"name":"Дождевик","price":650,"category":"other","bought_at":"2026-09-02"}'::jsonb, 10, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000221', 'b11e0000-0000-4000-8000-000000000023', '{"qty":1,"name":"Гирлянда","note":"тёплая, 10 м","when":"к Новому году"}'::jsonb, 1, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000222', 'b11e0000-0000-4000-8000-000000000023', '{"qty":1,"name":"Форма для кекса","when":"к дню рождения","note":"разъёмная 24 см"}'::jsonb, 2, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000223', 'b11e0000-0000-4000-8000-000000000023', '{"qty":2,"name":"Плед","when":"к даче"}'::jsonb, 3, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000301', 'b11e0000-0000-4000-8000-000000000031', '{"note":"Залипла надолго","hours":40,"title":"Hades","status":"hundred","platform":"switch","finished_at":"2024-02-11","cover":"https://picsum.photos/seed/hades/400/600"}'::jsonb, 1, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000302', 'b11e0000-0000-4000-8000-000000000031', '{"hours":92,"title":"Baldur''s Gate 3","status":"completed","platform":"pc","finished_at":"2025-05-20","cover":"https://picsum.photos/seed/bg3/400/600"}'::jsonb, 2, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000303', 'b11e0000-0000-4000-8000-000000000031', '{"hours":12,"title":"Celeste","status":"main","platform":"switch","finished_at":"2023-11-03","cover":"https://picsum.photos/seed/celeste/400/600"}'::jsonb, 3, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000304', 'b11e0000-0000-4000-8000-000000000031', '{"hours":28,"title":"Hades II","status":"main","platform":"pc","finished_at":"2026-03-02","cover":"https://picsum.photos/seed/hades2/400/600","note":"Ещё не всё открыто"}'::jsonb, 4, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000305', 'b11e0000-0000-4000-8000-000000000031', '{"hours":55,"title":"Elden Ring","status":"completed","platform":"ps","finished_at":"2024-08-17","cover":"https://picsum.photos/seed/elden/400/600"}'::jsonb, 5, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000306', 'b11e0000-0000-4000-8000-000000000031', '{"hours":18,"title":"Stardew Valley","status":"hundred","platform":"switch","finished_at":"2025-01-09","cover":"https://picsum.photos/seed/stardew/400/600"}'::jsonb, 6, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000307', 'b11e0000-0000-4000-8000-000000000031', '{"hours":8,"title":"Unpacking","status":"completed","platform":"xbox","finished_at":"2024-12-02","cover":"https://picsum.photos/seed/unpacking/400/600"}'::jsonb, 7, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000308', 'b11e0000-0000-4000-8000-000000000031', '{"hours":22,"title":"Outer Wilds","status":"completed","platform":"pc","finished_at":"2025-09-14","cover":"https://picsum.photos/seed/outerwilds/400/600"}'::jsonb, 8, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000309', 'b11e0000-0000-4000-8000-000000000031', '{"hours":6,"title":"Vampire Survivors","status":"dropped","platform":"mobile","finished_at":"2026-01-20","cover":"https://picsum.photos/seed/vampires/400/600"}'::jsonb, 9, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000310', 'b11e0000-0000-4000-8000-000000000031', '{"hours":35,"title":"The Witcher 3","status":"main","platform":"ps","finished_at":"2023-06-21","cover":"https://picsum.photos/seed/witcher3/400/600"}'::jsonb, 10, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000311', 'b11e0000-0000-4000-8000-000000000032', '{"title":"Мастер и Маргарита","author":"Булгаков","status":"done","finished_at":"2024-06-01","cover":"https://picsum.photos/seed/master/400/600"}'::jsonb, 1, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000312', 'b11e0000-0000-4000-8000-000000000032', '{"title":"Проект «Аве Мария»","author":"Энди Вейер","status":"reading","cover":"https://picsum.photos/seed/hailmary/400/600"}'::jsonb, 2, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000313', 'b11e0000-0000-4000-8000-000000000032', '{"title":"Дюна","author":"Фрэнк Герберт","status":"want","cover":"https://picsum.photos/seed/dunebook/400/600"}'::jsonb, 3, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000314', 'b11e0000-0000-4000-8000-000000000032', '{"title":"1984","author":"Оруэлл","status":"done","finished_at":"2025-02-14","cover":"https://picsum.photos/seed/orwell/400/600"}'::jsonb, 4, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000315', 'b11e0000-0000-4000-8000-000000000032', '{"title":"Трудно быть богом","author":"Стругацкие","status":"done","finished_at":"2025-11-03","cover":"https://picsum.photos/seed/hardgod/400/600"}'::jsonb, 5, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000316', 'b11e0000-0000-4000-8000-000000000032', '{"title":"Нормальные люди","author":"Салли Руни","status":"reading","cover":"https://picsum.photos/seed/normalpeople/400/600"}'::jsonb, 6, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000317', 'b11e0000-0000-4000-8000-000000000032', '{"title":"Сияние","author":"Стивен Кинг","status":"want","cover":"https://picsum.photos/seed/shining/400/600"}'::jsonb, 7, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000318', 'b11e0000-0000-4000-8000-000000000032', '{"title":"Пикник на обочине","author":"Стругацкие","status":"done","finished_at":"2024-10-19","cover":"https://picsum.photos/seed/picnic/400/600"}'::jsonb, 8, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000319', 'b11e0000-0000-4000-8000-000000000032', '{"title":"Кладбище домашних животных","author":"Стивен Кинг","status":"dropped","note":"Не вечером","cover":"https://picsum.photos/seed/petcemetery/400/600"}'::jsonb, 9, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000320', 'b11e0000-0000-4000-8000-000000000032', '{"title":"Ход королевы","author":"Уолтер Тевис","status":"want","cover":"https://picsum.photos/seed/gambit/400/600"}'::jsonb, 10, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000321', 'b11e0000-0000-4000-8000-000000000033', '{"due":"2026-09-08","title":"Оплатить интернет","priority":"high"}'::jsonb, 1, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000322', 'b11e0000-0000-4000-8000-000000000033', '{"due":"2026-09-12","title":"Собрать аптечку","priority":"mid"}'::jsonb, 2, true, now(), 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000323', 'b11e0000-0000-4000-8000-000000000033', '{"due":"2026-09-06","title":"Забрать посылку","priority":"high"}'::jsonb, 3, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000324', 'b11e0000-0000-4000-8000-000000000033', '{"due":"2026-09-10","title":"Написать Лене по работе","priority":"mid"}'::jsonb, 4, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000401', 'b11e0000-0000-4000-8000-000000000041', '{"due":"2026-09-06","title":"Заказать фильтр для воды","priority":"high"}'::jsonb, 1, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000402', 'b11e0000-0000-4000-8000-000000000041', '{"due":"2026-09-20","title":"Разобрать ящик с проводами","priority":"low"}'::jsonb, 2, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000403', 'b11e0000-0000-4000-8000-000000000041', '{"due":"2026-09-07","title":"Позвонить в УК","priority":"high","notes":"Счёт за август"}'::jsonb, 3, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000404', 'b11e0000-0000-4000-8000-000000000041', '{"due":"2026-09-09","title":"Купить грунт для фикуса","priority":"mid"}'::jsonb, 4, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000405', 'b11e0000-0000-4000-8000-000000000041', '{"due":"2026-09-04","title":"Отдать куртку в химчистку","priority":"mid"}'::jsonb, 5, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000406', 'b11e0000-0000-4000-8000-000000000041', '{"due":"2026-09-15","title":"Записаться к стоматологу","priority":"high"}'::jsonb, 6, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000407', 'b11e0000-0000-4000-8000-000000000041', '{"due":"2026-09-18","title":"Протереть окна","priority":"low"}'::jsonb, 7, true, now(), 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000408', 'b11e0000-0000-4000-8000-000000000041', '{"due":"2026-09-22","title":"Обновить резюме","priority":"low"}'::jsonb, 8, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000409', 'b11e0000-0000-4000-8000-000000000041', '{"due":"2026-09-11","title":"Отвезти велосипед","priority":"mid"}'::jsonb, 9, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004')
on conflict (id) do update set
  values = excluded.values,
  position = excluded.position,
  is_checked = excluded.is_checked,
  checked_at = excluded.checked_at,
  updated_by = excluded.updated_by;

-- === CHUNK items_3 ===
insert into public.items (id, list_id, values, position, is_checked, checked_at, created_by, updated_by)
values
('c11e0000-0000-4000-8000-000000000410', 'b11e0000-0000-4000-8000-000000000041', '{"due":"2026-09-25","title":"Купить билеты на выставку","priority":"low"}'::jsonb, 10, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000411', 'b11e0000-0000-4000-8000-000000000042', '{"tag":"soup","time":90,"title":"Борщ","servings":6,"photo":"https://picsum.photos/seed/borscht/400/600"}'::jsonb, 1, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000412', 'b11e0000-0000-4000-8000-000000000042', '{"tag":"main","time":25,"title":"Паста карбонара","servings":2,"photo":"https://picsum.photos/seed/carbonara/400/600"}'::jsonb, 2, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000413', 'b11e0000-0000-4000-8000-000000000042', '{"tag":"dessert","time":40,"title":"Тирамису","servings":8,"photo":"https://picsum.photos/seed/tiramisu/400/600"}'::jsonb, 3, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000414', 'b11e0000-0000-4000-8000-000000000042', '{"tag":"main","time":45,"title":"Плов","servings":4,"photo":"https://picsum.photos/seed/plov/400/600"}'::jsonb, 4, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000415', 'b11e0000-0000-4000-8000-000000000042', '{"tag":"soup","time":35,"title":"Тыквенный крем-суп","servings":4,"photo":"https://picsum.photos/seed/pumpkin/400/600"}'::jsonb, 5, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000416', 'b11e0000-0000-4000-8000-000000000042', '{"tag":"bake","time":70,"title":"Яблочный пирог","servings":8,"photo":"https://picsum.photos/seed/applepie/400/600"}'::jsonb, 6, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000417', 'b11e0000-0000-4000-8000-000000000042', '{"tag":"dessert","time":20,"title":"Панакота","servings":4,"photo":"https://picsum.photos/seed/panna/400/600"}'::jsonb, 7, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000418', 'b11e0000-0000-4000-8000-000000000042', '{"tag":"main","time":30,"title":"Лосось в духовке","servings":2,"photo":"https://picsum.photos/seed/salmon/400/600"}'::jsonb, 8, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000419', 'b11e0000-0000-4000-8000-000000000042', '{"tag":"bake","time":50,"title":"Фокачча","servings":6,"photo":"https://picsum.photos/seed/focaccia/400/600"}'::jsonb, 9, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000420', 'b11e0000-0000-4000-8000-000000000042', '{"tag":"soup","time":25,"title":"Мисо","servings":2,"photo":"https://picsum.photos/seed/miso/400/600"}'::jsonb, 10, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000421', 'b11e0000-0000-4000-8000-000000000043', '{"cond":"vg","year":1959,"title":"Kind of Blue","artist":"Miles Davis","cover":"https://picsum.photos/seed/kindofblue/400/600"}'::jsonb, 1, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000422', 'b11e0000-0000-4000-8000-000000000043', '{"cond":"mint","year":1973,"title":"The Dark Side of the Moon","artist":"Pink Floyd","cover":"https://picsum.photos/seed/dsotm/400/600"}'::jsonb, 2, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000423', 'b11e0000-0000-4000-8000-000000000043', '{"cond":"mint","year":1971,"title":"What''s Going On","artist":"Marvin Gaye","cover":"https://picsum.photos/seed/wgo/400/600"}'::jsonb, 3, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000424', 'b11e0000-0000-4000-8000-000000000043', '{"cond":"vg","year":1967,"title":"Sgt. Pepper","artist":"The Beatles","cover":"https://picsum.photos/seed/pepper/400/600"}'::jsonb, 4, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000425', 'b11e0000-0000-4000-8000-000000000043', '{"cond":"g","year":1975,"title":"Wish You Were Here","artist":"Pink Floyd","cover":"https://picsum.photos/seed/wywh/400/600"}'::jsonb, 5, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000426', 'b11e0000-0000-4000-8000-000000000043', '{"cond":"mint","year":2015,"title":"To Pimp a Butterfly","artist":"Kendrick Lamar","cover":"https://picsum.photos/seed/tpab/400/600"}'::jsonb, 6, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000427', 'b11e0000-0000-4000-8000-000000000043', '{"cond":"vg","year":1986,"title":"Graceland","artist":"Paul Simon","cover":"https://picsum.photos/seed/graceland/400/600"}'::jsonb, 7, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000428', 'b11e0000-0000-4000-8000-000000000043', '{"cond":"mint","year":1997,"title":"Homogenic","artist":"Björk","cover":"https://picsum.photos/seed/homogenic/400/600"}'::jsonb, 8, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000429', 'b11e0000-0000-4000-8000-000000000043', '{"cond":"vg","year":1977,"title":"Rumours","artist":"Fleetwood Mac","cover":"https://picsum.photos/seed/rumours/400/600"}'::jsonb, 9, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000430', 'b11e0000-0000-4000-8000-000000000043', '{"cond":"g","year":1969,"title":"Abbey Road","artist":"The Beatles","cover":"https://picsum.photos/seed/abbey/400/600"}'::jsonb, 10, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000501', 'b11e0000-0000-4000-8000-000000000051', '{"notes":"Сейчас схема остаётся на языке создания","title":"Шаблоны полей на выбранном языке","priority":"high"}'::jsonb, 1, false, null, '6c1d42f0-3128-4ea9-bbeb-161f6cd98ba0', '6c1d42f0-3128-4ea9-bbeb-161f6cd98ba0'),
('c11e0000-0000-4000-8000-000000000502', 'b11e0000-0000-4000-8000-000000000051', '{"title":"Приглашения по ссылке без аккаунта","priority":"mid"}'::jsonb, 2, false, null, '6c1d42f0-3128-4ea9-bbeb-161f6cd98ba0', '6c1d42f0-3128-4ea9-bbeb-161f6cd98ba0'),
('c11e0000-0000-4000-8000-000000000503', 'b11e0000-0000-4000-8000-000000000051', '{"title":"Экспорт PDF","priority":"low"}'::jsonb, 3, false, null, '6c1d42f0-3128-4ea9-bbeb-161f6cd98ba0', '6c1d42f0-3128-4ea9-bbeb-161f6cd98ba0'),
('c11e0000-0000-4000-8000-000000000504', 'b11e0000-0000-4000-8000-000000000051', '{"title":"Офлайн-черновик записи","priority":"mid","notes":"Если сеть пропала"}'::jsonb, 4, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000505', 'b11e0000-0000-4000-8000-000000000051', '{"title":"Вид «карта» для мест","priority":"low"}'::jsonb, 5, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000506', 'b11e0000-0000-4000-8000-000000000051', '{"title":"Пакетный импорт из Letterboxd","priority":"high"}'::jsonb, 6, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000507', 'b11e0000-0000-4000-8000-000000000051', '{"title":"Тёмные обложки списков","priority":"low"}'::jsonb, 7, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000508', 'b11e0000-0000-4000-8000-000000000051', '{"title":"Напоминания о сроке в браузере","priority":"mid"}'::jsonb, 8, false, null, '6c1d42f0-3128-4ea9-bbeb-161f6cd98ba0', '6c1d42f0-3128-4ea9-bbeb-161f6cd98ba0'),
('c11e0000-0000-4000-8000-000000000509', 'b11e0000-0000-4000-8000-000000000051', '{"title":"Общие шаблоны клуба","priority":"high"}'::jsonb, 9, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000601', 'b11e0000-0000-4000-8000-000000000061', '{"title":"Clair Obscur: Expedition 33","platform":"ps","priority":"now","cover":"https://picsum.photos/seed/expedition/400/600","note":"Все хвалят"}'::jsonb, 1, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000602', 'b11e0000-0000-4000-8000-000000000061', '{"title":"Hollow Knight: Silksong","platform":"switch","priority":"now","cover":"https://picsum.photos/seed/silksong/400/600"}'::jsonb, 2, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000603', 'b11e0000-0000-4000-8000-000000000061', '{"title":"Disco Elysium","platform":"pc","priority":"soon","cover":"https://picsum.photos/seed/disco/400/600"}'::jsonb, 3, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000604', 'b11e0000-0000-4000-8000-000000000061', '{"title":"Animal Crossing","platform":"switch","priority":"someday","cover":"https://picsum.photos/seed/acnh/400/600"}'::jsonb, 4, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000605', 'b11e0000-0000-4000-8000-000000000061', '{"title":"Returnal","platform":"ps","priority":"soon","cover":"https://picsum.photos/seed/returnal/400/600"}'::jsonb, 5, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000606', 'b11e0000-0000-4000-8000-000000000061', '{"title":"Slay the Spire 2","platform":"pc","priority":"now","cover":"https://picsum.photos/seed/sts2/400/600"}'::jsonb, 6, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000607', 'b11e0000-0000-4000-8000-000000000061', '{"title":"Death Stranding","platform":"pc","priority":"someday","cover":"https://picsum.photos/seed/ds/400/600"}'::jsonb, 7, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000608', 'b11e0000-0000-4000-8000-000000000061', '{"title":"Balatro","platform":"mobile","priority":"soon","cover":"https://picsum.photos/seed/balatro/400/600"}'::jsonb, 8, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000609', 'b11e0000-0000-4000-8000-000000000061', '{"title":"Sea of Stars","platform":"xbox","priority":"someday","cover":"https://picsum.photos/seed/sos/400/600"}'::jsonb, 9, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000621', 'b11e0000-0000-4000-8000-000000000062', '{"title":"Починить перенос записи","status":"doing","owner":"kirill","points":5,"due":"2026-09-08"}'::jsonb, 1, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002')
on conflict (id) do update set
  values = excluded.values,
  position = excluded.position,
  is_checked = excluded.is_checked,
  checked_at = excluded.checked_at,
  updated_by = excluded.updated_by;

-- === CHUNK items_4 ===
insert into public.items (id, list_id, values, position, is_checked, checked_at, created_by, updated_by)
values
('c11e0000-0000-4000-8000-000000000622', 'b11e0000-0000-4000-8000-000000000062', '{"title":"Календарь: просрочки","status":"review","owner":"anna","points":3,"due":"2026-09-07"}'::jsonb, 2, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000623', 'b11e0000-0000-4000-8000-000000000062', '{"title":"Тексты шаблонов EN","status":"done","owner":"lena","points":2,"due":"2026-09-04"}'::jsonb, 3, true, now(), 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000624', 'b11e0000-0000-4000-8000-000000000062', '{"title":"Онбординг по ссылке","status":"backlog","owner":"oleg","points":8,"due":"2026-09-18"}'::jsonb, 4, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000625', 'b11e0000-0000-4000-8000-000000000062', '{"title":"Фильтры по оценке","status":"doing","owner":"anna","points":3,"due":"2026-09-09"}'::jsonb, 5, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000626', 'b11e0000-0000-4000-8000-000000000062', '{"title":"Экспорт CSV с видами","status":"backlog","owner":"kirill","points":5,"due":"2026-09-20"}'::jsonb, 6, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000627', 'b11e0000-0000-4000-8000-000000000062', '{"title":"Пустые состояния графиков","status":"review","owner":"lena","points":2,"due":"2026-09-06"}'::jsonb, 7, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000628', 'b11e0000-0000-4000-8000-000000000062', '{"title":"Аватар в комментарии","status":"done","owner":"oleg","points":1,"due":"2026-09-03"}'::jsonb, 8, true, now(), 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000629', 'b11e0000-0000-4000-8000-000000000062', '{"title":"Клавиатура на доске","status":"doing","owner":"kirill","points":5,"due":"2026-09-11"}'::jsonb, 9, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000630', 'b11e0000-0000-4000-8000-000000000062', '{"title":"Подсказки шаблонов","status":"backlog","owner":"anna","points":3,"due":"2026-09-22"}'::jsonb, 10, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000631', 'b11e0000-0000-4000-8000-000000000062', '{"title":"Сводка на дашборде","status":"review","owner":"lena","points":8,"due":"2026-09-10"}'::jsonb, 11, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000641', 'b11e0000-0000-4000-8000-000000000063', '{"title":"Выходные в Выборге","place":"Выборг","starts":"2026-09-12","kind":"city","budget":12000,"cover":"https://picsum.photos/seed/vyborg/400/600"}'::jsonb, 1, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000642', 'b11e0000-0000-4000-8000-000000000063', '{"title":"Карелия, палатки","place":"Сортавала","starts":"2026-09-26","kind":"nature","budget":18000,"cover":"https://picsum.photos/seed/karelia/400/600"}'::jsonb, 2, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000643', 'b11e0000-0000-4000-8000-000000000063', '{"title":"К родителям","place":"Тверь","starts":"2026-10-03","kind":"visit","budget":4000,"cover":"https://picsum.photos/seed/tver/400/600"}'::jsonb, 3, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000644', 'b11e0000-0000-4000-8000-000000000063', '{"title":"Конференция","place":"Москва","starts":"2026-10-16","kind":"work","budget":22000,"cover":"https://picsum.photos/seed/msk/400/600"}'::jsonb, 4, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000645', 'b11e0000-0000-4000-8000-000000000063', '{"title":"Золотое кольцо","place":"Суздаль","starts":"2026-11-07","kind":"city","budget":15000,"cover":"https://picsum.photos/seed/suzdal/400/600"}'::jsonb, 5, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000646', 'b11e0000-0000-4000-8000-000000000063', '{"title":"Новый год в лесу","place":"Валдай","starts":"2026-12-31","kind":"nature","budget":28000,"cover":"https://picsum.photos/seed/valday/400/600"}'::jsonb, 6, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000647', 'b11e0000-0000-4000-8000-000000000063', '{"title":"Питер на выходные","place":"Санкт-Петербург","starts":"2026-09-05","kind":"city","budget":9000,"cover":"https://picsum.photos/seed/spb/400/600"}'::jsonb, 7, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000648', 'b11e0000-0000-4000-8000-000000000063', '{"title":"Дача в мае","place":"Клин","starts":"2026-05-02","kind":"visit","budget":6000,"cover":"https://picsum.photos/seed/dacha/400/600"}'::jsonb, 8, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000661', 'b11e0000-0000-4000-8000-000000000064', '{"title":"Кофейня на углу","city":"Москва","kind":"cafe","visited_at":"2026-08-12","cover":"https://picsum.photos/seed/cafe1/400/600","note":"Тихий утро"}'::jsonb, 1, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000662', 'b11e0000-0000-4000-8000-000000000064', '{"title":"Парк Горького","city":"Москва","kind":"park","visited_at":"2026-07-03","cover":"https://picsum.photos/seed/gorky/400/600"}'::jsonb, 2, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000663', 'b11e0000-0000-4000-8000-000000000064', '{"title":"Гараж","city":"Москва","kind":"museum","visited_at":"2026-06-18","cover":"https://picsum.photos/seed/garage/400/600"}'::jsonb, 3, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000664', 'b11e0000-0000-4000-8000-000000000064', '{"title":"Винный бар Юность","city":"Москва","kind":"bar","visited_at":"2026-08-29","cover":"https://picsum.photos/seed/bar1/400/600"}'::jsonb, 4, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000665', 'b11e0000-0000-4000-8000-000000000064', '{"title":"Набережная","city":"Санкт-Петербург","kind":"walk","visited_at":"2026-09-05","cover":"https://picsum.photos/seed/embankment/400/600"}'::jsonb, 5, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000666', 'b11e0000-0000-4000-8000-000000000064', '{"title":"Эрмитаж","city":"Санкт-Петербург","kind":"museum","visited_at":"2026-09-06","cover":"https://picsum.photos/seed/hermitage/400/600"}'::jsonb, 6, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000667', 'b11e0000-0000-4000-8000-000000000064', '{"title":"Булочная №1","city":"Москва","kind":"cafe","visited_at":"2026-05-22","cover":"https://picsum.photos/seed/bakery/400/600"}'::jsonb, 7, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000668', 'b11e0000-0000-4000-8000-000000000064', '{"title":"Сокольники","city":"Москва","kind":"park","visited_at":"2026-04-11","cover":"https://picsum.photos/seed/sokolniki/400/600"}'::jsonb, 8, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000669', 'b11e0000-0000-4000-8000-000000000064', '{"title":"Крыша на Покровке","city":"Москва","kind":"bar","visited_at":"2026-07-25","cover":"https://picsum.photos/seed/roof/400/600"}'::jsonb, 9, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000670', 'b11e0000-0000-4000-8000-000000000064', '{"title":"ВДнХ вечером","city":"Москва","kind":"walk","visited_at":"2026-08-01","cover":"https://picsum.photos/seed/vdnh/400/600"}'::jsonb, 10, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000681', 'b11e0000-0000-4000-8000-000000000065', '{"name":"Продукты на неделю","amount":6200,"category":"food","paid_at":"2026-09-01","who":"kirill"}'::jsonb, 1, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000682', 'b11e0000-0000-4000-8000-000000000065', '{"name":"Аренда","amount":55000,"category":"home","paid_at":"2026-09-02","who":"shared"}'::jsonb, 2, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000683', 'b11e0000-0000-4000-8000-000000000065', '{"name":"Метро и такси","amount":1800,"category":"transport","paid_at":"2026-09-03","who":"anna"}'::jsonb, 3, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000684', 'b11e0000-0000-4000-8000-000000000065', '{"name":"Кино","amount":1400,"category":"fun","paid_at":"2026-09-04","who":"shared"}'::jsonb, 4, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000685', 'b11e0000-0000-4000-8000-000000000065', '{"name":"Аптека","amount":890,"category":"health","paid_at":"2026-09-04","who":"kirill"}'::jsonb, 5, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000686', 'b11e0000-0000-4000-8000-000000000065', '{"name":"Ужин в кафе","amount":3200,"category":"fun","paid_at":"2026-09-05","who":"shared"}'::jsonb, 6, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000687', 'b11e0000-0000-4000-8000-000000000065', '{"name":"Коммуналка","amount":7100,"category":"home","paid_at":"2026-09-05","who":"kirill"}'::jsonb, 7, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000688', 'b11e0000-0000-4000-8000-000000000065', '{"name":"Кофе с собой","amount":420,"category":"food","paid_at":"2026-09-06","who":"anna"}'::jsonb, 8, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000689', 'b11e0000-0000-4000-8000-000000000065', '{"name":"Велопрокат","amount":600,"category":"transport","paid_at":"2026-09-06","who":"lena"}'::jsonb, 9, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000690', 'b11e0000-0000-4000-8000-000000000065', '{"name":"Йога","amount":1500,"category":"health","paid_at":"2026-09-07","who":"lena"}'::jsonb, 10, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000691', 'b11e0000-0000-4000-8000-000000000065', '{"name":"Рынок","amount":2100,"category":"food","paid_at":"2026-08-28","who":"shared"}'::jsonb, 11, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000692', 'b11e0000-0000-4000-8000-000000000065', '{"name":"Настолки","amount":2400,"category":"fun","paid_at":"2026-08-30","who":"shared"}'::jsonb, 12, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001')
on conflict (id) do update set
  values = excluded.values,
  position = excluded.position,
  is_checked = excluded.is_checked,
  checked_at = excluded.checked_at,
  updated_by = excluded.updated_by;

-- === CHUNK items_5 ===
insert into public.items (id, list_id, values, position, is_checked, checked_at, created_by, updated_by)
values
('c11e0000-0000-4000-8000-000000000701', 'b11e0000-0000-4000-8000-000000000066', '{"title":"Утренний кросс","kind":"run","minutes":32,"done_at":"2026-09-01","feel":8}'::jsonb, 1, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000702', 'b11e0000-0000-4000-8000-000000000066', '{"title":"Спина и ноги","kind":"strength","minutes":50,"done_at":"2026-09-02","feel":7}'::jsonb, 2, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000703', 'b11e0000-0000-4000-8000-000000000066', '{"title":"Йога перед сном","kind":"yoga","minutes":25,"done_at":"2026-09-03","feel":9}'::jsonb, 3, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000704', 'b11e0000-0000-4000-8000-000000000066', '{"title":"Прогулка в парке","kind":"walk","minutes":40,"done_at":"2026-09-04","feel":8}'::jsonb, 4, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000705', 'b11e0000-0000-4000-8000-000000000066', '{"title":"Интервалы","kind":"run","minutes":28,"done_at":"2026-09-05","feel":6}'::jsonb, 5, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000706', 'b11e0000-0000-4000-8000-000000000066', '{"title":"Жим и тяга","kind":"strength","minutes":55,"done_at":"2026-09-06","feel":8}'::jsonb, 6, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000707', 'b11e0000-0000-4000-8000-000000000066', '{"title":"Растяжка","kind":"yoga","minutes":20,"done_at":"2026-08-30","feel":7}'::jsonb, 7, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000708', 'b11e0000-0000-4000-8000-000000000066', '{"title":"10 км","kind":"run","minutes":58,"done_at":"2026-08-24","feel":9}'::jsonb, 8, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000709', 'b11e0000-0000-4000-8000-000000000066', '{"title":"Ходьба на работу","kind":"walk","minutes":35,"done_at":"2026-09-07","feel":7}'::jsonb, 9, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000710', 'b11e0000-0000-4000-8000-000000000066', '{"title":"Плечи","kind":"strength","minutes":40,"done_at":"2026-09-08","feel":6}'::jsonb, 10, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000721', 'b11e0000-0000-4000-8000-000000000067', '{"title":"Проверить публичные примеры","priority":"high","due":"2026-09-06","notes":"Лента и графики"}'::jsonb, 1, false, null, '6c1d42f0-3128-4ea9-bbeb-161f6cd98ba0', '6c1d42f0-3128-4ea9-bbeb-161f6cd98ba0'),
('c11e0000-0000-4000-8000-000000000722', 'b11e0000-0000-4000-8000-000000000067', '{"title":"Текст лендинга","priority":"mid","due":"2026-09-08"}'::jsonb, 2, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000723', 'b11e0000-0000-4000-8000-000000000067', '{"title":"Починить шаринг по ссылке","priority":"high","due":"2026-09-07"}'::jsonb, 3, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000724', 'b11e0000-0000-4000-8000-000000000067', '{"title":"Скриншоты видов","priority":"mid","due":"2026-09-10"}'::jsonb, 4, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000725', 'b11e0000-0000-4000-8000-000000000067', '{"title":"Проверка RLS на графиках","priority":"high","due":"2026-09-05"}'::jsonb, 5, true, now(), '6c1d42f0-3128-4ea9-bbeb-161f6cd98ba0', '6c1d42f0-3128-4ea9-bbeb-161f6cd98ba0'),
('c11e0000-0000-4000-8000-000000000726', 'b11e0000-0000-4000-8000-000000000067', '{"title":"Демо-аккаунты в README","priority":"low","due":"2026-09-12"}'::jsonb, 6, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000727', 'b11e0000-0000-4000-8000-000000000067', '{"title":"Пустые состояния Explore","priority":"mid","due":"2026-09-09"}'::jsonb, 7, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000728', 'b11e0000-0000-4000-8000-000000000067', '{"title":"Нагрузочный список 50 записей","priority":"low","due":"2026-09-15"}'::jsonb, 8, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000729', 'b11e0000-0000-4000-8000-000000000067', '{"title":"Перевод шаблонов","priority":"mid","due":"2026-09-11"}'::jsonb, 9, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000730', 'b11e0000-0000-4000-8000-000000000067', '{"title":"Финальный проход по мобиле","priority":"high","due":"2026-09-13"}'::jsonb, 10, false, null, '6c1d42f0-3128-4ea9-bbeb-161f6cd98ba0', '6c1d42f0-3128-4ea9-bbeb-161f6cd98ba0'),
('c11e0000-0000-4000-8000-000000000741', 'b11e0000-0000-4000-8000-000000000068', '{"title":"Паста-вечер","host":"oleg","when":"2026-09-06","dish":"Карбонара","status":"done","note":"Принесли вино"}'::jsonb, 1, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000742', 'b11e0000-0000-4000-8000-000000000068', '{"title":"Борщ и пирожки","host":"anna","when":"2026-09-13","dish":"Борщ","status":"planned"}'::jsonb, 2, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000743', 'b11e0000-0000-4000-8000-000000000068', '{"title":"Азиатская ночь","host":"lena","when":"2026-09-20","dish":"Рамен","status":"idea"}'::jsonb, 3, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000744', 'b11e0000-0000-4000-8000-000000000068', '{"title":"Завтрак на ужин","host":"kirill","when":"2026-09-27","dish":"Сырники","status":"planned"}'::jsonb, 4, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000745', 'b11e0000-0000-4000-8000-000000000068', '{"title":"Пикник","host":"anna","when":"2026-08-16","dish":"Сэндвичи","status":"done"}'::jsonb, 5, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000746', 'b11e0000-0000-4000-8000-000000000068', '{"title":"Веган-эксперимент","host":"oleg","when":"2026-10-04","dish":"Нут с тыквой","status":"idea"}'::jsonb, 6, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000747', 'b11e0000-0000-4000-8000-000000000068', '{"title":"Суши дома","host":"lena","when":"2026-08-02","dish":"Роллы","status":"done"}'::jsonb, 7, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000748', 'b11e0000-0000-4000-8000-000000000068', '{"title":"День супа","host":"kirill","when":"2026-10-11","dish":"Мисо","status":"idea"}'::jsonb, 8, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000761', 'b11e0000-0000-4000-8000-000000000069', '{"title":"Как устроены списки","show":"Build Log","status":"done","mins":48,"finished_at":"2026-08-20"}'::jsonb, 1, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000762', 'b11e0000-0000-4000-8000-000000000069', '{"title":"Почему оценки врут","show":"Data Club","status":"listening","mins":62}'::jsonb, 2, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000763', 'b11e0000-0000-4000-8000-000000000069', '{"title":"Настолки 2026","show":"Table Talk","status":"queue","mins":55}'::jsonb, 3, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000764', 'b11e0000-0000-4000-8000-000000000069', '{"title":"Сон и тренировки","show":"Body Notes","status":"done","mins":34,"finished_at":"2026-09-01"}'::jsonb, 4, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000765', 'b11e0000-0000-4000-8000-000000000069', '{"title":"Питер за выходные","show":"Города","status":"queue","mins":41}'::jsonb, 5, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000766', 'b11e0000-0000-4000-8000-000000000069', '{"title":"Винил vs стриминг","show":"Sound Room","status":"done","mins":52,"finished_at":"2026-07-14"}'::jsonb, 6, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000767', 'b11e0000-0000-4000-8000-000000000069', '{"title":"Кино без спойлеров","show":"Кассета","status":"listening","mins":70}'::jsonb, 7, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000768', 'b11e0000-0000-4000-8000-000000000069', '{"title":"Еда в дороге","show":"Кухня","status":"queue","mins":28}'::jsonb, 8, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000781', 'b11e0000-0000-4000-8000-000000000070', '{"title":"Концерт на крыше","venue":"Музеон","starts":"2026-09-12","kind":"concert","price":1500}'::jsonb, 1, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000782', 'b11e0000-0000-4000-8000-000000000070', '{"title":"Ретро в Иллюзионе","venue":"Иллюзион","starts":"2026-09-08","kind":"cinema","price":450}'::jsonb, 2, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000783', 'b11e0000-0000-4000-8000-000000000070', '{"title":"Парковый забег","venue":"Сокольники","starts":"2026-09-14","kind":"sport","price":0}'::jsonb, 3, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003'),
('c11e0000-0000-4000-8000-000000000784', 'b11e0000-0000-4000-8000-000000000070', '{"title":"Встреча книжного","venue":"Фаланстер","starts":"2026-09-18","kind":"meetup","price":0}'::jsonb, 4, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002')
on conflict (id) do update set
  values = excluded.values,
  position = excluded.position,
  is_checked = excluded.is_checked,
  checked_at = excluded.checked_at,
  updated_by = excluded.updated_by;

-- === CHUNK items_6 ===
insert into public.items (id, list_id, values, position, is_checked, checked_at, created_by, updated_by)
values
('c11e0000-0000-4000-8000-000000000785', 'b11e0000-0000-4000-8000-000000000070', '{"title":"Джаз в саду","venue":"Эрмитаж","starts":"2026-09-26","kind":"concert","price":2000}'::jsonb, 5, false, null, 'a11e0000-0000-4000-8000-000000000004', 'a11e0000-0000-4000-8000-000000000004'),
('c11e0000-0000-4000-8000-000000000786', 'b11e0000-0000-4000-8000-000000000070', '{"title":"Премьера","venue":"Октябрь","starts":"2026-10-02","kind":"cinema","price":700}'::jsonb, 6, false, null, 'a11e0000-0000-4000-8000-000000000001', 'a11e0000-0000-4000-8000-000000000001'),
('c11e0000-0000-4000-8000-000000000787', 'b11e0000-0000-4000-8000-000000000070', '{"title":"Настолки у Кирилла","venue":"Дома","starts":"2026-09-07","kind":"meetup","price":0}'::jsonb, 7, false, null, 'a11e0000-0000-4000-8000-000000000002', 'a11e0000-0000-4000-8000-000000000002'),
('c11e0000-0000-4000-8000-000000000788', 'b11e0000-0000-4000-8000-000000000070', '{"title":"Велозаезд","venue":"Воробьёвы","starts":"2026-09-20","kind":"sport","price":0}'::jsonb, 8, false, null, 'a11e0000-0000-4000-8000-000000000003', 'a11e0000-0000-4000-8000-000000000003')
on conflict (id) do update set
  values = excluded.values,
  position = excluded.position,
  is_checked = excluded.is_checked,
  checked_at = excluded.checked_at,
  updated_by = excluded.updated_by;

-- === CHUNK items_finish ===
alter table public.items enable trigger items_activity;

-- === CHUNK ratings ===
insert into public.item_ratings (item_id, field_id, user_id, value)
values
('c11e0000-0000-4000-8000-000000000111', 'ratings', 'a11e0000-0000-4000-8000-000000000001', 9),
('c11e0000-0000-4000-8000-000000000111', 'ratings', 'a11e0000-0000-4000-8000-000000000003', 8),
('c11e0000-0000-4000-8000-000000000111', 'ratings', 'a11e0000-0000-4000-8000-000000000002', 9),
('c11e0000-0000-4000-8000-000000000112', 'ratings', 'a11e0000-0000-4000-8000-000000000001', 7),
('c11e0000-0000-4000-8000-000000000112', 'ratings', 'a11e0000-0000-4000-8000-000000000004', 6),
('c11e0000-0000-4000-8000-000000000113', 'ratings', 'a11e0000-0000-4000-8000-000000000001', 10),
('c11e0000-0000-4000-8000-000000000113', 'ratings', 'a11e0000-0000-4000-8000-000000000002', 9),
('c11e0000-0000-4000-8000-000000000113', 'ratings', 'a11e0000-0000-4000-8000-000000000003', 10),
('c11e0000-0000-4000-8000-000000000114', 'ratings', 'a11e0000-0000-4000-8000-000000000001', 8),
('c11e0000-0000-4000-8000-000000000114', 'ratings', 'a11e0000-0000-4000-8000-000000000004', 9),
('c11e0000-0000-4000-8000-000000000115', 'ratings', 'a11e0000-0000-4000-8000-000000000002', 10),
('c11e0000-0000-4000-8000-000000000115', 'ratings', 'a11e0000-0000-4000-8000-000000000001', 9),
('c11e0000-0000-4000-8000-000000000115', 'ratings', 'a11e0000-0000-4000-8000-000000000003', 8),
('c11e0000-0000-4000-8000-000000000116', 'ratings', 'a11e0000-0000-4000-8000-000000000003', 7),
('c11e0000-0000-4000-8000-000000000117', 'ratings', 'a11e0000-0000-4000-8000-000000000004', 9),
('c11e0000-0000-4000-8000-000000000117', 'ratings', 'a11e0000-0000-4000-8000-000000000001', 8),
('c11e0000-0000-4000-8000-000000000118', 'ratings', 'a11e0000-0000-4000-8000-000000000001', 9),
('c11e0000-0000-4000-8000-000000000118', 'ratings', 'a11e0000-0000-4000-8000-000000000002', 8),
('c11e0000-0000-4000-8000-000000000120', 'ratings', 'a11e0000-0000-4000-8000-000000000001', 10),
('c11e0000-0000-4000-8000-000000000120', 'ratings', 'a11e0000-0000-4000-8000-000000000002', 10),
('c11e0000-0000-4000-8000-000000000120', 'ratings', 'a11e0000-0000-4000-8000-000000000003', 9),
('c11e0000-0000-4000-8000-000000000301', 'ratings', 'a11e0000-0000-4000-8000-000000000003', 10),
('c11e0000-0000-4000-8000-000000000301', 'ratings', 'a11e0000-0000-4000-8000-000000000001', 9),
('c11e0000-0000-4000-8000-000000000301', 'ratings', 'a11e0000-0000-4000-8000-000000000002', 9),
('c11e0000-0000-4000-8000-000000000302', 'ratings', 'a11e0000-0000-4000-8000-000000000003', 9),
('c11e0000-0000-4000-8000-000000000302', 'ratings', 'a11e0000-0000-4000-8000-000000000004', 10),
('c11e0000-0000-4000-8000-000000000303', 'ratings', 'a11e0000-0000-4000-8000-000000000003', 10),
('c11e0000-0000-4000-8000-000000000305', 'ratings', 'a11e0000-0000-4000-8000-000000000002', 10),
('c11e0000-0000-4000-8000-000000000305', 'ratings', 'a11e0000-0000-4000-8000-000000000003', 8),
('c11e0000-0000-4000-8000-000000000306', 'ratings', 'a11e0000-0000-4000-8000-000000000004', 9),
('c11e0000-0000-4000-8000-000000000308', 'ratings', 'a11e0000-0000-4000-8000-000000000001', 10),
('c11e0000-0000-4000-8000-000000000308', 'ratings', 'a11e0000-0000-4000-8000-000000000003', 10),
('c11e0000-0000-4000-8000-000000000311', 'ratings', 'a11e0000-0000-4000-8000-000000000003', 10),
('c11e0000-0000-4000-8000-000000000311', 'ratings', 'a11e0000-0000-4000-8000-000000000001', 9),
('c11e0000-0000-4000-8000-000000000314', 'ratings', 'a11e0000-0000-4000-8000-000000000001', 9),
('c11e0000-0000-4000-8000-000000000314', 'ratings', 'a11e0000-0000-4000-8000-000000000002', 8),
('c11e0000-0000-4000-8000-000000000318', 'ratings', 'a11e0000-0000-4000-8000-000000000003', 10),
('c11e0000-0000-4000-8000-000000000318', 'ratings', 'a11e0000-0000-4000-8000-000000000004', 9),
('c11e0000-0000-4000-8000-000000000661', 'ratings', 'a11e0000-0000-4000-8000-000000000004', 8),
('c11e0000-0000-4000-8000-000000000661', 'ratings', 'a11e0000-0000-4000-8000-000000000001', 9),
('c11e0000-0000-4000-8000-000000000661', 'ratings', 'a11e0000-0000-4000-8000-000000000003', 7),
('c11e0000-0000-4000-8000-000000000662', 'ratings', 'a11e0000-0000-4000-8000-000000000001', 9),
('c11e0000-0000-4000-8000-000000000662', 'ratings', 'a11e0000-0000-4000-8000-000000000002', 8),
('c11e0000-0000-4000-8000-000000000663', 'ratings', 'a11e0000-0000-4000-8000-000000000003', 10),
('c11e0000-0000-4000-8000-000000000663', 'ratings', 'a11e0000-0000-4000-8000-000000000001', 8),
('c11e0000-0000-4000-8000-000000000664', 'ratings', 'a11e0000-0000-4000-8000-000000000002', 7),
('c11e0000-0000-4000-8000-000000000664', 'ratings', 'a11e0000-0000-4000-8000-000000000004', 8),
('c11e0000-0000-4000-8000-000000000666', 'ratings', 'a11e0000-0000-4000-8000-000000000002', 10),
('c11e0000-0000-4000-8000-000000000666', 'ratings', 'a11e0000-0000-4000-8000-000000000001', 10),
('c11e0000-0000-4000-8000-000000000666', 'ratings', 'a11e0000-0000-4000-8000-000000000003', 9),
('c11e0000-0000-4000-8000-000000000741', 'ratings', 'a11e0000-0000-4000-8000-000000000001', 9),
('c11e0000-0000-4000-8000-000000000741', 'ratings', 'a11e0000-0000-4000-8000-000000000002', 8),
('c11e0000-0000-4000-8000-000000000741', 'ratings', 'a11e0000-0000-4000-8000-000000000003', 9),
('c11e0000-0000-4000-8000-000000000741', 'ratings', 'a11e0000-0000-4000-8000-000000000004', 8),
('c11e0000-0000-4000-8000-000000000745', 'ratings', 'a11e0000-0000-4000-8000-000000000001', 8),
('c11e0000-0000-4000-8000-000000000745', 'ratings', 'a11e0000-0000-4000-8000-000000000004', 7),
('c11e0000-0000-4000-8000-000000000747', 'ratings', 'a11e0000-0000-4000-8000-000000000003', 9),
('c11e0000-0000-4000-8000-000000000747', 'ratings', 'a11e0000-0000-4000-8000-000000000001', 8),
('c11e0000-0000-4000-8000-000000000761', 'ratings', 'a11e0000-0000-4000-8000-000000000004', 8),
('c11e0000-0000-4000-8000-000000000764', 'ratings', 'a11e0000-0000-4000-8000-000000000003', 9),
('c11e0000-0000-4000-8000-000000000766', 'ratings', 'a11e0000-0000-4000-8000-000000000004', 10),
('c11e0000-0000-4000-8000-000000000766', 'ratings', 'a11e0000-0000-4000-8000-000000000001', 8)
on conflict (item_id, field_id, user_id) do update set value = excluded.value, updated_at = now();

-- === CHUNK comments ===
insert into public.item_comments (id, item_id, user_id, body, color, show_author, show_time)
values
('e11e0000-0000-4000-8000-000000000001', 'c11e0000-0000-4000-8000-000000000111', 'a11e0000-0000-4000-8000-000000000003', 'Второй раз смотрела уже спокойнее.', 'teal', true, true),
('e11e0000-0000-4000-8000-000000000002', 'c11e0000-0000-4000-8000-000000000111', 'a11e0000-0000-4000-8000-000000000002', 'Звук в кинотеатре решает.', 'amber', true, true),
('e11e0000-0000-4000-8000-000000000003', 'c11e0000-0000-4000-8000-000000000112', 'a11e0000-0000-4000-8000-000000000004', 'Второй сезон можно было короче.', 'rose', true, true),
('e11e0000-0000-4000-8000-000000000004', 'c11e0000-0000-4000-8000-000000000301', 'a11e0000-0000-4000-8000-000000000001', 'Рогалики навсегда.', 'violet', true, true),
('e11e0000-0000-4000-8000-000000000005', 'c11e0000-0000-4000-8000-000000000302', 'a11e0000-0000-4000-8000-000000000002', '92 часа — это ещё скромно.', 'sky', true, true),
('e11e0000-0000-4000-8000-000000000006', 'c11e0000-0000-4000-8000-000000000311', 'a11e0000-0000-4000-8000-000000000001', 'Перечитываем каждые пару лет.', 'emerald', true, true),
('e11e0000-0000-4000-8000-000000000007', 'c11e0000-0000-4000-8000-000000000622', 'a11e0000-0000-4000-8000-000000000003', 'На ревью после фильтров.', 'slate', true, true),
('e11e0000-0000-4000-8000-000000000008', 'c11e0000-0000-4000-8000-000000000621', 'a11e0000-0000-4000-8000-000000000001', 'Проверила на покупках — ок.', 'teal', true, true),
('e11e0000-0000-4000-8000-000000000009', 'c11e0000-0000-4000-8000-000000000641', 'a11e0000-0000-4000-8000-000000000002', 'Беру выходной в пятницу.', 'amber', true, true),
('e11e0000-0000-4000-8000-000000000010', 'c11e0000-0000-4000-8000-000000000661', 'a11e0000-0000-4000-8000-000000000001', 'Там отличный флет уайт.', 'rose', true, true),
('e11e0000-0000-4000-8000-000000000011', 'c11e0000-0000-4000-8000-000000000682', 'a11e0000-0000-4000-8000-000000000001', 'Делим как обычно 50/50.', 'violet', true, true),
('e11e0000-0000-4000-8000-000000000012', 'c11e0000-0000-4000-8000-000000000721', 'a11e0000-0000-4000-8000-000000000001', 'Ленту уже можно показывать.', 'emerald', true, true),
('e11e0000-0000-4000-8000-000000000013', 'c11e0000-0000-4000-8000-000000000741', 'a11e0000-0000-4000-8000-000000000004', 'В следующий раз больше сыра.', 'amber', true, true),
('e11e0000-0000-4000-8000-000000000014', 'c11e0000-0000-4000-8000-000000000781', 'a11e0000-0000-4000-8000-000000000002', 'Беру два билета.', 'sky', true, true),
('e11e0000-0000-4000-8000-000000000015', 'c11e0000-0000-4000-8000-000000000108', 'a11e0000-0000-4000-8000-000000000003', 'Если не будет на большом — дома.', 'slate', true, true),
('e11e0000-0000-4000-8000-000000000016', 'c11e0000-0000-4000-8000-000000000318', 'a11e0000-0000-4000-8000-000000000004', 'После этого всегда хочется в Зону.', 'teal', true, true)
on conflict (id) do update set body = excluded.body, color = excluded.color;

-- === CHUNK charts ===
insert into public.list_charts (id, list_id, name, chart_type, config)
values
('d11e0000-0000-4000-8000-000000000001', 'b11e0000-0000-4000-8000-000000000012', 'Лента просмотров', 'timeline', '{"aggregation":"count","dateFieldId":"watched_at"}'::jsonb),
('d11e0000-0000-4000-8000-000000000002', 'b11e0000-0000-4000-8000-000000000012', 'Средние оценки во времени', 'stem', '{"aggregation":"avg","dateFieldId":"watched_at","valueFieldId":"ratings"}'::jsonb),
('d11e0000-0000-4000-8000-000000000003', 'b11e0000-0000-4000-8000-000000000012', 'Типы тайтлов', 'pie', '{"groupFieldId":"kind"}'::jsonb),
('d11e0000-0000-4000-8000-000000000004', 'b11e0000-0000-4000-8000-000000000012', 'Сводка клуба', 'kpi', '{"valueFieldId":"ratings","aggregation":"avg"}'::jsonb),
('d11e0000-0000-4000-8000-000000000005', 'b11e0000-0000-4000-8000-000000000022', 'Траты по дням', 'bar', '{"aggregation":"sum","dateFieldId":"bought_at","valueFieldId":"price"}'::jsonb),
('d11e0000-0000-4000-8000-000000000006', 'b11e0000-0000-4000-8000-000000000022', 'Категории покупок', 'pie', '{"groupFieldId":"category"}'::jsonb),
('d11e0000-0000-4000-8000-000000000007', 'b11e0000-0000-4000-8000-000000000022', 'KPI покупок', 'kpi', '{"valueFieldId":"price","aggregation":"sum"}'::jsonb),
('d11e0000-0000-4000-8000-000000000008', 'b11e0000-0000-4000-8000-000000000031', 'Когда проходили', 'timeline', '{"aggregation":"count","dateFieldId":"finished_at"}'::jsonb),
('d11e0000-0000-4000-8000-000000000009', 'b11e0000-0000-4000-8000-000000000031', 'Оценки по времени', 'stem', '{"aggregation":"avg","dateFieldId":"finished_at","valueFieldId":"ratings"}'::jsonb),
('d11e0000-0000-4000-8000-000000000010', 'b11e0000-0000-4000-8000-000000000031', 'Платформы', 'pie', '{"groupFieldId":"platform"}'::jsonb),
('d11e0000-0000-4000-8000-000000000011', 'b11e0000-0000-4000-8000-000000000032', 'Статусы полок', 'pie', '{"groupFieldId":"status"}'::jsonb),
('d11e0000-0000-4000-8000-000000000012', 'b11e0000-0000-4000-8000-000000000032', 'Сводка клуба', 'kpi', '{"valueFieldId":"ratings","aggregation":"avg"}'::jsonb),
('d11e0000-0000-4000-8000-000000000013', 'b11e0000-0000-4000-8000-000000000062', 'Колонки спринта', 'pie', '{"groupFieldId":"status"}'::jsonb),
('d11e0000-0000-4000-8000-000000000014', 'b11e0000-0000-4000-8000-000000000062', 'KPI спринта', 'kpi', '{"aggregation":"count"}'::jsonb),
('d11e0000-0000-4000-8000-000000000015', 'b11e0000-0000-4000-8000-000000000063', 'Бюджет по датам', 'bar', '{"aggregation":"sum","dateFieldId":"starts","valueFieldId":"budget"}'::jsonb),
('d11e0000-0000-4000-8000-000000000016', 'b11e0000-0000-4000-8000-000000000063', 'Типы поездок', 'pie', '{"groupFieldId":"kind"}'::jsonb),
('d11e0000-0000-4000-8000-000000000017', 'b11e0000-0000-4000-8000-000000000064', 'Типы мест', 'pie', '{"groupFieldId":"kind"}'::jsonb),
('d11e0000-0000-4000-8000-000000000018', 'b11e0000-0000-4000-8000-000000000064', 'Оценки во времени', 'stem', '{"aggregation":"avg","dateFieldId":"visited_at","valueFieldId":"ratings"}'::jsonb),
('d11e0000-0000-4000-8000-000000000019', 'b11e0000-0000-4000-8000-000000000064', 'Сводка мест', 'kpi', '{"valueFieldId":"ratings","aggregation":"avg"}'::jsonb),
('d11e0000-0000-4000-8000-000000000020', 'b11e0000-0000-4000-8000-000000000065', 'Траты по дням', 'bar', '{"aggregation":"sum","dateFieldId":"paid_at","valueFieldId":"amount"}'::jsonb),
('d11e0000-0000-4000-8000-000000000021', 'b11e0000-0000-4000-8000-000000000065', 'Категории', 'pie', '{"groupFieldId":"category"}'::jsonb),
('d11e0000-0000-4000-8000-000000000022', 'b11e0000-0000-4000-8000-000000000065', 'Линия расходов', 'line', '{"aggregation":"sum","dateFieldId":"paid_at","valueFieldId":"amount"}'::jsonb),
('d11e0000-0000-4000-8000-000000000023', 'b11e0000-0000-4000-8000-000000000065', 'KPI сентября', 'kpi', '{"valueFieldId":"amount","aggregation":"sum"}'::jsonb),
('d11e0000-0000-4000-8000-000000000024', 'b11e0000-0000-4000-8000-000000000066', 'Минуты по дням', 'line', '{"aggregation":"sum","dateFieldId":"done_at","valueFieldId":"minutes"}'::jsonb),
('d11e0000-0000-4000-8000-000000000025', 'b11e0000-0000-4000-8000-000000000066', 'Типы тренировок', 'pie', '{"groupFieldId":"kind"}'::jsonb),
('d11e0000-0000-4000-8000-000000000026', 'b11e0000-0000-4000-8000-000000000066', 'KPI формы', 'kpi', '{"valueFieldId":"minutes","aggregation":"sum"}'::jsonb),
('d11e0000-0000-4000-8000-000000000027', 'b11e0000-0000-4000-8000-000000000041', 'Приоритеты', 'pie', '{"groupFieldId":"priority"}'::jsonb),
('d11e0000-0000-4000-8000-000000000028', 'b11e0000-0000-4000-8000-000000000041', 'KPI дел', 'kpi', '{"aggregation":"count"}'::jsonb),
('d11e0000-0000-4000-8000-000000000029', 'b11e0000-0000-4000-8000-000000000068', 'Статусы ужинов', 'pie', '{"groupFieldId":"status"}'::jsonb),
('d11e0000-0000-4000-8000-000000000030', 'b11e0000-0000-4000-8000-000000000070', 'События по типу', 'pie', '{"groupFieldId":"kind"}'::jsonb),
('d11e0000-0000-4000-8000-000000000031', 'b11e0000-0000-4000-8000-000000000067', 'Приоритеты релиза', 'pie', '{"groupFieldId":"priority"}'::jsonb),
('d11e0000-0000-4000-8000-000000000032', 'b11e0000-0000-4000-8000-000000000067', 'KPI чеклиста', 'kpi', '{"aggregation":"count"}'::jsonb)
on conflict (id) do update set name = excluded.name, chart_type = excluded.chart_type, config = excluded.config;

-- === CHUNK members ===
insert into public.list_members (list_id, user_id, role)
values
('b11e0000-0000-4000-8000-000000000011', 'a11e0000-0000-4000-8000-000000000003', 'editor'),
('b11e0000-0000-4000-8000-000000000011', 'a11e0000-0000-4000-8000-000000000002', 'editor'),
('b11e0000-0000-4000-8000-000000000012', 'a11e0000-0000-4000-8000-000000000002', 'viewer'),
('b11e0000-0000-4000-8000-000000000012', 'a11e0000-0000-4000-8000-000000000003', 'proposer'),
('b11e0000-0000-4000-8000-000000000012', 'a11e0000-0000-4000-8000-000000000004', 'proposer'),
('b11e0000-0000-4000-8000-000000000021', 'a11e0000-0000-4000-8000-000000000001', 'editor'),
('b11e0000-0000-4000-8000-000000000021', 'a11e0000-0000-4000-8000-000000000003', 'editor'),
('b11e0000-0000-4000-8000-000000000032', 'a11e0000-0000-4000-8000-000000000001', 'editor'),
('b11e0000-0000-4000-8000-000000000032', 'a11e0000-0000-4000-8000-000000000002', 'editor'),
('b11e0000-0000-4000-8000-000000000061', 'a11e0000-0000-4000-8000-000000000001', 'editor'),
('b11e0000-0000-4000-8000-000000000061', 'a11e0000-0000-4000-8000-000000000002', 'editor'),
('b11e0000-0000-4000-8000-000000000062', 'a11e0000-0000-4000-8000-000000000001', 'editor'),
('b11e0000-0000-4000-8000-000000000062', 'a11e0000-0000-4000-8000-000000000003', 'editor'),
('b11e0000-0000-4000-8000-000000000062', 'a11e0000-0000-4000-8000-000000000004', 'editor'),
('b11e0000-0000-4000-8000-000000000062', '6c1d42f0-3128-4ea9-bbeb-161f6cd98ba0', 'viewer'),
('b11e0000-0000-4000-8000-000000000063', 'a11e0000-0000-4000-8000-000000000002', 'editor'),
('b11e0000-0000-4000-8000-000000000063', 'a11e0000-0000-4000-8000-000000000003', 'editor'),
('b11e0000-0000-4000-8000-000000000064', 'a11e0000-0000-4000-8000-000000000001', 'editor'),
('b11e0000-0000-4000-8000-000000000064', 'a11e0000-0000-4000-8000-000000000003', 'editor'),
('b11e0000-0000-4000-8000-000000000064', 'a11e0000-0000-4000-8000-000000000002', 'editor'),
('b11e0000-0000-4000-8000-000000000065', 'a11e0000-0000-4000-8000-000000000001', 'editor'),
('b11e0000-0000-4000-8000-000000000065', 'a11e0000-0000-4000-8000-000000000003', 'viewer'),
('b11e0000-0000-4000-8000-000000000067', 'a11e0000-0000-4000-8000-000000000001', 'editor'),
('b11e0000-0000-4000-8000-000000000067', 'a11e0000-0000-4000-8000-000000000002', 'editor'),
('b11e0000-0000-4000-8000-000000000067', 'a11e0000-0000-4000-8000-000000000003', 'proposer'),
('b11e0000-0000-4000-8000-000000000068', 'a11e0000-0000-4000-8000-000000000002', 'editor'),
('b11e0000-0000-4000-8000-000000000068', 'a11e0000-0000-4000-8000-000000000003', 'editor'),
('b11e0000-0000-4000-8000-000000000068', 'a11e0000-0000-4000-8000-000000000004', 'editor'),
('b11e0000-0000-4000-8000-000000000070', 'a11e0000-0000-4000-8000-000000000001', 'editor'),
('b11e0000-0000-4000-8000-000000000070', 'a11e0000-0000-4000-8000-000000000002', 'editor'),
('b11e0000-0000-4000-8000-000000000051', 'a11e0000-0000-4000-8000-000000000001', 'proposer'),
('b11e0000-0000-4000-8000-000000000051', 'a11e0000-0000-4000-8000-000000000002', 'proposer')
on conflict (list_id, user_id) do update set role = excluded.role;

-- === CHUNK proposals ===
insert into public.change_proposals (id, list_id, item_id, user_id, action, payload, status)
values
('f11e0000-0000-4000-8000-000000000001', 'b11e0000-0000-4000-8000-000000000012', null, 'a11e0000-0000-4000-8000-000000000003', 'create', '{"values":{"title":"Чернобыль","year":2019,"kind":"series","watched_at":"2026-08-01"}}'::jsonb, 'pending'),
('f11e0000-0000-4000-8000-000000000002', 'b11e0000-0000-4000-8000-000000000012', 'c11e0000-0000-4000-8000-000000000111', 'a11e0000-0000-4000-8000-000000000002', 'update', '{"values":{"title":"Оппенгеймер","year":2023,"kind":"movie","watched_at":"2024-11-02","review":"Долго, но держит. Стоит пересмотреть сноску про Гроves."}}'::jsonb, 'pending'),
('f11e0000-0000-4000-8000-000000000003', 'b11e0000-0000-4000-8000-000000000031', null, 'a11e0000-0000-4000-8000-000000000001', 'create', '{"values":{"title":"Inscryption","platform":"pc","status":"completed","hours":14,"finished_at":"2025-12-01"}}'::jsonb, 'pending'),
('f11e0000-0000-4000-8000-000000000004', 'b11e0000-0000-4000-8000-000000000067', null, 'a11e0000-0000-4000-8000-000000000003', 'create', '{"values":{"title":"Короткий ролик по видам","priority":"mid","due":"2026-09-14"}}'::jsonb, 'pending'),
('f11e0000-0000-4000-8000-000000000005', 'b11e0000-0000-4000-8000-000000000051', 'c11e0000-0000-4000-8000-000000000503', 'a11e0000-0000-4000-8000-000000000001', 'update', '{"values":{"title":"Экспорт PDF","priority":"mid","notes":"Сначала таблица, потом карточки"}}'::jsonb, 'pending')
on conflict (id) do update set payload = excluded.payload, status = excluded.status;

-- === CHUNK friendships ===
insert into public.friendships (id, requester_id, addressee_id, status, responded_at)
select v.id, v.requester_id, v.addressee_id, v.status, v.responded_at
from (values
('aa2e0000-0000-4000-8000-000000000001'::uuid, 'a11e0000-0000-4000-8000-000000000001'::uuid, 'a11e0000-0000-4000-8000-000000000002'::uuid, 'accepted', now()),
('aa2e0000-0000-4000-8000-000000000002'::uuid, 'a11e0000-0000-4000-8000-000000000001'::uuid, 'a11e0000-0000-4000-8000-000000000003'::uuid, 'accepted', now()),
('aa2e0000-0000-4000-8000-000000000003'::uuid, 'a11e0000-0000-4000-8000-000000000001'::uuid, '6c1d42f0-3128-4ea9-bbeb-161f6cd98ba0'::uuid, 'pending', null::timestamptz),
('aa2e0000-0000-4000-8000-000000000004'::uuid, 'a11e0000-0000-4000-8000-000000000002'::uuid, 'a11e0000-0000-4000-8000-000000000003'::uuid, 'accepted', now()),
('aa2e0000-0000-4000-8000-000000000005'::uuid, 'a11e0000-0000-4000-8000-000000000004'::uuid, 'a11e0000-0000-4000-8000-000000000002'::uuid, 'accepted', now()),
('aa2e0000-0000-4000-8000-000000000006'::uuid, 'a11e0000-0000-4000-8000-000000000004'::uuid, 'a11e0000-0000-4000-8000-000000000001'::uuid, 'accepted', now()),
('aa2e0000-0000-4000-8000-000000000007'::uuid, 'a11e0000-0000-4000-8000-000000000004'::uuid, 'a11e0000-0000-4000-8000-000000000003'::uuid, 'accepted', now())
) as v(id, requester_id, addressee_id, status, responded_at)
where not exists (
  select 1 from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(v.requester_id, v.addressee_id)
    and greatest(f.requester_id, f.addressee_id) = greatest(v.requester_id, v.addressee_id)
);

-- === CHUNK automations ===
insert into public.list_automations (id, list_id, name, enabled, trigger, actions)
values
('aa1e0000-0000-4000-8000-000000000001', 'b11e0000-0000-4000-8000-000000000021', 'Дата при галочке', true, '{"type":"checked"}'::jsonb, '[{"type":"set_now","fieldId":"bought_at"}]'::jsonb),
('aa1e0000-0000-4000-8000-000000000002', 'b11e0000-0000-4000-8000-000000000041', 'Дата выполнения', true, '{"type":"checked"}'::jsonb, '[{"type":"set_now","fieldId":"done_at"}]'::jsonb),
('aa1e0000-0000-4000-8000-000000000003', 'b11e0000-0000-4000-8000-000000000067', 'Закрыли задачу', true, '{"type":"checked"}'::jsonb, '[{"type":"set_now","fieldId":"done_at"}]'::jsonb),
('aa1e0000-0000-4000-8000-000000000004', 'b11e0000-0000-4000-8000-000000000062', 'Готово → закрыто', true, '{"type":"field_equals","fieldId":"status","value":"done"}'::jsonb, '[{"type":"set_field","fieldId":"notes","value":"Закрыто в спринте"}]'::jsonb)
on conflict (id) do update set name = excluded.name, trigger = excluded.trigger, actions = excluded.actions, enabled = true;

-- === CHUNK subscriptions ===
insert into public.list_subscriptions (list_id, user_id)
values
('b11e0000-0000-4000-8000-000000000012', 'a11e0000-0000-4000-8000-000000000002'),
('b11e0000-0000-4000-8000-000000000012', 'a11e0000-0000-4000-8000-000000000003'),
('b11e0000-0000-4000-8000-000000000031', 'a11e0000-0000-4000-8000-000000000001'),
('b11e0000-0000-4000-8000-000000000062', 'a11e0000-0000-4000-8000-000000000001'),
('b11e0000-0000-4000-8000-000000000062', 'a11e0000-0000-4000-8000-000000000003'),
('b11e0000-0000-4000-8000-000000000067', 'a11e0000-0000-4000-8000-000000000001'),
('b11e0000-0000-4000-8000-000000000067', 'a11e0000-0000-4000-8000-000000000002'),
('b11e0000-0000-4000-8000-000000000068', 'a11e0000-0000-4000-8000-000000000004')
on conflict (list_id, user_id) do nothing;

-- === CHUNK activity ===
insert into public.activity_events (id, list_id, item_id, actor_id, event_type, payload, created_at)
values
  ('aa3e0000-0000-4000-8000-000000000001', 'b11e0000-0000-4000-8000-000000000012', 'c11e0000-0000-4000-8000-000000000115', 'a11e0000-0000-4000-8000-000000000002', 'item_created', '{"values":{"title":"Интерстеллар"}}'::jsonb, '2025-08-14T18:00:00Z'),
  ('aa3e0000-0000-4000-8000-000000000002', 'b11e0000-0000-4000-8000-000000000012', 'c11e0000-0000-4000-8000-000000000111', 'a11e0000-0000-4000-8000-000000000003', 'item_updated', '{"values":{"title":"Оппенгеймер"}}'::jsonb, '2025-11-03T12:00:00Z'),
  ('aa3e0000-0000-4000-8000-000000000003', 'b11e0000-0000-4000-8000-000000000062', 'c11e0000-0000-4000-8000-000000000623', 'a11e0000-0000-4000-8000-000000000003', 'item_checked', '{"values":{"title":"Тексты шаблонов EN"}}'::jsonb, '2026-09-04T16:20:00Z'),
  ('aa3e0000-0000-4000-8000-000000000004', 'b11e0000-0000-4000-8000-000000000021', 'c11e0000-0000-4000-8000-000000000202', 'a11e0000-0000-4000-8000-000000000002', 'item_checked', '{"values":{"name":"Хлеб"}}'::jsonb, '2026-09-04T10:00:00Z'),
  ('aa3e0000-0000-4000-8000-000000000005', 'b11e0000-0000-4000-8000-000000000031', 'c11e0000-0000-4000-8000-000000000304', 'a11e0000-0000-4000-8000-000000000001', 'item_created', '{"values":{"title":"Hades II"}}'::jsonb, '2026-03-02T21:00:00Z'),
  ('aa3e0000-0000-4000-8000-000000000006', 'b11e0000-0000-4000-8000-000000000067', 'c11e0000-0000-4000-8000-000000000725', '6c1d42f0-3128-4ea9-bbeb-161f6cd98ba0', 'item_checked', '{"values":{"title":"Проверка RLS на графиках"}}'::jsonb, '2026-09-05T09:30:00Z'),
  ('aa3e0000-0000-4000-8000-000000000007', 'b11e0000-0000-4000-8000-000000000068', 'c11e0000-0000-4000-8000-000000000741', 'a11e0000-0000-4000-8000-000000000004', 'item_created', '{"values":{"title":"Паста-вечер"}}'::jsonb, '2026-09-06T19:00:00Z'),
  ('aa3e0000-0000-4000-8000-000000000008', 'b11e0000-0000-4000-8000-000000000064', 'c11e0000-0000-4000-8000-000000000661', 'a11e0000-0000-4000-8000-000000000001', 'item_updated', '{"values":{"title":"Кофейня на углу"}}'::jsonb, '2026-08-12T11:15:00Z')
on conflict (id) do nothing;
