-- Regression checks for issue #12.
-- Decline leaves the pair row. Direct insert still hits friendships_pair_key.
-- request_friend deletes the declined row and inserts a new pending request
-- so the current user is the requester (compatible with PR #15, which freezes
-- party ids and rejects declined -> pending updates).
--
-- Requires migrations plus supabase/tests/harness.sql (auth.uid reads the JWT
-- sub claim). The runner is supabase/tests/run-friendship-rerequest.sh.

\set ON_ERROR_STOP on

\set alice '11111111-1111-1111-1111-111111111111'
\set bob '22222222-2222-2222-2222-222222222222'
\set carol '33333333-3333-3333-3333-333333333333'

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

CREATE FUNCTION public._test_auth_clear()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public._test_assert(boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public._test_expect_error(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public._test_auth_as(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public._test_auth_clear() TO authenticated;

SELECT public._test_assert(
  has_function_privilege('authenticated', 'public.request_friend(uuid)', 'EXECUTE'),
  'authenticated cannot call request_friend'
);
SELECT public._test_assert(
  NOT has_function_privilege('anon', 'public.request_friend(uuid)', 'EXECUTE'),
  'anon can call request_friend'
);
SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'request_friend'
      AND p.prosecdef
  ),
  'request_friend is not security definer'
);
SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'friendships'
      AND indexname = 'friendships_pair_key'
  ),
  'friendships_pair_key is missing'
);

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (:'alice', 'alice@example.com', '{"display_name":"Alice"}'),
  (:'bob', 'bob@example.com', '{"display_name":"Bob"}'),
  (:'carol', 'carol@example.com', '{"display_name":"Carol"}');

SET LOCAL ROLE authenticated;
SELECT public._test_auth_as(:'alice'::uuid);

SELECT public.request_friend(:'bob'::uuid);

SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE requester_id = :'alice'::uuid
      AND addressee_id = :'bob'::uuid
      AND status = 'pending'
      AND responded_at IS NULL
  ),
  'first request_friend did not insert a pending row'
);

SELECT public._test_expect_error(
  format('SELECT public.request_friend(%L::uuid)', :'bob'),
  '%already pending%'
);

SELECT public._test_expect_error(
  format('SELECT public.request_friend(%L::uuid)', :'alice'),
  '%yourself%'
);

SELECT public._test_auth_as(:'bob'::uuid);
SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM public.notifications
    WHERE user_id = :'bob'::uuid
      AND type = 'friend_request'
  ),
  'addressee was not notified of the first request'
);

-- Table owner + addressee JWT: works on main (RLS bypass) and after PR #15
-- (trigger allows pending -> declined only for the addressee).
RESET ROLE;
SELECT public._test_auth_as(:'bob'::uuid);
UPDATE public.friendships
SET status = 'declined', responded_at = now()
WHERE requester_id = :'alice'::uuid
  AND addressee_id = :'bob'::uuid
  AND status = 'pending';
SET LOCAL ROLE authenticated;

SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE requester_id = :'alice'::uuid
      AND addressee_id = :'bob'::uuid
      AND status = 'declined'
  ),
  'decline did not leave the pair row'
);

-- Direct insert still fails (PR #15 relies on this). The app uses request_friend.
SELECT public._test_auth_as(:'alice'::uuid);
SELECT public._test_expect_error(
  format(
    'INSERT INTO public.friendships (requester_id, addressee_id, status) VALUES (%L, %L, %L)',
    :'alice', :'bob', 'pending'
  ),
  '%friendships_pair_key%'
);
SELECT public._test_auth_as(:'bob'::uuid);
SELECT public._test_expect_error(
  format(
    'INSERT INTO public.friendships (requester_id, addressee_id, status) VALUES (%L, %L, %L)',
    :'bob', :'alice', 'pending'
  ),
  '%friendships_pair_key%'
);

-- Original requester can ask again. Parties stay a new pending row, not an in-place rewrite.
SELECT public._test_auth_as(:'alice'::uuid);
SELECT public.request_friend(:'bob'::uuid);

SELECT public._test_assert(
  (
    SELECT count(*)
    FROM public.friendships
    WHERE LEAST(requester_id, addressee_id) = LEAST(:'alice'::uuid, :'bob'::uuid)
      AND GREATEST(requester_id, addressee_id) = GREATEST(:'alice'::uuid, :'bob'::uuid)
  ) = 1,
  're-request left more than one row for the pair'
);
SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE requester_id = :'alice'::uuid
      AND addressee_id = :'bob'::uuid
      AND status = 'pending'
      AND responded_at IS NULL
  ),
  'original requester re-request did not create a pending row'
);

