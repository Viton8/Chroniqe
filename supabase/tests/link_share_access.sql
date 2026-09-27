-- Regression checks for issue #5.
-- visibility = link must not make a list world-readable. Anon SELECT * returns
-- no link rows. Knowing the list id is not enough. The share_token (header or
-- open_list_share grant) is required; linkAccess applies only after that.
--
-- Requires migrations plus supabase/tests/harness.sql. Runner:
-- supabase/tests/run-link-share-access.sh

\set ON_ERROR_STOP on

\set alice '11111111-1111-1111-1111-111111111111'
\set bob '22222222-2222-2222-2222-222222222222'
\set carol '33333333-3333-3333-3333-333333333333'
\set link_view '44444444-4444-4444-4444-444444444441'
\set link_edit '44444444-4444-4444-4444-444444444442'
\set public_list '44444444-4444-4444-4444-444444444443'
\set private_list '44444444-4444-4444-4444-444444444444'
\set item_view '55555555-5555-5555-5555-555555555551'
\set item_edit '55555555-5555-5555-5555-555555555552'
\set item_public '55555555-5555-5555-5555-555555555553'

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

CREATE FUNCTION public._test_share_header(p_token uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_token IS NULL THEN
    PERFORM set_config('request.headers', '', true);
    PERFORM set_config('request.header.x-list-share-token', '', true);
  ELSE
    PERFORM set_config(
      'request.headers',
      json_build_object('x-list-share-token', p_token)::text,
      true
    );
    PERFORM set_config('request.header.x-list-share-token', p_token::text, true);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public._test_assert(boolean, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public._test_auth_as(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public._test_auth_clear() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public._test_share_header(uuid) TO anon, authenticated;

SELECT public._test_assert(
  has_function_privilege('anon', 'public.open_list_share(uuid)', 'EXECUTE'),
  'anon cannot call open_list_share'
);
SELECT public._test_assert(
  has_function_privilege('authenticated', 'public.open_list_share(uuid)', 'EXECUTE'),
  'authenticated cannot call open_list_share'
);
SELECT public._test_assert(
  NOT has_table_privilege('anon', 'public.list_link_grants', 'INSERT'),
  'anon can insert list_link_grants'
);
SELECT public._test_assert(
  NOT has_table_privilege('authenticated', 'public.list_link_grants', 'INSERT'),
  'authenticated can insert list_link_grants'
);
SELECT public._test_assert(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'open_list_share'
      AND p.prosecdef
  ),
  'open_list_share is not security definer'
);

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (:'alice', 'alice@example.com', '{"display_name":"Alice","username":"alice"}'),
  (:'bob', 'bob@example.com', '{"display_name":"Bob","username":"bobbbb"}'),
  (:'carol', 'carol@example.com', '{"display_name":"Carol","username":"carol"}');

INSERT INTO public.lists (id, owner_id, title, visibility, edit_mode, settings)
VALUES
  (:'link_view', :'alice', 'Link view', 'link', 'owner', '{"linkAccess":"view"}'::jsonb),
  (:'link_edit', :'alice', 'Link edit', 'link', 'owner', '{"linkAccess":"edit"}'::jsonb),
  (:'public_list', :'alice', 'Public', 'public', 'owner', '{"linkAccess":"edit"}'::jsonb),
  (:'private_list', :'alice', 'Private', 'private', 'owner', '{}'::jsonb);

INSERT INTO public.list_members (list_id, user_id, role)
VALUES (:'link_view', :'carol', 'viewer');

INSERT INTO public.items (id, list_id, values, created_by)
VALUES
  (:'item_view', :'link_view', '{"t":"view"}'::jsonb, :'alice'),
  (:'item_edit', :'link_edit', '{"t":"edit"}'::jsonb, :'alice'),
  (:'item_public', :'public_list', '{"t":"public"}'::jsonb, :'alice');

SET LOCAL ROLE authenticated;
SELECT public._test_auth_as(:'alice'::uuid);

SELECT public._test_assert(
  (SELECT share_token IS NOT NULL FROM public.lists WHERE id = :'link_view'::uuid),
  'link list has no share_token'
);

RESET ROLE;
SELECT public._test_auth_clear();
SELECT public._test_share_header(NULL);

-- Snapshot tokens before role-restricted selects.
CREATE TABLE public._test_tokens AS
SELECT id, share_token, visibility FROM public.lists;
GRANT SELECT ON public._test_tokens TO anon, authenticated;

SET LOCAL ROLE anon;
SELECT public._test_auth_clear();
SELECT public._test_share_header(NULL);

SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.lists WHERE visibility = 'link'),
  'anon select returned visibility=link rows'
);
SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.lists WHERE id = :'link_view'::uuid),
  'anon can select a link list by id without the token'
);
SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.items WHERE list_id = :'link_view'::uuid),
  'anon can select items on a link list without the token'
);
SELECT public._test_assert(
  EXISTS (SELECT 1 FROM public.lists WHERE id = :'public_list'::uuid),
  'anon cannot select a public list'
);
SELECT public._test_assert(
  EXISTS (SELECT 1 FROM public.items WHERE id = :'item_public'::uuid),
  'anon cannot select items on a public list'
);
SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.lists WHERE id = :'private_list'::uuid),
  'anon can select a private list'
);

