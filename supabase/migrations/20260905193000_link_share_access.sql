-- Anyone-with-the-link lists stay off Explore (visibility = link).
-- settings.linkAccess: view | propose | edit

ALTER TABLE public.lists
  DROP CONSTRAINT IF EXISTS lists_visibility_check;

ALTER TABLE public.lists
  ADD CONSTRAINT lists_visibility_check
  CHECK (visibility IN ('private', 'invite', 'friends', 'public', 'link'));

CREATE OR REPLACE FUNCTION private.can_view_list(p_list_id uuid)
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
      AND (
        l.visibility IN ('public', 'link')
        OR l.owner_id = (SELECT auth.uid())
        OR (
          l.visibility = 'friends'
          AND (SELECT private.are_friends(l.owner_id, (SELECT auth.uid())))
        )
        OR EXISTS (
          SELECT 1
          FROM public.list_members m
          WHERE m.list_id = l.id
            AND m.user_id = (SELECT auth.uid())
        )
      )
  );
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
          l.visibility IN ('public', 'link')
          AND coalesce(l.settings->>'linkAccess', '') = 'edit'
        )
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
          OR (
            l.visibility IN ('public', 'link')
            AND coalesce(l.settings->>'linkAccess', '') = 'propose'
          )
          OR (SELECT private.member_role(l.id, (SELECT auth.uid()))) = 'proposer'
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.peek_list_invite(p_token uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'id', i.id,
    'list_id', i.list_id,
    'role', i.role,
    'status', i.status,
    'list_title', l.title,
    'list_icon', l.icon
  )
  FROM public.list_invites i
  JOIN public.lists l ON l.id = i.list_id
  WHERE i.token = p_token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.accept_list_invite(p_token uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  inv public.list_invites%ROWTYPE;
  uid uuid := (SELECT auth.uid());
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF (SELECT private.is_blocked()) THEN
    RAISE EXCEPTION 'Account blocked';
  END IF;

  SELECT * INTO inv
  FROM public.list_invites
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;
  IF inv.status = 'declined' THEN
    RAISE EXCEPTION 'Invite declined';
  END IF;
  IF inv.invitee_id IS NOT NULL AND inv.invitee_id IS DISTINCT FROM uid THEN
    RAISE EXCEPTION 'Invite is for another user';
  END IF;

  UPDATE public.list_invites
  SET status = 'accepted', invitee_id = uid
  WHERE id = inv.id;

  INSERT INTO public.list_members (list_id, user_id, role)
  VALUES (inv.list_id, uid, inv.role)
  ON CONFLICT (list_id, user_id) DO UPDATE SET role = excluded.role;

  RETURN inv.list_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.peek_list_invite(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_list_invite(uuid) TO authenticated;
