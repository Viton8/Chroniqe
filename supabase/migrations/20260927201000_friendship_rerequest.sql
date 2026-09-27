-- After a decline the pair row stays (friendships_pair_key). Re-requesting
-- must not UPDATE requester_id / addressee_id or flip declined -> pending:
-- draft PR #15 freezes those columns and rejects that transition. Delete the
-- declined row and insert a new pending request so the current user is the
-- requester. Direct INSERT still hits the unique pair index.

CREATE OR REPLACE FUNCTION public.request_friend(p_addressee_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  me uuid := (SELECT auth.uid());
  existing public.friendships%ROWTYPE;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF p_addressee_id IS NULL THEN
    RAISE EXCEPTION 'Addressee is required' USING ERRCODE = '22023';
  END IF;

  IF p_addressee_id = me THEN
    RAISE EXCEPTION 'Cannot send a friend request to yourself' USING ERRCODE = '23514';
  END IF;

  IF (SELECT private.is_blocked()) THEN
    RAISE EXCEPTION 'Account blocked' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO existing
  FROM public.friendships
  WHERE LEAST(requester_id, addressee_id) = LEAST(me, p_addressee_id)
    AND GREATEST(requester_id, addressee_id) = GREATEST(me, p_addressee_id)
  FOR UPDATE;

  IF FOUND THEN
    IF existing.status = 'accepted' THEN
      RAISE EXCEPTION 'Already friends' USING ERRCODE = '23505';
    ELSIF existing.status = 'pending' THEN
      RAISE EXCEPTION 'Friend request already pending' USING ERRCODE = '23505';
    ELSIF existing.status = 'declined' THEN
      DELETE FROM public.friendships WHERE id = existing.id;
    ELSE
      RAISE EXCEPTION 'Invalid friendship status' USING ERRCODE = '23514';
    END IF;
  END IF;

  INSERT INTO public.friendships (requester_id, addressee_id, status)
  VALUES (me, p_addressee_id, 'pending');
END;
$$;

REVOKE ALL ON FUNCTION public.request_friend(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_friend(uuid) TO authenticated;
