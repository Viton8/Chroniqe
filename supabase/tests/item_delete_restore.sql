-- Regression checks for issue #10.
-- Delete must not cascade ratings/comments/proposals, undo must restore the
-- original item id, and a bulk delete must roll back as one transaction.
--
-- Requires migrations plus supabase/tests/harness.sql (auth.uid reads the JWT
-- sub claim). The runner is supabase/tests/run-item-delete-restore.sh.

\set ON_ERROR_STOP on

\set alice '11111111-1111-1111-1111-111111111111'
\set bob '22222222-2222-2222-2222-222222222222'
\set carol '33333333-3333-3333-3333-333333333333'
\set alice_list '44444444-4444-4444-4444-444444444444'
\set bob_list '55555555-5555-5555-5555-555555555555'
\set a1 '66666666-6666-4666-8666-666666666661'
\set a2 '66666666-6666-4666-8666-666666666662'
\set a3 '66666666-6666-4666-8666-666666666663'
\set b1 '77777777-7777-4777-8777-777777777771'
\set note1 '88888888-8888-4888-8888-888888888881'
\set prop1 '99999999-9999-4999-8999-999999999991'
\set missing 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

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
  has_function_privilege('authenticated', 'public.delete_items(uuid[])', 'EXECUTE'),
  'authenticated cannot call delete_items'
);
SELECT public._test_assert(
  has_function_privilege('authenticated', 'public.restore_items(uuid[])', 'EXECUTE'),
  'authenticated cannot call restore_items'
);
SELECT public._test_assert(
  NOT has_function_privilege('anon', 'public.delete_items(uuid[])', 'EXECUTE'),
  'anon can call delete_items'
);
SELECT public._test_assert(
  NOT has_function_privilege('anon', 'public.restore_items(uuid[])', 'EXECUTE'),
  'anon can call restore_items'
);
SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'delete_items'
      AND p.prosecdef
  ),
  'delete_items is not security definer'
);
SELECT public._test_assert(
  NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'items'
      AND policyname = 'items_delete'
      AND cmd = 'DELETE'
      AND permissive = 'PERMISSIVE'
  ),
  'permissive items_delete policy is still present'
);

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (:'alice', 'alice@example.com', '{"display_name":"Alice"}'),
  (:'bob', 'bob@example.com', '{"display_name":"Bob"}'),
  (:'carol', 'carol@example.com', '{"display_name":"Carol"}');

INSERT INTO public.lists (id, owner_id, title, visibility, edit_mode, schema)
VALUES (
  :'alice_list',
  :'alice',
  'Alice list',
  'invite',
  'owner',
  '{"fields":[{"id":"name","type":"text"},{"id":"score","type":"community_rating"}]}'::jsonb
);

INSERT INTO public.lists (id, owner_id, title, visibility, edit_mode)
VALUES (:'bob_list', :'bob', 'Bob list', 'private', 'owner');

INSERT INTO public.list_members (list_id, user_id, role)
VALUES (:'alice_list', :'carol', 'viewer');

INSERT INTO public.items (id, list_id, values, position, created_by, updated_by)
VALUES
  (:'a1', :'alice_list', '{"name":"One"}'::jsonb, 1, :'alice', :'alice'),
  (:'a2', :'alice_list', '{"name":"Two"}'::jsonb, 2, :'alice', :'alice'),
  (:'a3', :'alice_list', '{"name":"Three"}'::jsonb, 3, :'alice', :'alice'),
  (:'b1', :'bob_list', '{"name":"Bob item"}'::jsonb, 1, :'bob', :'bob');

INSERT INTO public.item_ratings (item_id, field_id, user_id, value)
VALUES (:'a1', 'score', :'alice', 8);

INSERT INTO public.item_comments (id, item_id, user_id, body)
VALUES (:'note1', :'a1', :'alice', 'Keep this note');

INSERT INTO public.change_proposals (
  id, list_id, item_id, user_id, action, payload, status
)
VALUES (
  :'prop1',
  :'alice_list',
  :'a1',
  :'carol',
  'update',
  '{"values":{"name":"One*"}}'::jsonb,
  'pending'
);

SET LOCAL ROLE authenticated;
SELECT public._test_auth_as(:'alice'::uuid);

SELECT public.delete_items(ARRAY[:'a1']::uuid[]);

SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.items WHERE id = :'a1'::uuid),
  'deleted item is still visible to the owner'
);
SELECT public._test_assert(
  EXISTS (SELECT 1 FROM public.items WHERE id = :'a2'::uuid),
  'sibling item disappeared after deleting another row'
);
SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.item_ratings WHERE item_id = :'a1'::uuid),
  'ratings for a deleted item are still visible'
);
SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.item_comments WHERE item_id = :'a1'::uuid),
  'comments for a deleted item are still visible'
);

RESET ROLE;

SELECT public._test_assert(
  EXISTS (
    SELECT 1 FROM public.items
    WHERE id = :'a1'::uuid AND deleted_at IS NOT NULL
  ),
  'delete_items hard-deleted the row instead of setting deleted_at'
);
SELECT public._test_assert(
  EXISTS (
    SELECT 1 FROM public.item_ratings
    WHERE item_id = :'a1'::uuid AND field_id = 'score' AND user_id = :'alice'::uuid AND value = 8
  ),
  'rating was cascaded away on delete'
);
SELECT public._test_assert(
  EXISTS (
    SELECT 1 FROM public.item_comments
    WHERE id = :'note1'::uuid AND item_id = :'a1'::uuid AND body = 'Keep this note'
  ),
  'comment was cascaded away on delete'
);
SELECT public._test_assert(
  EXISTS (
    SELECT 1 FROM public.change_proposals
    WHERE id = :'prop1'::uuid AND item_id = :'a1'::uuid AND status = 'pending'
  ),
  'proposal was cascaded away on delete'
);
SELECT public._test_assert(
  EXISTS (
    SELECT 1 FROM public.activity_events
    WHERE item_id = :'a1'::uuid AND event_type = 'item_deleted'
  ),
  'soft-delete did not log item_deleted with the original item id'
);

