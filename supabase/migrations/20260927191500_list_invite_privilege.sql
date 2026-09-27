-- Invitees could change any column on their invite (role, list_id, token, status)
-- and accept_list_invite copied that role into list_members, including over an
-- existing membership. Accept also treated anything except "declined" as usable,
-- so a consumed invite could be accepted again. Owners had no DELETE policy, so
-- they could not revoke a token.

CREATE OR REPLACE FUNCTION private.guard_list_invite_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  accept_id text := coalesce(current_setting('chroniqe.invite_accept', true), '');
  jwt_role text := coalesce((SELECT auth.jwt() ->> 'role'), '');
BEGIN
  -- accept_list_invite sets this for the locked row. The transition may stamp
  -- status and invitee_id only. Role, list, and token stay as the owner wrote them,
  -- even if a caller manages to set the same flag.
  IF accept_id = OLD.id::text THEN
    IF (to_jsonb(OLD) - 'status' - 'invitee_id')
       IS DISTINCT FROM (to_jsonb(NEW) - 'status' - 'invitee_id')
       OR OLD.status IS DISTINCT FROM 'pending'
       OR NEW.status IS DISTINCT FROM 'accepted'
       OR NEW.invitee_id IS DISTINCT FROM (SELECT auth.uid())
       OR (OLD.invitee_id IS NOT NULL AND OLD.invitee_id IS DISTINCT FROM NEW.invitee_id) THEN
      RAISE EXCEPTION 'invite accept cannot change role, list, or token'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- SQL editor / service_role maintenance. Client JWTs stay on the rules below,
  -- including writes from SECURITY DEFINER functions they call.
  IF jwt_role = 'service_role'
     OR (
       jwt_role = ''
       AND current_user NOT IN ('authenticated', 'anon')
     ) THEN
    RETURN NEW;
  END IF;

  IF (SELECT private.is_list_owner(OLD.list_id)) THEN
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM 'pending'
     OR NEW.status IS DISTINCT FROM 'declined'
     OR (to_jsonb(OLD) - 'status') IS DISTINCT FROM (to_jsonb(NEW) - 'status') THEN
    RAISE EXCEPTION 'invitees may only decline a pending invite'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION private.guard_list_invite_update() TO postgres, service_role, authenticated, anon;

DROP TRIGGER IF EXISTS list_invites_guard_update ON public.list_invites;
CREATE TRIGGER list_invites_guard_update
  BEFORE UPDATE ON public.list_invites
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_list_invite_update();

DROP POLICY IF EXISTS list_invites_update ON public.list_invites;
CREATE POLICY list_invites_update ON public.list_invites
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_list_owner(list_id))
    OR invitee_id = (SELECT auth.uid())
  )
  WITH CHECK (
    (SELECT private.is_list_owner(list_id))
    OR (
      invitee_id = (SELECT auth.uid())
      AND status = 'declined'
    )
  );

DROP POLICY IF EXISTS list_invites_delete ON public.list_invites;
CREATE POLICY list_invites_delete ON public.list_invites
  FOR DELETE TO authenticated
  USING ((SELECT private.is_list_owner(list_id)));

DROP POLICY IF EXISTS list_invites_delete_not_blocked ON public.list_invites;
CREATE POLICY list_invites_delete_not_blocked ON public.list_invites
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING ((SELECT private.not_blocked()));

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
  IF inv.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Invite is not pending';
  END IF;
  IF inv.invitee_id IS NOT NULL AND inv.invitee_id IS DISTINCT FROM uid THEN
    RAISE EXCEPTION 'Invite is for another user';
  END IF;

  PERFORM set_config('chroniqe.invite_accept', inv.id::text, true);

  UPDATE public.list_invites
  SET status = 'accepted', invitee_id = uid
  WHERE id = inv.id;

  PERFORM set_config('chroniqe.invite_accept', '', true);

  INSERT INTO public.list_members (list_id, user_id, role)
  VALUES (inv.list_id, uid, inv.role)
  ON CONFLICT (list_id, user_id) DO UPDATE SET role = excluded.role;

  RETURN inv.list_id;
END;
$$;
