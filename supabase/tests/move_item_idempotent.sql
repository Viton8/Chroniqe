-- Regression checks for issue #11.
-- Overlapping move_item calls must not duplicate the target row, ratings, or comments.
-- A later call after the source was deleted returns the existing target id.
--
-- Requires migrations plus supabase/tests/harness.sql. The runner is
-- supabase/tests/run-move-item-idempotent.sh.

\set ON_ERROR_STOP on

\set owner '11111111-1111-4111-8111-111111111111'
\set other '22222222-2222-4222-8222-222222222222'
\set source_list 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
\set target_list 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
\set other_list 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
\set item_a 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
\set item_b 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
\set item_c 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3'
\set comment_a 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'

BEGIN;

CREATE FUNCTION public._test_assert(p_ok boolean, p_msg text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(p_ok, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'assertion failed: %', p_msg;
  END IF;
END;
$$;

CREATE FUNCTION public._test_expect_error(p_sql text, p_like text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
    RAISE EXCEPTION 'assertion failed: expected error like "%"', p_like;
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'assertion failed:%' THEN
        RAISE;
      END IF;
      IF SQLERRM NOT LIKE p_like THEN
        RAISE EXCEPTION 'assertion failed: error "%" did not match "%"', SQLERRM, p_like;
      END IF;
  END;
END;
$$;

CREATE FUNCTION public._test_auth_as(p_uid uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_uid::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_uid, 'role', 'authenticated')::text,
    true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public._test_assert(boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public._test_expect_error(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public._test_auth_as(uuid) TO authenticated;

SELECT public._test_assert(
  has_function_privilege('authenticated', 'public.move_item(uuid, uuid, jsonb, boolean)', 'EXECUTE'),
  'authenticated cannot call move_item'
);

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (:'owner', 'owner-move@example.com', '{"username":"ownermove","display_name":"Owner"}'),
  (:'other', 'other-move@example.com', '{"username":"othermove","display_name":"Other"}');

INSERT INTO public.lists (id, owner_id, title, visibility, edit_mode)
VALUES
  (:'source_list', :'owner', 'Inbox', 'private', 'owner'),
  (:'target_list', :'owner', 'Archive', 'private', 'owner'),
  (:'other_list', :'other', 'Someone else', 'private', 'owner');

INSERT INTO public.items (
  id, list_id, values, position, is_checked, checked_at, check_snapshot, created_by, updated_by
)
VALUES
  (
    :'item_a',
    :'source_list',
    '{"title":"Ship it","status":"open"}'::jsonb,
    1,
    true,
    '2026-09-01T12:00:00Z',
    '{"title":"Ship it"}'::jsonb,
    :'owner',
    :'owner'
  ),
  (
    :'item_b',
    :'source_list',
    '{"title":"Keep me","status":"open"}'::jsonb,
    2,
    false,
    NULL,
    NULL,
    :'owner',
    :'owner'
  ),
  (
    :'item_c',
    :'source_list',
    '{"title":"Mapped","from":"alpha"}'::jsonb,
    3,
    false,
    NULL,
    NULL,
    :'owner',
    :'owner'
  );

INSERT INTO public.item_ratings (item_id, field_id, user_id, value)
VALUES (:'item_a', 'stars', :'owner', 8);

INSERT INTO public.item_comments (id, item_id, user_id, body, color, show_author, show_time)
VALUES (:'comment_a', :'item_a', :'owner', 'Nice one', 'violet', true, true);

SET LOCAL ROLE authenticated;
SELECT public._test_auth_as(:'owner'::uuid);

-- Legitimate move copies values, check state, ratings, and comments, then
-- deletes the source.
CREATE TEMP TABLE _moved AS
SELECT public.move_item(:'item_a'::uuid, :'target_list'::uuid) AS new_id;

SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.items WHERE id = :'item_a'::uuid),
  'source item should be deleted after a move'
);
SELECT public._test_assert(
  (SELECT count(*) FROM public.items WHERE list_id = :'target_list'::uuid) = 1,
  'target should have exactly one item after the first move'
);
SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM public.items i
    JOIN _moved m ON m.new_id = i.id
    WHERE i.list_id = :'target_list'::uuid
      AND i.values ->> 'title' = 'Ship it'
      AND i.is_checked
      AND i.check_snapshot ->> 'title' = 'Ship it'
  ),
  'moved item did not keep values and check state'
);
SELECT public._test_assert(
  (SELECT count(*) FROM public.item_ratings r JOIN _moved m ON m.new_id = r.item_id) = 1,
  'ratings were not copied once'
);
SELECT public._test_assert(
  (SELECT count(*) FROM public.item_comments c JOIN _moved m ON m.new_id = c.item_id) = 1,
  'comments were not copied once'
);
SELECT public._test_assert(
  (SELECT count(*) FROM public.activity_events WHERE event_type = 'item_moved' AND payload ->> 'source_item_id' = :'item_a') = 1,
  'expected one item_moved event for the source'
);

-- Second call (the double-click) returns the same target id and does not
-- insert another copy, rating, comment, or activity row.
SELECT public._test_assert(
  public.move_item(:'item_a'::uuid, :'target_list'::uuid) = (SELECT new_id FROM _moved),
  'repeat move_item did not return the existing target id'
);
SELECT public._test_assert(
  (SELECT count(*) FROM public.items WHERE list_id = :'target_list'::uuid) = 1,
  'repeat move duplicated the target item'
);
SELECT public._test_assert(
  (SELECT count(*) FROM public.item_ratings r JOIN _moved m ON m.new_id = r.item_id) = 1,
  'repeat move duplicated ratings'
);
SELECT public._test_assert(
  (SELECT count(*) FROM public.item_comments c JOIN _moved m ON m.new_id = c.item_id) = 1,
  'repeat move duplicated comments'
);
SELECT public._test_assert(
  (SELECT count(*) FROM public.activity_events WHERE event_type = 'item_moved' AND payload ->> 'source_item_id' = :'item_a') = 1,
  'repeat move inserted another item_moved event'
);

-- A repeat aimed at a different list cannot invent a second copy.
SELECT public._test_expect_error(
  format('SELECT public.move_item(%L::uuid, %L::uuid)', :'item_a', :'other_list'),
  '%item not found%'
);

-- Copy without deleting the source still works, and a later copy is a new row.
CREATE TEMP TABLE _copied AS
SELECT public.move_item(
  :'item_b'::uuid,
  :'target_list'::uuid,
  '{}'::jsonb,
  false
) AS new_id;

SELECT public._test_assert(
  EXISTS (SELECT 1 FROM public.items WHERE id = :'item_b'::uuid),
  'copy deleted the source'
);
SELECT public._test_assert(
  (SELECT count(*) FROM public.items WHERE list_id = :'target_list'::uuid) = 2,
  'copy did not add a target row'
);

CREATE TEMP TABLE _copied_again AS
SELECT public.move_item(
  :'item_b'::uuid,
  :'target_list'::uuid,
  '{}'::jsonb,
  false
) AS new_id;

SELECT public._test_assert(
  (SELECT new_id FROM _copied_again) <> (SELECT new_id FROM _copied),
  'a later copy should create a new item'
);
SELECT public._test_assert(
  EXISTS (SELECT 1 FROM public.items WHERE id = :'item_b'::uuid),
  'second copy deleted the source'
);

-- Field map remaps keys onto the target schema.
CREATE TEMP TABLE _mapped AS
SELECT public.move_item(
  :'item_c'::uuid,
  :'target_list'::uuid,
  '{"from":"to"}'::jsonb,
  true
) AS new_id;

SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM public.items i
    JOIN _mapped m ON m.new_id = i.id
    WHERE i.values ->> 'to' = 'alpha'
      AND NOT i.values ? 'from'
  ),
  'field map did not remap values'
);
SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.items WHERE id = :'item_c'::uuid),
  'mapped move left the source'
);

-- Another user cannot move someone else's item.
SELECT public._test_auth_as(:'other'::uuid);
SELECT public._test_expect_error(
  format('SELECT public.move_item(%L::uuid, %L::uuid)', :'item_b', :'other_list'),
  '%cannot edit source list%'
);

SELECT public._test_auth_as(:'owner'::uuid);
SELECT public._test_expect_error(
  format('SELECT public.move_item(%L::uuid, %L::uuid)', :'item_b', :'other_list'),
  '%cannot edit target list%'
);

RESET ROLE;

COMMIT;
