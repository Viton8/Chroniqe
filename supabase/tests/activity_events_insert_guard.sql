-- Regression checks for issue #8.
-- Viewers must not insert activity_events. friend_feed must survive a
-- non-uuid payload->>'target_list_id'. Item triggers and move_item still write.
--
-- Requires migrations plus supabase/tests/harness.sql (auth.uid reads the JWT
-- sub claim). The runner is supabase/tests/run-activity-events-insert-guard.sh.

\set ON_ERROR_STOP on

\set alice '11111111-1111-4111-8111-111111111111'
\set bob '22222222-2222-4222-8222-222222222222'
\set source_list 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
\set target_list 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
\set item 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'
\set poison 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1'
\set friendship 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1'

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

CREATE FUNCTION public._test_expect_denied(p_sql text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
    RAISE EXCEPTION 'assertion failed: expected insert to be denied';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'assertion failed:%' THEN
        RAISE;
      END IF;
      IF SQLERRM NOT LIKE '%row-level security%'
         AND SQLERRM NOT LIKE '%permission denied%' THEN
        RAISE EXCEPTION 'assertion failed: error "%" was not an access denial', SQLERRM;
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
GRANT EXECUTE ON FUNCTION public._test_expect_denied(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public._test_auth_as(uuid) TO authenticated;

SELECT public._test_assert(
  NOT has_table_privilege('authenticated', 'public.activity_events', 'INSERT'),
  'authenticated still has INSERT on activity_events'
);
SELECT public._test_assert(
  NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'activity_events'
      AND policyname = 'activity_events_insert'
      AND cmd = 'INSERT'
      AND permissive = 'PERMISSIVE'
  ),
  'permissive activity_events_insert policy is still present'
);
SELECT public._test_assert(
  (SELECT private.uuid_if_valid('not-a-uuid')) IS NULL,
  'uuid_if_valid accepted a non-uuid'
);
SELECT public._test_assert(
  (SELECT private.uuid_if_valid('------------------------------------')) IS NULL,
  'uuid_if_valid accepted 36 hyphens'
);
SELECT public._test_assert(
  (SELECT private.uuid_if_valid(:'target_list')) = :'target_list'::uuid,
  'uuid_if_valid rejected a real uuid'
);

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (:'alice', 'alice@example.com', '{"username":"alice","display_name":"Alice"}'),
  (:'bob', 'bob@example.com', '{"username":"bob","display_name":"Bob"}');

INSERT INTO public.lists (id, owner_id, title, visibility, edit_mode)
VALUES
  (:'source_list', :'alice', 'Source', 'public', 'owner'),
  (:'target_list', :'alice', 'Target', 'public', 'owner');

INSERT INTO public.friendships (id, requester_id, addressee_id, status, responded_at)
VALUES (:'friendship', :'alice', :'bob', 'accepted', now());

SET LOCAL ROLE authenticated;
SELECT public._test_auth_as(:'bob'::uuid);

SELECT public._test_expect_denied(
  format(
    $sql$
      INSERT INTO public.activity_events (list_id, actor_id, event_type, payload)
      VALUES (%L, %L, 'item_created', jsonb_build_object('values', jsonb_build_object('title', 'forged')))
    $sql$,
    :'source_list',
    :'bob'
  )
);

SELECT public._test_expect_denied(
  format(
    $sql$
      INSERT INTO public.activity_events (list_id, actor_id, event_type, payload)
      VALUES (%L, %L, 'item_moved', jsonb_build_object('target_list_id', 'not-a-uuid'))
    $sql$,
    :'source_list',
    :'bob'
  )
);

SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.activity_events WHERE actor_id = :'bob'::uuid),
  'viewer insert into activity_events succeeded'
);

SELECT public._test_auth_as(:'alice'::uuid);

INSERT INTO public.items (id, list_id, values, position, created_by, updated_by)
VALUES (
  :'item',
  :'source_list',
  jsonb_build_object('title', 'Real item'),
  1,
  :'alice',
  :'alice'
);

SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM public.activity_events
    WHERE item_id = :'item'::uuid
      AND actor_id = :'alice'::uuid
      AND event_type = 'item_created'
  ),
  'item insert did not write activity via the trigger'
);

SELECT public.move_item(:'item'::uuid, :'target_list'::uuid, '{}'::jsonb, true);

SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM public.activity_events
    WHERE actor_id = :'alice'::uuid
      AND event_type = 'item_moved'
      AND payload ->> 'target_list_id' = :'target_list'
  ),
  'move_item did not write a legitimate item_moved event'
);

SELECT public._test_auth_as(:'bob'::uuid);

SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM public.friend_feed(60)
    WHERE actor_id = :'alice'::uuid
      AND event_type = 'item_created'
  ),
  'friend_feed missed a legitimate item_created event'
);
SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM public.friend_feed(60)
    WHERE actor_id = :'alice'::uuid
      AND event_type = 'item_moved'
      AND target_list_id = :'target_list'::uuid
      AND target_list_title = 'Target'
  ),
  'friend_feed missed a legitimate item_moved target list'
);

RESET ROLE;

INSERT INTO public.activity_events (id, list_id, actor_id, event_type, payload)
VALUES (
  :'poison',
  :'source_list',
  :'alice',
  'item_moved',
  jsonb_build_object('target_list_id', 'not-a-uuid', 'values', jsonb_build_object('title', 'poison'))
);

SET LOCAL ROLE authenticated;
SELECT public._test_auth_as(:'bob'::uuid);

SELECT public._test_assert(
  (
    SELECT count(*) FILTER (WHERE id = :'poison'::uuid)
    FROM public.friend_feed(60)
  ) = 1,
  'friend_feed dropped or crashed on a non-uuid target_list_id'
);
SELECT public._test_assert(
  (
    SELECT target_list_id
    FROM public.friend_feed(60)
    WHERE id = :'poison'::uuid
  ) IS NULL,
  'poisoned target_list_id was still joined as a list'
);

RESET ROLE;
ROLLBACK;