-- Wrong token does not unlock the list.
SELECT public._test_share_header('99999999-9999-9999-9999-999999999999'::uuid);
SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.lists WHERE visibility = 'link'),
  'anon with a random token can select link lists'
);

-- Matching token unlocks only that list.
SELECT public._test_share_header((SELECT share_token FROM public._test_tokens WHERE id = :'link_view'::uuid));
SELECT public._test_assert(
  (SELECT count(*) FROM public.lists WHERE visibility = 'link') = 1,
  'anon with a share token saw the wrong number of link lists'
);
SELECT public._test_assert(
  EXISTS (SELECT 1 FROM public.lists WHERE id = :'link_view'::uuid),
  'anon with the share token cannot select that link list'
);
SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.lists WHERE id = :'link_edit'::uuid),
  'anon with list A token can select list B'
);
SELECT public._test_assert(
  EXISTS (SELECT 1 FROM public.items WHERE id = :'item_view'::uuid),
  'anon with the share token cannot select items on that list'
);
SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.items WHERE id = :'item_edit'::uuid),
  'anon with list A token can select items on list B'
);

-- open_list_share as anon does not persist access without the header.
SELECT public._test_share_header(NULL);
SELECT public._test_assert(
  public.open_list_share((SELECT share_token FROM public._test_tokens WHERE id = :'link_view'::uuid))
    = :'link_view'::uuid,
  'anon open_list_share did not return the list id'
);
SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.lists WHERE id = :'link_view'::uuid),
  'anon open_list_share granted access without presenting the token again'
);

RESET ROLE;
SELECT public._test_auth_clear();
SELECT public._test_share_header(NULL);

SET LOCAL ROLE authenticated;
SELECT public._test_auth_as(:'bob'::uuid);

SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.lists WHERE visibility = 'link'),
  'signed-in stranger can list link lists'
);
SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.lists WHERE id = :'link_edit'::uuid),
  'signed-in stranger can select a link list by id'
);
SELECT public._test_assert(
  NOT (SELECT private.can_view_list(:'link_edit'::uuid)),
  'stranger can_view_list is true for a link list'
);
SELECT public._test_assert(
  NOT (SELECT private.can_edit_list(:'link_edit'::uuid)),
  'stranger can_edit_list is true for a link+edit list without the token'
);
SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.items WHERE id = :'item_edit'::uuid),
  'stranger can select items on a link+edit list'
);

UPDATE public.items
SET values = '{"t":"hacked"}'::jsonb
WHERE id = :'item_edit'::uuid;

RESET ROLE;
SELECT public._test_assert(
  (SELECT values->>'t' FROM public.items WHERE id = :'item_edit'::uuid) = 'edit',
  'stranger updated a link+edit item without the token'
);

SET LOCAL ROLE authenticated;
SELECT public._test_auth_as(:'bob'::uuid);

-- Public + linkAccess=edit remains world-editable for signed-in users.
SELECT public._test_assert(
  (SELECT private.can_edit_list(:'public_list'::uuid)),
  'signed-in user cannot edit a public list with linkAccess=edit'
);

SELECT public._test_assert(
  public.open_list_share((SELECT share_token FROM public._test_tokens WHERE id = :'link_edit'::uuid))
    = :'link_edit'::uuid,
  'open_list_share did not return the link+edit list'
);
SELECT public._test_assert(
  EXISTS (
    SELECT 1 FROM public.list_link_grants
    WHERE list_id = :'link_edit'::uuid AND user_id = :'bob'::uuid
  ),
  'open_list_share did not record a grant for the signed-in user'
);
SELECT public._test_assert(
  EXISTS (SELECT 1 FROM public.lists WHERE id = :'link_edit'::uuid),
  'grantee cannot select the link list without sending the header again'
);
SELECT public._test_assert(
  (SELECT private.can_view_list(:'link_edit'::uuid)),
  'grantee can_view_list is false'
);
SELECT public._test_assert(
  (SELECT private.can_edit_list(:'link_edit'::uuid)),
  'grantee can_edit_list is false on a link+edit list'
);
SELECT public._test_assert(
  NOT (SELECT private.can_edit_list(:'link_view'::uuid)),
  'grantee of list B can edit list A'
);

UPDATE public.items
SET values = '{"t":"from-bob"}'::jsonb
WHERE id = :'item_edit'::uuid;
SELECT public._test_assert(
  (SELECT values->>'t' FROM public.items WHERE id = :'item_edit'::uuid) = 'from-bob',
  'grantee could not edit an item on a link+edit list'
);

