-- Regression checks for issue #6.
-- The sender must not accept, retarget, or revive a friend request.
-- The addressee still accepts and declines. The requester still cancels.
-- A declined row stays (issue #12): inserting again still hits the pair key.
--
-- Requires migrations plus supabase/tests/harness.sql (auth.uid reads the JWT
-- sub claim). The runner is supabase/tests/run-friendship-respond.sh.

\set ON_ERROR_STOP on

\set alice '11111111-1111-1111-1111-111111111111'
\set bob '22222222-2222-2222-2222-222222222222'
\set carol '33333333-3333-3333-3333-333333333333'
\set req 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
\set req_carol 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'
\set list '44444444-4444-4444-4444-444444444444'

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
  has_function_privilege('authenticated', 'public.respond_friend(uuid, boolean)', 'EXECUTE'),
  'authenticated cannot call respond_friend'
);
SELECT public._test_assert(
  NOT has_function_privilege('anon', 'public.respond_friend(uuid, boolean)', 'EXECUTE'),
  'anon can call respond_friend'
);
SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'respond_friend'
      AND p.prosecdef
  ),
  'respond_friend is not security definer'
);
SELECT public._test_assert(
  NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'friendships'
      AND policyname = 'friendships_update'
  ),
  'permissive friendships_update policy is still present'
);

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (:'alice', 'alice@example.com', '{"display_name":"Alice"}'),
  (:'bob', 'bob@example.com', '{"display_name":"Bob"}'),
  (:'carol', 'carol@example.com', '{"display_name":"Carol"}');

INSERT INTO public.lists (id, owner_id, title, visibility, edit_mode)
VALUES (:'list', :'bob', 'Friends only', 'friends', 'friends');

SET LOCAL ROLE authenticated;
SELECT public._test_auth_as(:'alice'::uuid);

-- Sending an already-accepted row is the same privilege jump as self-accept.
SELECT public._test_expect_error(
  format(
    'INSERT INTO public.friendships (requester_id, addressee_id, status) VALUES (%L, %L, %L)',
    :'alice', :'bob', 'accepted'
  ),
  '%row-level security%'
);

INSERT INTO public.friendships (id, requester_id, addressee_id, status)
VALUES (:'req', :'alice', :'bob', 'pending');

SELECT public._test_assert(
  NOT (SELECT private.are_friends(:'alice'::uuid, :'bob'::uuid)),
  'are_friends is true before anyone accepts'
);
SELECT public._test_assert(
  NOT (SELECT private.can_view_list(:'list'::uuid)),
  'sender can view the friends-only list before accept'
);
SELECT public._test_assert(
  NOT (SELECT private.can_edit_list(:'list'::uuid)),
  'sender can edit the friends-mode list before accept'
);
SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.lists WHERE id = :'list'::uuid),
  'friends-only list is visible to the sender before accept'
);

-- The reported attack: requester updates status, or retargets and accepts.
UPDATE public.friendships
SET status = 'accepted'
WHERE id = :'req'::uuid;

UPDATE public.friendships
SET addressee_id = :'carol'::uuid, status = 'accepted'
WHERE id = :'req'::uuid;

-- Upsert against the pair index is an update in disguise.
SELECT public._test_expect_error(
  format(
    'INSERT INTO public.friendships (requester_id, addressee_id, status) VALUES (%L, %L, %L)
     ON CONFLICT (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id))
     DO UPDATE SET status = %L',
    :'alice', :'bob', 'pending', 'accepted'
  ),
  '%row-level security%'
);

SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE id = :'req'::uuid
      AND requester_id = :'alice'::uuid
      AND addressee_id = :'bob'::uuid
      AND status = 'pending'
  ),
  'requester changed the pending request'
);
SELECT public._test_assert(
  NOT (SELECT private.are_friends(:'alice'::uuid, :'bob'::uuid)),
  'are_friends became true after the requester update'
);
SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.lists WHERE id = :'list'::uuid),
  'friends-only list opened after the requester update'
);

SELECT public._test_expect_error(
  format('SELECT public.respond_friend(%L::uuid, true)', :'req'),
  '%Only the recipient can respond%'
);

SELECT public._test_auth_as(:'carol'::uuid);
SELECT public._test_expect_error(
  format('SELECT public.respond_friend(%L::uuid, true)', :'req'),
  '%Only the recipient can respond%'
);

SELECT public._test_auth_as(:'bob'::uuid);
SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM public.notifications
    WHERE user_id = :'bob'::uuid
      AND type = 'friend_request'
  ),
  'addressee was not notified of the pending request'
);

-- Legitimate decline. The row stays so the pair key still blocks a re-insert.
SELECT public.respond_friend(:'req'::uuid, false);

SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE id = :'req'::uuid
      AND requester_id = :'alice'::uuid
      AND addressee_id = :'bob'::uuid
      AND status = 'declined'
      AND responded_at IS NOT NULL
  ),
  'addressee decline did not keep the same pair'
);
SELECT public._test_assert(
  NOT (SELECT private.are_friends(:'alice'::uuid, :'bob'::uuid)),
  'are_friends is true after a decline'
);

SELECT public._test_auth_as(:'alice'::uuid);
UPDATE public.friendships
SET status = 'accepted'
WHERE id = :'req'::uuid;

SELECT public._test_auth_as(:'bob'::uuid);
UPDATE public.friendships
SET status = 'accepted'
WHERE id = :'req'::uuid;

SELECT public._test_expect_error(
  format('SELECT public.respond_friend(%L::uuid, true)', :'req'),
  '%Friend request is not pending%'
);

SELECT public._test_assert(
  EXISTS (
    SELECT 1 FROM public.friendships WHERE id = :'req'::uuid AND status = 'declined'
  ),
  'declined request was revived'
);

-- Issue #12 stays open: a second insert for the pair still fails.
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

-- Either person can still delete a declined row (so #12 can delete + insert later).
SELECT public._test_auth_as(:'bob'::uuid);
DELETE FROM public.friendships WHERE id = :'req'::uuid;
SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.friendships WHERE id = :'req'::uuid),
  'addressee could not delete a declined request'
);

SELECT public._test_auth_as(:'alice'::uuid);
INSERT INTO public.friendships (id, requester_id, addressee_id, status)
VALUES (:'req', :'alice', :'bob', 'pending');

-- Cancel is a delete, and only the requester may do it while pending.
SELECT public._test_auth_as(:'bob'::uuid);
DELETE FROM public.friendships WHERE id = :'req'::uuid;
SELECT public._test_assert(
  EXISTS (SELECT 1 FROM public.friendships WHERE id = :'req'::uuid AND status = 'pending'),
  'addressee cancelled a pending request'
);

SELECT public._test_auth_as(:'carol'::uuid);
DELETE FROM public.friendships WHERE id = :'req'::uuid;

SELECT public._test_auth_as(:'alice'::uuid);
SELECT public._test_assert(
  EXISTS (SELECT 1 FROM public.friendships WHERE id = :'req'::uuid AND status = 'pending'),
  'pending request disappeared before the sender cancelled'
);
DELETE FROM public.friendships WHERE id = :'req'::uuid;
SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.friendships WHERE id = :'req'::uuid),
  'requester could not cancel a pending request'
);

-- Legitimate accept unlocks friends-only access, then either person can unfriend.
INSERT INTO public.friendships (id, requester_id, addressee_id, status)
VALUES (:'req', :'alice', :'bob', 'pending');

SELECT public._test_auth_as(:'bob'::uuid);
UPDATE public.friendships
SET status = 'accepted'
WHERE id = :'req'::uuid;
SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE id = :'req'::uuid
      AND status = 'pending'
  ),
  'addressee accepted with a direct update'
);
SELECT public.respond_friend(:'req'::uuid, true);

SELECT public._test_auth_as(:'alice'::uuid);
SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE id = :'req'::uuid
      AND status = 'accepted'
      AND responded_at IS NOT NULL
      AND requester_id = :'alice'::uuid
      AND addressee_id = :'bob'::uuid
  ),
  'accept did not mark the original pair accepted'
);
SELECT public._test_assert(
  (SELECT private.are_friends(:'alice'::uuid, :'bob'::uuid)),
  'are_friends is false after the addressee accepts'
);
SELECT public._test_assert(
  (SELECT private.can_view_list(:'list'::uuid)),
  'sender cannot view the friends-only list after accept'
);
SELECT public._test_assert(
  (SELECT private.can_edit_list(:'list'::uuid)),
  'sender cannot edit the friends-mode list after accept'
);
SELECT public._test_assert(
  EXISTS (SELECT 1 FROM public.lists WHERE id = :'list'::uuid),
  'friends-only list stayed hidden after accept'
);
SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM public.notifications
    WHERE user_id = :'alice'::uuid
      AND type = 'friend_accepted'
  ),
  'requester was not notified of the accept'
);

UPDATE public.friendships
SET status = 'declined'
WHERE id = :'req'::uuid;
SELECT public._test_assert(
  EXISTS (SELECT 1 FROM public.friendships WHERE id = :'req'::uuid AND status = 'accepted'),
  'requester changed an accepted friendship'
);

