-- Friend requests: only the addressee may accept or decline a pending row,
-- and only the requester may cancel it. Party ids never change.
--
-- The old friendships_update policy let either participant write the row.
-- Postgres reused USING as the new-row check, so the requester could set
-- status to accepted, point addressee_id at someone else, or revive a
-- declined row. private.are_friends then opened friends-only lists.
--
-- Signed-in users no longer UPDATE friendships directly. Accept and decline
-- go through public.respond_friend, which locks the row. A trigger still
-- freezes the pair and rejects any other transition, including updates that
-- bypass RLS (table owner with a user JWT). Declined rows are left in place
-- so a later fix for re-requesting after a decline can delete and insert;
-- it must not rewrite requester_id or addressee_id.

CREATE OR REPLACE FUNCTION private.guard_friendship_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.requester_id IS DISTINCT FROM OLD.requester_id
     OR NEW.addressee_id IS DISTINCT FROM OLD.addressee_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'friendship parties are immutable' USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    IF NEW.responded_at IS DISTINCT FROM OLD.responded_at THEN
      RAISE EXCEPTION 'invalid friendship transition' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM 'pending'
     OR NEW.status NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'invalid friendship transition' USING ERRCODE = '42501';
  END IF;

  -- A signed-in user must be the addressee, even inside SECURITY DEFINER.
  -- auth.uid() is null for the SQL editor and service role, which may apply
  -- the same pending transition directly.
  IF (SELECT auth.uid()) IS NOT NULL
     AND (SELECT auth.uid()) IS DISTINCT FROM OLD.addressee_id THEN
    RAISE EXCEPTION 'Only the recipient can respond' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS friendships_guard_update ON public.friendships;
CREATE TRIGGER friendships_guard_update
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_friendship_update();

CREATE OR REPLACE FUNCTION private.guard_friendship_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.status = 'pending'
     AND (SELECT auth.uid()) IS NOT NULL
     AND (SELECT auth.uid()) IS DISTINCT FROM OLD.requester_id THEN
    RAISE EXCEPTION 'Only the sender can cancel a friend request' USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS friendships_guard_delete ON public.friendships;
CREATE TRIGGER friendships_guard_delete
  BEFORE DELETE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_friendship_delete();

CREATE OR REPLACE FUNCTION public.respond_friend(p_id uuid, p_accept boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  friendship public.friendships%ROWTYPE;
  next_status text;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_accept IS NULL THEN
    RAISE EXCEPTION 'Accept flag is required' USING ERRCODE = '22023';
  END IF;

  IF (SELECT private.is_blocked()) THEN
    RAISE EXCEPTION 'Account blocked' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO friendship
  FROM public.friendships
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found' USING ERRCODE = 'P0002';
  END IF;

  IF friendship.addressee_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Only the recipient can respond' USING ERRCODE = '42501';
  END IF;

  IF friendship.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Friend request is not pending' USING ERRCODE = '42501';
  END IF;

  next_status := CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END;

  UPDATE public.friendships
  SET
    status = next_status,
    responded_at = now()
  WHERE id = p_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request is not pending' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_friend(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_friend(uuid, boolean) TO authenticated;

-- Direct updates are closed. The restrictive blocked-user policy stays so a
-- future permissive policy cannot forget that check.
DROP POLICY IF EXISTS friendships_update ON public.friendships;

DROP POLICY IF EXISTS friendships_insert ON public.friendships;
CREATE POLICY friendships_insert ON public.friendships
  FOR INSERT TO authenticated
  WITH CHECK (
    requester_id = (SELECT auth.uid())
    AND status = 'pending'
  );

DROP POLICY IF EXISTS friendships_delete ON public.friendships;
CREATE POLICY friendships_delete ON public.friendships
  FOR DELETE TO authenticated
  USING (
    (
      status = 'pending'
      AND requester_id = (SELECT auth.uid())
    )
    OR (
      status IN ('accepted', 'declined')
      AND (
        requester_id = (SELECT auth.uid())
        OR addressee_id = (SELECT auth.uid())
      )
    )
  );
