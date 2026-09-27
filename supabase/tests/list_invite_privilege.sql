-- Regression for invite role escalation.
-- Run inside one transaction against a database that already has the migrations
-- applied (including 20260927191500_list_invite_privilege.sql) and an auth.users
-- table that accepts (id, email, raw_user_meta_data). The script rolls back.
--
--   psql -v ON_ERROR_STOP=1 -f supabase/tests/list_invite_privilege.sql

BEGIN;

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('11111111-1111-4111-8111-111111111111', 'owner@example.com', '{"username":"owner"}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', 'invitee@example.com', '{"username":"invitee"}'::jsonb),
  ('33333333-3333-4333-8333-333333333333', 'stranger@example.com', '{"username":"stranger"}'::jsonb);

INSERT INTO public.lists (id, owner_id, title) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Owner list'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '33333333-3333-4333-8333-333333333333', 'Other list');

INSERT INTO public.list_invites (id, list_id, inviter_id, invitee_id, role, token, status) VALUES
  (
    '44444444-4444-4444-8444-444444444444',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    'viewer',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'pending'
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    NULL,
    'viewer',
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'pending'
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    'viewer',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    'pending'
  ),
  (
    '77777777-7777-4777-8777-777777777777',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    'viewer',
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    'pending'
  );

CREATE PROCEDURE pg_temp.expect_denied(stmt text)
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE stmt;
  RAISE EXCEPTION 'expected permission error for: %', stmt;
EXCEPTION
  WHEN insufficient_privilege THEN
    NULL;
END;
$$;

CREATE PROCEDURE pg_temp.expect_error(stmt text, needle text)
LANGUAGE plpgsql
AS $$
DECLARE
  failed boolean := false;
  msg text;
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION
    WHEN OTHERS THEN
      failed := true;
      msg := SQLERRM;
  END;
  IF NOT failed THEN
    RAISE EXCEPTION 'expected failure containing "%" for: %', needle, stmt;
  END IF;
  IF msg NOT ILIKE '%' || needle || '%' THEN
    RAISE EXCEPTION 'expected failure containing "%", got: %', needle, msg;
  END IF;
END;
$$;

-- Invitee cannot raise role, move the invite, rotate the token, or reopen it.
SELECT set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
SET ROLE authenticated;

CALL pg_temp.expect_denied(
  $sql$UPDATE public.list_invites SET role = 'editor' WHERE id = '44444444-4444-4444-8444-444444444444'$sql$
);
CALL pg_temp.expect_denied(
  $sql$UPDATE public.list_invites SET list_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' WHERE id = '44444444-4444-4444-8444-444444444444'$sql$
);
CALL pg_temp.expect_denied(
  $sql$UPDATE public.list_invites SET token = gen_random_uuid() WHERE id = '44444444-4444-4444-8444-444444444444'$sql$
);
CALL pg_temp.expect_denied(
  $sql$UPDATE public.list_invites SET status = 'accepted' WHERE id = '44444444-4444-4444-8444-444444444444'$sql$
);
CALL pg_temp.expect_denied(
  $sql$UPDATE public.list_invites SET role = 'editor', status = 'declined' WHERE id = '44444444-4444-4444-8444-444444444444'$sql$
);
-- Spoofing the accept flag still cannot change the role.
SELECT set_config('chroniqe.invite_accept', '44444444-4444-4444-8444-444444444444', true);
CALL pg_temp.expect_denied(
  $sql$UPDATE public.list_invites SET role = 'editor', status = 'accepted', invitee_id = '22222222-2222-4222-8222-222222222222' WHERE id = '44444444-4444-4444-8444-444444444444'$sql$
);
SELECT set_config('chroniqe.invite_accept', '', true);

-- Decline still works, and a declined invite cannot be accepted or reopened.
UPDATE public.list_invites
SET status = 'declined'
WHERE id = '66666666-6666-4666-8666-666666666666';