SET LOCAL ROLE authenticated;
SELECT public._test_auth_as(:'alice'::uuid);

DELETE FROM public.items WHERE id = :'a1'::uuid;
DELETE FROM public.items WHERE id = :'a2'::uuid;
SELECT public._test_expect_error(
  format('UPDATE public.items SET deleted_at = now() WHERE id = %L', :'a2'),
  '%row-level security%'
);

RESET ROLE;
SELECT public._test_assert(
  EXISTS (
    SELECT 1 FROM public.items
    WHERE id = :'a1'::uuid AND deleted_at IS NOT NULL
  ),
  'direct DELETE removed a soft-deleted item'
);
SELECT public._test_assert(
  EXISTS (
    SELECT 1 FROM public.items
    WHERE id = :'a2'::uuid AND deleted_at IS NULL
  ),
  'direct DELETE removed a live item'
);

SET LOCAL ROLE authenticated;
SELECT public._test_auth_as(:'alice'::uuid);

SELECT public._test_expect_error(
  format('SELECT public.delete_items(ARRAY[%L]::uuid[])', :'a1'),
  '%item already deleted%'
);
SELECT public._test_expect_error(
  format('SELECT public.restore_items(ARRAY[%L]::uuid[])', :'a2'),
  '%item is not deleted%'
);

SELECT public._test_auth_as(:'carol'::uuid);

SELECT public._test_expect_error(
  format('SELECT public.delete_items(ARRAY[%L]::uuid[])', :'a2'),
  '%cannot edit%'
);
SELECT public._test_expect_error(
  format('SELECT public.restore_items(ARRAY[%L]::uuid[])', :'a1'),
  '%cannot edit%'
);

SELECT public._test_auth_as(:'alice'::uuid);
SELECT public.restore_items(ARRAY[:'a1']::uuid[]);

SELECT public._test_assert(
  EXISTS (
    SELECT 1 FROM public.items
    WHERE id = :'a1'::uuid AND values->>'name' = 'One' AND deleted_at IS NULL
  ),
  'undo did not restore the original item id'
);
SELECT public._test_assert(
  EXISTS (
    SELECT 1 FROM public.item_ratings
    WHERE item_id = :'a1'::uuid AND field_id = 'score' AND user_id = :'alice'::uuid AND value = 8
  ),
  'undo did not restore the rating on the original item'
);
SELECT public._test_assert(
  EXISTS (
    SELECT 1 FROM public.item_comments
    WHERE id = :'note1'::uuid AND item_id = :'a1'::uuid AND body = 'Keep this note'
  ),
  'undo did not restore the comment on the original item'
);
SELECT public._test_assert(
  EXISTS (
    SELECT 1 FROM public.change_proposals
    WHERE id = :'prop1'::uuid AND item_id = :'a1'::uuid
  ),
  'undo did not keep the proposal on the original item'
);

SELECT public.delete_items(ARRAY[:'a2', :'a3']::uuid[]);

SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.items WHERE id IN (:'a2'::uuid, :'a3'::uuid)),
  'bulk delete left a live row'
);
SELECT public._test_assert(
  EXISTS (SELECT 1 FROM public.items WHERE id = :'a1'::uuid),
  'bulk delete removed an unselected item'
);

SELECT public.restore_items(ARRAY[:'a2', :'a3']::uuid[]);

SELECT public._test_expect_error(
  format(
    'SELECT public.delete_items(ARRAY[%L, %L]::uuid[])',
    :'a2', :'missing'
  ),
  '%item not found%'
);
SELECT public._test_assert(
  EXISTS (SELECT 1 FROM public.items WHERE id = :'a2'::uuid AND deleted_at IS NULL),
  'a missing id in the batch still deleted the other item'
);

SELECT public._test_expect_error(
  format(
    'SELECT public.delete_items(ARRAY[%L, %L]::uuid[])',
    :'a2', :'b1'
  ),
  '%cannot edit%'
);
SELECT public._test_assert(
  EXISTS (SELECT 1 FROM public.items WHERE id = :'a2'::uuid AND deleted_at IS NULL),
  'a forbidden id in the batch still deleted the editable item'
);

RESET ROLE;
SELECT public._test_assert(
  EXISTS (SELECT 1 FROM public.items WHERE id = :'b1'::uuid AND deleted_at IS NULL),
  'a forbidden id in the batch deleted the other owner item'
);

SET LOCAL ROLE authenticated;
SELECT public._test_auth_as(:'alice'::uuid);
SELECT public.delete_items(ARRAY[]::uuid[]);
SELECT public.restore_items(ARRAY[]::uuid[]);
SELECT public._test_assert(
  (SELECT count(*) FROM public.items WHERE list_id = :'alice_list'::uuid AND deleted_at IS NULL) = 3,
  'empty delete/restore changed live item count'
);

RESET ROLE;
SELECT public._test_assert(
  (SELECT count(*) FROM public.item_ratings WHERE item_id = :'a1'::uuid) = 1,
  'rating count changed after undo'
);
SELECT public._test_assert(
  (SELECT count(*) FROM public.item_comments WHERE id = :'note1'::uuid) = 1,
  'comment id was replaced on undo'
);

SELECT 'item_delete_restore ok' AS result;
