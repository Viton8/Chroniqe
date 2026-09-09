-- Authors can edit or withdraw a pending proposal before it is reviewed.

CREATE OR REPLACE FUNCTION private.change_proposals_protect()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.list_id IS DISTINCT FROM OLD.list_id
     OR NEW.item_id IS DISTINCT FROM OLD.item_id
     OR NEW.action IS DISTINCT FROM OLD.action THEN
    RAISE EXCEPTION 'cannot change proposal identity';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS change_proposals_protect ON public.change_proposals;
CREATE TRIGGER change_proposals_protect
  BEFORE UPDATE ON public.change_proposals
  FOR EACH ROW EXECUTE FUNCTION private.change_proposals_protect();

DROP POLICY IF EXISTS change_proposals_update_own ON public.change_proposals;
CREATE POLICY change_proposals_update_own ON public.change_proposals
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND status = 'pending'
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND status = 'pending'
    AND (SELECT private.can_propose_list(list_id))
  );

DROP POLICY IF EXISTS change_proposals_delete_own ON public.change_proposals;
CREATE POLICY change_proposals_delete_own ON public.change_proposals
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND status = 'pending'
  );

DROP POLICY IF EXISTS change_proposals_update_not_blocked ON public.change_proposals;
CREATE POLICY change_proposals_update_not_blocked ON public.change_proposals
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((SELECT private.not_blocked()))
  WITH CHECK ((SELECT private.not_blocked()));

DROP POLICY IF EXISTS change_proposals_delete_not_blocked ON public.change_proposals;
CREATE POLICY change_proposals_delete_not_blocked ON public.change_proposals
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING ((SELECT private.not_blocked()));