CALL pg_temp.expect_error(
  $sql$SELECT public.accept_list_invite('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::uuid)$sql$,
  'not pending'
);
CALL pg_temp.expect_denied(
  $sql$UPDATE public.list_invites SET status = 'pending' WHERE id = '66666666-6666-4666-8666-666666666666'$sql$
);

-- Accept uses the locked owner-set role and will not run twice.
SELECT public.accept_list_invite('cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid);

CALL pg_temp.expect_denied(
  $sql$UPDATE public.list_invites SET role = 'editor' WHERE id = '44444444-4444-4444-8444-444444444444'$sql$
);
CALL pg_temp.expect_denied(
  $sql$UPDATE public.list_invites SET status = 'pending' WHERE id = '44444444-4444-4444-8444-444444444444'$sql$
);
CALL pg_temp.expect_error(
  $sql$SELECT public.accept_list_invite('cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid)$sql$,
  'not pending'
);

-- A link invite is single-use for the person who accepted it.
SELECT public.accept_list_invite('dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid);
CALL pg_temp.expect_error(
  $sql$SELECT public.accept_list_invite('dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid)$sql$,
  'not pending'
);

-- Someone else cannot accept a consumed link, a named invite, or delete a token.
SELECT set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
SET ROLE authenticated;

CALL pg_temp.expect_error(
  $sql$SELECT public.accept_list_invite('dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid)$sql$,
  'not pending'
);
CALL pg_temp.expect_error(
  $sql$SELECT public.accept_list_invite('ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid)$sql$,
  'another user'
);
DELETE FROM public.list_invites WHERE id = '77777777-7777-4777-8777-777777777777';

RESET ROLE;

DO $$
DECLARE
  member_role text;
  declined text;
  still_there int;
BEGIN
  SELECT role INTO member_role
  FROM public.list_members
  WHERE list_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    AND user_id = '22222222-2222-4222-8222-222222222222';
  IF member_role IS DISTINCT FROM 'viewer' THEN
    RAISE EXCEPTION 'accept granted %, expected viewer', member_role;
  END IF;

  SELECT status INTO declined
  FROM public.list_invites
  WHERE id = '66666666-6666-4666-8666-666666666666';
  IF declined IS DISTINCT FROM 'declined' THEN
    RAISE EXCEPTION 'decline left status %', declined;
  END IF;

  SELECT count(*) INTO still_there
  FROM public.list_invites
  WHERE id = '77777777-7777-4777-8777-777777777777';
  IF still_there <> 1 THEN
    RAISE EXCEPTION 'stranger deleted a pending invite';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.list_members
    WHERE user_id = '33333333-3333-4333-8333-333333333333'
  ) THEN
    RAISE EXCEPTION 'stranger became a member';
  END IF;
END $$;

-- Owner can still correct the role. Accept copies that role, not a self-assigned one.
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
SET ROLE authenticated;

UPDATE public.list_invites
SET role = 'editor'
WHERE id = '77777777-7777-4777-8777-777777777777';

-- Owner closing an accepted invite must stick. The invitee cannot reopen it.
UPDATE public.list_invites
SET status = 'declined'
WHERE id = '44444444-4444-4444-8444-444444444444';

SELECT set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
SET ROLE authenticated;

CALL pg_temp.expect_denied(
  $sql$UPDATE public.list_invites SET status = 'pending' WHERE id = '44444444-4444-4444-8444-444444444444'$sql$
);
CALL pg_temp.expect_error(
  $sql$SELECT public.accept_list_invite('cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid)$sql$,
  'not pending'
);

SELECT public.accept_list_invite('ffffffff-ffff-4fff-8fff-ffffffffffff'::uuid);

RESET ROLE;

DO $$
DECLARE
  got text;
  closed text;
BEGIN
  SELECT role INTO got
  FROM public.list_members
  WHERE list_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    AND user_id = '22222222-2222-4222-8222-222222222222';
  IF got IS DISTINCT FROM 'editor' THEN
    RAISE EXCEPTION 'owner-updated invite granted %, expected editor', got;
  END IF;

  SELECT status INTO closed
  FROM public.list_invites
  WHERE id = '44444444-4444-4444-8444-444444444444';
  IF closed IS DISTINCT FROM 'declined' THEN
    RAISE EXCEPTION 'owner close was reopened to %', closed;
  END IF;
END $$;

-- Owner can revoke a fresh token. Accept then fails.
INSERT INTO public.list_invites (id, list_id, inviter_id, invitee_id, role, token, status) VALUES
  (
    '88888888-8888-4888-8888-888888888888',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    'proposer',
    '99999999-9999-4999-8999-999999999999',
    'pending'
  );

SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
SET ROLE authenticated;

DELETE FROM public.list_invites WHERE id = '88888888-8888-4888-8888-888888888888';

SELECT set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
SET ROLE authenticated;

CALL pg_temp.expect_error(
  $sql$SELECT public.accept_list_invite('99999999-9999-4999-8999-999999999999'::uuid)$sql$,
  'not found'
);

RESET ROLE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.list_invites WHERE id = '88888888-8888-4888-8888-888888888888'
  ) THEN
    RAISE EXCEPTION 'owner revoke left the invite in place';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.list_members
    WHERE list_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      AND user_id = '22222222-2222-4222-8222-222222222222'
      AND role = 'proposer'
  ) THEN
    RAISE EXCEPTION 'revoked invite still granted proposer';
  END IF;
END $$;

ROLLBACK;
