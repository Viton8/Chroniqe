-- Demo users and sample lists for Chroniqe.
-- Applied on the remote project; safe to re-run (idempotent on fixed UUIDs).
-- Demo password for *@chroniqe.test accounts: Demo1234!

-- Users / identities are created separately via Auth inserts.
-- This file holds lists, items, ratings, charts, memberships.

insert into public.lists (
  id, owner_id, title, description, icon, template_key,
  schema, view_config, settings, visibility, edit_mode
)
values
-- Anna: cinema pack
(
  'b11e0000-0000-4000-8000-000000000011',
  'a11e0000-0000-4000-8000-000000000001',
  'К просмотру',
  'Очередь на выходные. Друзья могут предлагать тайтлы.',
  '🍿',
  'movies_watchlist',
  '{"fields":[{"id":"title","key":"title","name":"Название","type":"text","required":true,"config":{"maxLength":200}},{"id":"year","key":"year","name":"Год","type":"integer","config":{"min":1888,"max":2100}},{"id":"kind","key":"kind","name":"Тип","type":"select","config":{"options":[{"value":"movie","label":"Фильм"},{"value":"series","label":"Сериал"},{"value":"anime","label":"Аниме"},{"value":"doc","label":"Документальный"}]}},{"id":"poster","key":"poster","name":"Постер","type":"image","config":{"maxSizeMb":2}},{"id":"priority","key":"priority","name":"Приоритет","type":"select","config":{"options":[{"value":"now","label":"Срочно","color":"#be123c"},{"value":"soon","label":"Скоро","color":"#b45309"},{"value":"someday","label":"Когда-нибудь","color":"#6e6578"}]}},{"id":"note","key":"note","name":"Заметка","type":"textarea","config":{"maxLength":500}}],"titleFieldId":"title","imageFieldId":"poster","groupFieldId":"priority"}'::jsonb,
  '{"mode":"cards","imageFieldId":"poster","groupFieldId":"priority"}'::jsonb,
  '{"transferActions":[{"id":"t-watched","label":"Просмотрено","targetListId":"b11e0000-0000-4000-8000-000000000012","fieldMap":{"title":"title","year":"year","kind":"kind","poster":"poster"},"deleteSource":true,"setFields":{"watched_at":"today"}},{"id":"t-dropped","label":"Не буду смотреть","targetListId":"b11e0000-0000-4000-8000-000000000013","fieldMap":{"title":"title","year":"year","kind":"kind"},"deleteSource":true}]}'::jsonb,
  'friends',
  'friends'
),
(
  'b11e0000-0000-4000-8000-000000000012',
  'a11e0000-0000-4000-8000-000000000001',
  'Просмотрено',
  'Фильмы и сериалы, которые уже посмотрели. Оценки можно ставить всем.',
  '🎬',
  'movies_watched',
  '{"fields":[{"id":"title","key":"title","name":"Название","type":"text","required":true,"config":{"maxLength":200}},{"id":"year","key":"year","name":"Год","type":"integer","config":{"min":1888,"max":2100}},{"id":"kind","key":"kind","name":"Тип","type":"select","config":{"options":[{"value":"movie","label":"Фильм"},{"value":"series","label":"Сериал"},{"value":"anime","label":"Аниме"},{"value":"doc","label":"Документальный"}]}},{"id":"poster","key":"poster","name":"Постер","type":"image","config":{"maxSizeMb":2}},{"id":"watched_at","key":"watched_at","name":"Дата просмотра","type":"date"},{"id":"ratings","key":"ratings","name":"Оценки","type":"multi_rating","config":{"min":1,"max":10,"ratingMax":10}},{"id":"review","key":"review","name":"Отзыв","type":"textarea","config":{"maxLength":2000}}],"titleFieldId":"title","imageFieldId":"poster","dateFieldId":"watched_at"}'::jsonb,
  '{"mode":"table","dateFieldId":"watched_at","imageFieldId":"poster"}'::jsonb,
  '{}'::jsonb,
  'public',
  'proposals'
),
(
  'b11e0000-0000-4000-8000-000000000013',
  'a11e0000-0000-4000-8000-000000000001',
  'Не буду смотреть',
  'Отложенные и отвергнутые тайтлы.',
  '🚫',
  'movies_dropped',
  '{"fields":[{"id":"title","key":"title","name":"Название","type":"text","required":true,"config":{"maxLength":200}},{"id":"year","key":"year","name":"Год","type":"integer","config":{"min":1888,"max":2100}},{"id":"kind","key":"kind","name":"Тип","type":"select","config":{"options":[{"value":"movie","label":"Фильм"},{"value":"series","label":"Сериал"},{"value":"anime","label":"Аниме"},{"value":"doc","label":"Документальный"}]}},{"id":"reason","key":"reason","name":"Причина","type":"textarea","config":{"maxLength":500}},{"id":"decided_at","key":"decided_at","name":"Дата","type":"date"}],"titleFieldId":"title","dateFieldId":"decided_at"}'::jsonb,
  '{"mode":"table"}'::jsonb,
  '{}'::jsonb,
  'private',
  'owner'
),
-- Kirill: groceries
(
  'b11e0000-0000-4000-8000-000000000021',
  'a11e0000-0000-4000-8000-000000000002',
  'Покупки',
  'Текущий список. Можно вычёркивать.',
  '🛒',
  'shopping',
  '{"fields":[{"id":"name","key":"name","name":"Позиция","type":"text","required":true,"config":{"maxLength":120}},{"id":"qty","key":"qty","name":"Количество","type":"number","config":{"min":0,"max":9999}},{"id":"category","key":"category","name":"Категория","type":"select","config":{"options":[{"value":"food","label":"Еда"},{"value":"home","label":"Дом"},{"value":"tech","label":"Техника"},{"value":"other","label":"Другое"}]}},{"id":"note","key":"note","name":"Заметка","type":"text","config":{"maxLength":200}}],"titleFieldId":"name","groupFieldId":"category"}'::jsonb,
  '{"mode":"compact","groupFieldId":"category"}'::jsonb,
  '{"enableCheck":true,"checkLabel":"Куплено","transferActions":[{"id":"t-bought","label":"Куплено","targetListId":"b11e0000-0000-4000-8000-000000000022","fieldMap":{"name":"name","qty":"qty","category":"category"},"deleteSource":true},{"id":"t-later","label":"К Новому году","targetListId":"b11e0000-0000-4000-8000-000000000023","fieldMap":{"name":"name","qty":"qty"},"deleteSource":true}]}'::jsonb,
  'friends',
  'friends'
),
(
  'b11e0000-0000-4000-8000-000000000022',
  'a11e0000-0000-4000-8000-000000000002',
  'Куплено',
  'История покупок с датой и ценой.',
  '📦',
  'bought',
  '{"fields":[{"id":"name","key":"name","name":"Позиция","type":"text","required":true,"config":{"maxLength":120}},{"id":"qty","key":"qty","name":"Количество","type":"number","config":{"min":0}},{"id":"bought_at","key":"bought_at","name":"Дата","type":"date"},{"id":"price","key":"price","name":"Цена","type":"number","config":{"min":0}},{"id":"category","key":"category","name":"Категория","type":"select","config":{"options":[{"value":"food","label":"Еда"},{"value":"home","label":"Дом"},{"value":"tech","label":"Техника"},{"value":"other","label":"Другое"}]}}],"titleFieldId":"name","dateFieldId":"bought_at"}'::jsonb,
  '{"mode":"table"}'::jsonb,
  '{}'::jsonb,
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
  '{"mode":"compact"}'::jsonb,
  '{}'::jsonb,
  'private',
  'owner'
),
-- Lena: games, books, todo
(
  'b11e0000-0000-4000-8000-000000000031',
  'a11e0000-0000-4000-8000-000000000003',
  'Пройденные игры',
  'Каталог пройденного с платформой и часами.',
  '🎮',
  'games_done',
  '{"fields":[{"id":"title","key":"title","name":"Название","type":"text","required":true,"config":{"maxLength":200}},{"id":"platform","key":"platform","name":"Платформа","type":"select","config":{"options":[{"value":"pc","label":"PC"},{"value":"ps","label":"PlayStation"},{"value":"xbox","label":"Xbox"},{"value":"switch","label":"Switch"},{"value":"mobile","label":"Телефон"},{"value":"other","label":"Другое"}]}},{"id":"cover","key":"cover","name":"Обложка","type":"image","config":{"maxSizeMb":2}},{"id":"finished_at","key":"finished_at","name":"Пройдено","type":"date"},{"id":"hours","key":"hours","name":"Часы","type":"number","config":{"min":0,"max":10000}},{"id":"ratings","key":"ratings","name":"Оценки","type":"multi_rating","config":{"ratingMax":10,"min":1,"max":10}},{"id":"status","key":"status","name":"Статус","type":"select","config":{"options":[{"value":"completed","label":"Пройдено"},{"value":"main","label":"Сюжет"},{"value":"hundred","label":"100%"},{"value":"dropped","label":"Брошено"}]}},{"id":"note","key":"note","name":"Заметка","type":"textarea","config":{"maxLength":1000}}],"titleFieldId":"title","imageFieldId":"cover","dateFieldId":"finished_at","groupFieldId":"platform"}'::jsonb,
  '{"mode":"gallery","imageFieldId":"cover","dateFieldId":"finished_at"}'::jsonb,
  '{}'::jsonb,
  'public',
  'proposals'
),
(
  'b11e0000-0000-4000-8000-000000000032',
  'a11e0000-0000-4000-8000-000000000003',
  'Книги',
  'Читаю и отмечаю прочитанное.',
  '📚',
  'books',
  '{"fields":[{"id":"title","key":"title","name":"Название","type":"text","required":true,"config":{"maxLength":200}},{"id":"author","key":"author","name":"Автор","type":"text","config":{"maxLength":120}},{"id":"finished_at","key":"finished_at","name":"Прочитано","type":"date"},{"id":"ratings","key":"ratings","name":"Оценки","type":"multi_rating","config":{"ratingMax":10}},{"id":"status","key":"status","name":"Статус","type":"select","config":{"options":[{"value":"want","label":"Хочу"},{"value":"reading","label":"Читаю"},{"value":"done","label":"Прочитано"},{"value":"dropped","label":"Брошено"}]}},{"id":"note","key":"note","name":"Заметка","type":"textarea","config":{"maxLength":2000}}],"titleFieldId":"title","dateFieldId":"finished_at","groupFieldId":"status"}'::jsonb,
  '{"mode":"board","groupFieldId":"status"}'::jsonb,
  '{}'::jsonb,
  'friends',
  'friends'
),
(
  'b11e0000-0000-4000-8000-000000000033',
  'a11e0000-0000-4000-8000-000000000003',
  'Дела на неделю',
  'Личные задачи.',
  '✅',
  'todo',
  '{"fields":[{"id":"title","key":"title","name":"Задача","type":"text","required":true,"config":{"maxLength":200}},{"id":"due","key":"due","name":"Срок","type":"date"},{"id":"priority","key":"priority","name":"Приоритет","type":"select","config":{"options":[{"value":"high","label":"Высокий","color":"#be123c"},{"value":"mid","label":"Средний","color":"#b45309"},{"value":"low","label":"Низкий","color":"#0f766e"}]}},{"id":"done_at","key":"done_at","name":"Выполнено","type":"date","hidden":true},{"id":"notes","key":"notes","name":"Заметки","type":"textarea","config":{"maxLength":1000}}],"titleFieldId":"title","dateFieldId":"due","groupFieldId":"priority"}'::jsonb,
  '{"mode":"compact","groupFieldId":"priority"}'::jsonb,
  '{"enableCheck":true,"checkLabel":"Готово","onCheck":[{"type":"set_now","fieldId":"done_at"}]}'::jsonb,
  'private',
  'owner'
),
-- Oleg: todos, recipes, vinyl
(
  'b11e0000-0000-4000-8000-000000000041',
  'a11e0000-0000-4000-8000-000000000004',
  'Дела',
  'Рабочие и домашние задачи.',
  '✅',
  'todo',
  '{"fields":[{"id":"title","key":"title","name":"Задача","type":"text","required":true,"config":{"maxLength":200}},{"id":"due","key":"due","name":"Срок","type":"date"},{"id":"priority","key":"priority","name":"Приоритет","type":"select","config":{"options":[{"value":"high","label":"Высокий","color":"#be123c"},{"value":"mid","label":"Средний","color":"#b45309"},{"value":"low","label":"Низкий","color":"#0f766e"}]}},{"id":"done_at","key":"done_at","name":"Выполнено","type":"date","hidden":true},{"id":"notes","key":"notes","name":"Заметки","type":"textarea","config":{"maxLength":1000}}],"titleFieldId":"title","dateFieldId":"due","groupFieldId":"priority"}'::jsonb,
  '{"mode":"compact","groupFieldId":"priority"}'::jsonb,
  '{"enableCheck":true,"checkLabel":"Готово"}'::jsonb,
  'public',
  'owner'
),
(
  'b11e0000-0000-4000-8000-000000000042',
  'a11e0000-0000-4000-8000-000000000004',
  'Рецепты',
  'Блюда, которые хочется повторить.',
  '🍝',
  'blank',
  '{"fields":[{"id":"title","key":"title","name":"Название","type":"text","required":true,"config":{"maxLength":200}},{"id":"time","key":"time","name":"Минуты","type":"integer","config":{"min":1,"max":600}},{"id":"tag","key":"tag","name":"Тип","type":"select","config":{"options":[{"value":"soup","label":"Суп"},{"value":"main","label":"Основное"},{"value":"dessert","label":"Десерт"}]}}],"titleFieldId":"title","groupFieldId":"tag"}'::jsonb,
  '{"mode":"cards","groupFieldId":"tag"}'::jsonb,
  '{}'::jsonb,
  'public',
  'owner'
),
(
  'b11e0000-0000-4000-8000-000000000043',
  'a11e0000-0000-4000-8000-000000000004',
  'Винил',
  'Пластинки: исполнитель, год, состояние.',
  '💿',
  'blank',
  '{"fields":[{"id":"title","key":"title","name":"Альбом","type":"text","required":true,"config":{"maxLength":200}},{"id":"artist","key":"artist","name":"Исполнитель","type":"text","config":{"maxLength":120}},{"id":"year","key":"year","name":"Год","type":"integer","config":{"min":1900,"max":2100}},{"id":"cond","key":"cond","name":"Состояние","type":"select","config":{"options":[{"value":"mint","label":"Mint"},{"value":"vg","label":"VG+"},{"value":"g","label":"G"}]}}],"titleFieldId":"title"}'::jsonb,
  '{"mode":"table"}'::jsonb,
  '{}'::jsonb,
  'friends',
  'owner'
),
-- Existing account: a couple of lists so the home screen is not empty
(
  'b11e0000-0000-4000-8000-000000000051',
  '6c1d42f0-3128-4ea9-bbeb-161f6cd98ba0',
  'Идеи для Chroniqe',
  'Публичный бэклог фич и заметок.',
  '✨',
  'todo',
  '{"fields":[{"id":"title","key":"title","name":"Задача","type":"text","required":true,"config":{"maxLength":200}},{"id":"due","key":"due","name":"Срок","type":"date"},{"id":"priority","key":"priority","name":"Приоритет","type":"select","config":{"options":[{"value":"high","label":"Высокий","color":"#be123c"},{"value":"mid","label":"Средний","color":"#b45309"},{"value":"low","label":"Низкий","color":"#0f766e"}]}},{"id":"notes","key":"notes","name":"Заметки","type":"textarea","config":{"maxLength":1000}}],"titleFieldId":"title","groupFieldId":"priority"}'::jsonb,
  '{"mode":"compact","groupFieldId":"priority"}'::jsonb,
  '{"enableCheck":true,"checkLabel":"Готово"}'::jsonb,
  'public',
  'owner'
)
on conflict (id) do nothing;
