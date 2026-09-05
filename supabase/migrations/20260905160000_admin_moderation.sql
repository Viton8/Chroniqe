-- App-wide admin role, user blocking, and admin-only RPCs.
-- Promote an admin in the SQL editor (not from the client):
--   UPDATE public.profiles SET is_admin = true WHERE username = 'your_username';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_at timestamptz;

CREATE INDEX IF NOT EXISTS profiles_blocked_at_idx
  ON public.profiles (blocked_at)
  WHERE blocked_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.is_blocked()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.blocked_at IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.is_admin = true
      AND p.blocked_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION private.not_blocked()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT NOT (SELECT private.is_blocked());
$$;

CREATE OR REPLACE FUNCTION private.can_edit_list(p_list_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lists l
    WHERE l.id = p_list_id
      AND (SELECT auth.uid()) IS NOT NULL
      AND NOT (SELECT private.is_blocked())
      AND (
        l.owner_id = (SELECT auth.uid())
        OR (
          l.edit_mode = 'selected'
          AND (SELECT private.member_role(l.id, (SELECT auth.uid()))) = 'editor'
        )
        OR (
          l.edit_mode = 'friends'
          AND (SELECT private.are_friends(l.owner_id, (SELECT auth.uid())))
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_propose_list(p_list_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (SELECT auth.uid()) IS NOT NULL
    AND NOT (SELECT private.is_blocked())
    AND (SELECT private.can_view_list(p_list_id))
    AND NOT (SELECT private.can_edit_list(p_list_id))
    AND EXISTS (
      SELECT 1
      FROM public.lists l
      WHERE l.id = p_list_id
        AND (
          l.edit_mode = 'proposals'
          OR (SELECT private.member_role(l.id, (SELECT auth.uid()))) = 'proposer'
        )
    );
$$;

CREATE OR REPLACE FUNCTION private.is_list_owner(p_list_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lists l
    WHERE l.id = p_list_id
      AND l.owner_id = (SELECT auth.uid())
      AND NOT (SELECT private.is_blocked())
  );
$$;

-- Clients must not flip is_admin / blocked_at. Admins use RPCs (app.admin_write).
-- SQL editor / service_role can still promote the first admin.
CREATE OR REPLACE FUNCTION private.guard_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  jwt_role text := coalesce((SELECT auth.jwt() ->> 'role'), '');
  has_jwt boolean := (SELECT auth.jwt()) IS NOT NULL;
  admin_write text := coalesce(current_setting('app.admin_write', true), '');
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    IF jwt_role = 'service_role' OR (NOT has_jwt AND current_user IN ('postgres', 'supabase_admin')) THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'cannot change admin flag' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.blocked_at IS DISTINCT FROM OLD.blocked_at THEN
    IF admin_write = 'on'
       OR jwt_role = 'service_role'
       OR (NOT has_jwt AND current_user IN ('postgres', 'supabase_admin')) THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'cannot change block status' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_privileges ON public.profiles;
CREATE TRIGGER profiles_guard_privileges
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_profile_privileges();

-- ---------------------------------------------------------------------------
-- Blocked users cannot write (RESTRICTIVE policies AND with existing ones)
-- ---------------------------------------------------------------------------

CREATE POLICY profiles_update_not_blocked ON public.profiles
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((SELECT private.not_blocked()))
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY friendships_insert_not_blocked ON public.friendships
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY friendships_update_not_blocked ON public.friendships
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((SELECT private.not_blocked()))
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY friendships_delete_not_blocked ON public.friendships
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING ((SELECT private.not_blocked()));

CREATE POLICY lists_insert_not_blocked ON public.lists
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY lists_update_not_blocked ON public.lists
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((SELECT private.not_blocked()))
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY lists_delete_not_blocked ON public.lists
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING ((SELECT private.not_blocked()));

CREATE POLICY list_members_insert_not_blocked ON public.list_members
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY list_members_update_not_blocked ON public.list_members
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((SELECT private.not_blocked()))
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY list_members_delete_not_blocked ON public.list_members
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING ((SELECT private.not_blocked()));

CREATE POLICY list_invites_insert_not_blocked ON public.list_invites
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY list_invites_update_not_blocked ON public.list_invites
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((SELECT private.not_blocked()))
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY items_insert_not_blocked ON public.items
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY items_update_not_blocked ON public.items
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((SELECT private.not_blocked()))
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY items_delete_not_blocked ON public.items
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING ((SELECT private.not_blocked()));

CREATE POLICY item_ratings_insert_not_blocked ON public.item_ratings
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY item_ratings_update_not_blocked ON public.item_ratings
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((SELECT private.not_blocked()))
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY item_ratings_delete_not_blocked ON public.item_ratings
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING ((SELECT private.not_blocked()));

CREATE POLICY item_comments_insert_not_blocked ON public.item_comments
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY item_comments_update_not_blocked ON public.item_comments
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((SELECT private.not_blocked()))
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY item_comments_delete_not_blocked ON public.item_comments
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING ((SELECT private.not_blocked()));

CREATE POLICY change_proposals_insert_not_blocked ON public.change_proposals
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY list_subscriptions_insert_not_blocked ON public.list_subscriptions
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY list_subscriptions_delete_not_blocked ON public.list_subscriptions
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING ((SELECT private.not_blocked()));

CREATE POLICY list_automations_insert_not_blocked ON public.list_automations
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY list_automations_update_not_blocked ON public.list_automations
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((SELECT private.not_blocked()))
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY list_automations_delete_not_blocked ON public.list_automations
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING ((SELECT private.not_blocked()));

CREATE POLICY list_charts_insert_not_blocked ON public.list_charts
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY list_charts_update_not_blocked ON public.list_charts
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((SELECT private.not_blocked()))
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY list_charts_delete_not_blocked ON public.list_charts
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING ((SELECT private.not_blocked()));

CREATE POLICY activity_events_insert_not_blocked ON public.activity_events
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY notifications_update_not_blocked ON public.notifications
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((SELECT private.not_blocked()))
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY notifications_delete_not_blocked ON public.notifications
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING ((SELECT private.not_blocked()));

CREATE POLICY files_insert_not_blocked ON public.files
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY files_update_not_blocked ON public.files
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((SELECT private.not_blocked()))
  WITH CHECK ((SELECT private.not_blocked()));

CREATE POLICY files_delete_not_blocked ON public.files
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING ((SELECT private.not_blocked()));

CREATE POLICY avatars_insert_not_blocked ON storage.objects
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (bucket_id <> 'avatars' OR (SELECT private.not_blocked()));

CREATE POLICY avatars_update_not_blocked ON storage.objects
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (bucket_id <> 'avatars' OR (SELECT private.not_blocked()))
  WITH CHECK (bucket_id <> 'avatars' OR (SELECT private.not_blocked()));

CREATE POLICY avatars_delete_not_blocked ON storage.objects
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (bucket_id <> 'avatars' OR (SELECT private.not_blocked()));

CREATE POLICY list_files_write_not_blocked ON storage.objects
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (bucket_id <> 'list-files' OR (SELECT private.not_blocked()));

CREATE POLICY list_files_update_not_blocked ON storage.objects
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (bucket_id <> 'list-files' OR (SELECT private.not_blocked()))
  WITH CHECK (bucket_id <> 'list-files' OR (SELECT private.not_blocked()));

CREATE POLICY list_files_delete_not_blocked ON storage.objects
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (bucket_id <> 'list-files' OR (SELECT private.not_blocked()));

-- ---------------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_delete_public_list(p_list_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT (SELECT private.is_admin()) THEN
    RAISE EXCEPTION 'ADMIN_NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.lists
  WHERE id = p_list_id
    AND visibility = 'public';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ADMIN_LIST_NOT_PUBLIC' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_blocked(p_user_id uuid, p_blocked boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target public.profiles%ROWTYPE;
BEGIN
  IF NOT (SELECT private.is_admin()) THEN
    RAISE EXCEPTION 'ADMIN_NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;

  IF p_user_id = (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'ADMIN_CANNOT_BLOCK_SELF' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO target FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ADMIN_USER_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF target.is_admin THEN
    RAISE EXCEPTION 'ADMIN_CANNOT_BLOCK_ADMIN' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.admin_write', 'on', true);

  UPDATE public.profiles
  SET blocked_at = CASE
    WHEN p_blocked THEN coalesce(blocked_at, now())
    ELSE NULL
  END
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_profiles(
  p_query text DEFAULT '',
  p_limit integer DEFAULT 80
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  q text := regexp_replace(trim(coalesce(p_query, '')), '[%_\\,()]', '', 'g');
  lim integer := least(greatest(coalesce(p_limit, 80), 1), 200);
BEGIN
  IF NOT (SELECT private.is_admin()) THEN
    RAISE EXCEPTION 'ADMIN_NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT p.*
  FROM public.profiles p
  WHERE q = ''
     OR p.username ILIKE '%' || q || '%'
     OR p.display_name ILIKE '%' || q || '%'
  ORDER BY p.created_at DESC
  LIMIT lim;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_public_list(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_user_blocked(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_profiles(text, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_delete_public_list(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_blocked(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles(text, integer) TO authenticated;

GRANT EXECUTE ON FUNCTION private.is_blocked() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.not_blocked() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.guard_profile_privileges() TO postgres, service_role;