-- Grant on the view-only link list does not grant edit.
SELECT public._test_assert(
  public.open_list_share((SELECT share_token FROM public._test_tokens WHERE id = :'link_view'::uuid))
    = :'link_view'::uuid,
  'open_list_share failed for the view-only link list'
);
SELECT public._test_assert(
  (SELECT private.can_view_list(:'link_view'::uuid)),
  'grantee cannot view a link+view list'
);
SELECT public._test_assert(
  NOT (SELECT private.can_edit_list(:'link_view'::uuid)),
  'grantee can edit a link+view list'
);

UPDATE public.items
SET values = '{"t":"nope"}'::jsonb
WHERE id = :'item_view'::uuid;
SELECT public._test_assert(
  (SELECT values->>'t' FROM public.items WHERE id = :'item_view'::uuid) IS DISTINCT FROM 'nope',
  'view-only grantee updated an item'
);

-- Members can view a link list without the token.
RESET ROLE;
SELECT public._test_auth_clear();
SELECT public._test_share_header(NULL);
SET LOCAL ROLE authenticated;
SELECT public._test_auth_as(:'carol'::uuid);
SELECT public._test_assert(
  EXISTS (SELECT 1 FROM public.lists WHERE id = :'link_view'::uuid),
  'member cannot select a link list without the token'
);
SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.lists WHERE id = :'link_edit'::uuid),
  'member of list A can select list B'
);
SELECT public._test_assert(
  NOT (SELECT private.can_edit_list(:'link_view'::uuid)),
  'viewer member can edit a link list'
);

-- Owner can view without the token. Clients cannot pick the share token.
RESET ROLE;
SELECT public._test_auth_clear();
SET LOCAL ROLE authenticated;
SELECT public._test_auth_as(:'alice'::uuid);
SELECT public._test_assert(
  EXISTS (SELECT 1 FROM public.lists WHERE id = :'link_edit'::uuid),
  'owner cannot select their link list'
);

UPDATE public.lists
SET share_token = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
WHERE id = :'link_edit'::uuid;
SELECT public._test_assert(
  (SELECT share_token FROM public.lists WHERE id = :'link_edit'::uuid)
    = (SELECT share_token FROM public._test_tokens WHERE id = :'link_edit'::uuid),
  'owner was able to overwrite share_token'
);

-- Closing link sharing rotates the token and drops grants.
UPDATE public.lists
SET visibility = 'private'
WHERE id = :'link_edit'::uuid;
SELECT public._test_assert(
  (SELECT visibility FROM public.lists WHERE id = :'link_edit'::uuid) = 'private',
  'owner could not close link sharing'
);
SELECT public._test_assert(
  (SELECT share_token FROM public.lists WHERE id = :'link_edit'::uuid)
    IS DISTINCT FROM (SELECT share_token FROM public._test_tokens WHERE id = :'link_edit'::uuid),
  'closing link sharing did not rotate share_token'
);

RESET ROLE;
SELECT public._test_auth_clear();
SELECT public._test_share_header((SELECT share_token FROM public._test_tokens WHERE id = :'link_edit'::uuid));
SET LOCAL ROLE authenticated;
SELECT public._test_auth_as(:'bob'::uuid);
SELECT public._test_assert(
  NOT EXISTS (
    SELECT 1 FROM public.list_link_grants
    WHERE list_id = :'link_edit'::uuid AND user_id = :'bob'::uuid
  ),
  'grants remained after link sharing was turned off'
);
SELECT public._test_assert(
  NOT EXISTS (SELECT 1 FROM public.lists WHERE id = :'link_edit'::uuid),
  'old share token still opens the list after visibility left link'
);

-- Wrong token / public list token is not a share link.
RESET ROLE;
SELECT public._test_auth_clear();
SELECT public._test_share_header(NULL);
SET LOCAL ROLE authenticated;
SELECT public._test_auth_as(:'bob'::uuid);

DO $$
DECLARE
  ok boolean := false;
BEGIN
  BEGIN
    PERFORM public.open_list_share('99999999-9999-9999-9999-999999999999'::uuid);
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'Share link not found%' THEN
        ok := true;
      ELSE
        RAISE EXCEPTION 'assertion failed: unexpected error %', SQLERRM;
      END IF;
  END;
  IF NOT ok THEN
    RAISE EXCEPTION 'assertion failed: open_list_share accepted a missing token';
  END IF;
END $$;

DO $$
DECLARE
  ok boolean := false;
  tok uuid;
BEGIN
  SELECT share_token INTO tok FROM public.lists WHERE id = '44444444-4444-4444-4444-444444444443';
  BEGIN
    PERFORM public.open_list_share(tok);
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE 'Share link not found%' THEN
        ok := true;
      ELSE
        RAISE EXCEPTION 'assertion failed: unexpected error %', SQLERRM;
      END IF;
  END;
  IF NOT ok THEN
    RAISE EXCEPTION 'assertion failed: open_list_share accepted a public list token';
  END IF;
END $$;

RESET ROLE;
SELECT public._test_auth_clear();
SELECT public._test_share_header(NULL);

ROLLBACK;