RESET ROLE;
SELECT public._test_auth_as(:'bob'::uuid);
UPDATE public.friendships
SET status = 'declined', responded_at = now()
WHERE requester_id = :'alice'::uuid
  AND addressee_id = :'bob'::uuid
  AND status = 'pending';
SET LOCAL ROLE authenticated;

-- The person who declined can send the next request (new requester).
SELECT public._test_auth_as(:'bob'::uuid);
SELECT public.request_friend(:'alice'::uuid);

SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE requester_id = :'bob'::uuid
      AND addressee_id = :'alice'::uuid
      AND status = 'pending'
      AND responded_at IS NULL
  ),
  'decliner re-request did not swap requester/addressee'
);
SELECT public._test_assert(
  NOT EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE requester_id = :'alice'::uuid
      AND addressee_id = :'bob'::uuid
  ),
  'old declined pair was not replaced'
);

SELECT public._test_auth_as(:'alice'::uuid);
SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM public.notifications
    WHERE user_id = :'alice'::uuid
      AND type = 'friend_request'
  ),
  'new addressee was not notified after the swapped re-request'
);

-- Pending from the other direction must not be replaced by Add.
SELECT public._test_expect_error(
  format('SELECT public.request_friend(%L::uuid)', :'bob'),
  '%already pending%'
);

-- Accept, then neither person can re-request while the friendship stands.
RESET ROLE;
SELECT public._test_auth_as(:'alice'::uuid);
UPDATE public.friendships
SET status = 'accepted', responded_at = now()
WHERE requester_id = :'bob'::uuid
  AND addressee_id = :'alice'::uuid
  AND status = 'pending';
SET LOCAL ROLE authenticated;
SELECT public._test_auth_as(:'alice'::uuid);

SELECT public._test_expect_error(
  format('SELECT public.request_friend(%L::uuid)', :'bob'),
  '%Already friends%'
);
SELECT public._test_auth_as(:'bob'::uuid);
SELECT public._test_expect_error(
  format('SELECT public.request_friend(%L::uuid)', :'alice'),
  '%Already friends%'
);
SELECT public._test_assert(
  (SELECT private.are_friends(:'alice'::uuid, :'bob'::uuid)),
  'are_friends is false after accept'
);

-- Unfriend (delete accepted), then a new request works.
DELETE FROM public.friendships
WHERE requester_id = :'bob'::uuid
  AND addressee_id = :'alice'::uuid;
SELECT public._test_auth_as(:'alice'::uuid);
SELECT public.request_friend(:'bob'::uuid);
SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE requester_id = :'alice'::uuid
      AND addressee_id = :'bob'::uuid
      AND status = 'pending'
  ),
  'request after unfriend failed'
);

-- A blocked user cannot send a request.
RESET ROLE;
SELECT public._test_auth_clear();
SELECT set_config('app.admin_write', 'on', true);
UPDATE public.profiles SET blocked_at = now() WHERE id = :'carol'::uuid;
SELECT set_config('app.admin_write', '', true);

SET LOCAL ROLE authenticated;
SELECT public._test_auth_as(:'carol'::uuid);
SELECT public._test_expect_error(
  format('SELECT public.request_friend(%L::uuid)', :'alice'),
  '%Account blocked%'
);
SELECT public._test_assert(
  NOT EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE requester_id = :'carol'::uuid
       OR addressee_id = :'carol'::uuid
  ),
  'blocked user created a friendship row'
);

RESET ROLE;
SELECT public._test_auth_clear();
SELECT public._test_expect_error(
  format('SELECT public.request_friend(%L::uuid)', :'bob'),
  '%Not authenticated%'
);

\echo 'friendship rerequest regression checks passed'
ROLLBACK;