SELECT public._test_auth_as(:'bob'::uuid);
DELETE FROM public.friendships WHERE id = :'req'::uuid;
SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.friendships WHERE id = :'req'::uuid),
  'addressee could not unfriend'
);
SELECT public._test_auth_as(:'alice'::uuid);
SELECT public._test_assert(
  NOT (SELECT private.are_friends(:'alice'::uuid, :'bob'::uuid)),
  'are_friends stayed true after unfriend'
);
SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.lists WHERE id = :'list'::uuid),
  'friends-only list stayed visible after unfriend'
);

-- Requester can also unfriend.
INSERT INTO public.friendships (id, requester_id, addressee_id, status)
VALUES (:'req', :'alice', :'bob', 'pending');
SELECT public._test_auth_as(:'bob'::uuid);
SELECT public.respond_friend(:'req'::uuid, true);
SELECT public._test_auth_as(:'alice'::uuid);
DELETE FROM public.friendships WHERE id = :'req'::uuid;
SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.friendships WHERE id = :'req'::uuid),
  'requester could not unfriend'
);

-- A blocked addressee cannot accept through the function (RLS no longer covers it).
INSERT INTO public.friendships (id, requester_id, addressee_id, status)
VALUES (:'req', :'alice', :'bob', 'pending');

RESET ROLE;
SELECT public._test_auth_clear();
SELECT set_config('app.admin_write', 'on', true);
UPDATE public.profiles SET blocked_at = now() WHERE id = :'bob'::uuid;
SELECT set_config('app.admin_write', '', true);

SET LOCAL ROLE authenticated;
SELECT public._test_auth_as(:'bob'::uuid);
SELECT public._test_expect_error(
  format('SELECT public.respond_friend(%L::uuid, true)', :'req'),
  '%Account blocked%'
);
SELECT public._test_assert(
  EXISTS (SELECT 1 FROM public.friendships WHERE id = :'req'::uuid AND status = 'pending'),
  'blocked addressee accepted the request'
);

-- The trigger blocks party changes and self-accept even for the table owner
-- when a user JWT is present. A matching addressee JWT may still transition.
RESET ROLE;
SELECT public._test_auth_clear();
SELECT set_config('app.admin_write', 'on', true);
UPDATE public.profiles SET blocked_at = NULL WHERE id = :'bob'::uuid;
SELECT set_config('app.admin_write', '', true);

INSERT INTO public.friendships (id, requester_id, addressee_id, status)
VALUES (:'req_carol', :'alice', :'carol', 'pending');

SELECT public._test_auth_as(:'alice'::uuid);
SELECT public._test_expect_error(
  format(
    'UPDATE public.friendships SET addressee_id = %L::uuid, status = %L WHERE id = %L::uuid',
    :'bob', 'accepted', :'req_carol'
  ),
  '%immutable%'
);
SELECT public._test_expect_error(
  format(
    'UPDATE public.friendships SET status = %L WHERE id = %L::uuid',
    'accepted', :'req_carol'
  ),
  '%Only the recipient can respond%'
);
SELECT public._test_expect_error(
  format(
    'UPDATE public.friendships SET responded_at = now() WHERE id = %L::uuid',
    :'req_carol'
  ),
  '%invalid friendship transition%'
);
SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM public.friendships
    WHERE id = :'req_carol'::uuid
      AND requester_id = :'alice'::uuid
      AND addressee_id = :'carol'::uuid
      AND status = 'pending'
      AND responded_at IS NULL
  ),
  'owner update rewrote the pending pair'
);

SELECT public._test_auth_as(:'carol'::uuid);
UPDATE public.friendships
SET status = 'accepted', responded_at = now()
WHERE id = :'req_carol'::uuid;
SELECT public._test_assert(
  (SELECT private.are_friends(:'alice'::uuid, :'carol'::uuid)),
  'owner update by the addressee did not accept'
);

SELECT public._test_auth_clear();
SELECT public._test_expect_error(
  format(
    'UPDATE public.friendships SET requester_id = %L::uuid WHERE id = %L::uuid',
    :'bob', :'req_carol'
  ),
  '%immutable%'
);
SELECT public._test_expect_error(
  format(
    'UPDATE public.friendships SET status = %L WHERE id = %L::uuid',
    'pending', :'req_carol'
  ),
  '%invalid friendship transition%'
);

-- Seeds and maintenance can still insert an accepted pair. RLS does not apply
-- to the table owner, and there is no insert trigger forcing pending.
SELECT public._test_auth_clear();
INSERT INTO public.friendships (requester_id, addressee_id, status)
VALUES (:'bob', :'carol', 'accepted');
SELECT public._test_assert(
  (SELECT private.are_friends(:'bob'::uuid, :'carol'::uuid)),
  'maintenance insert of an accepted pair failed'
);

\echo 'friendship respond regression checks passed'
ROLLBACK;
