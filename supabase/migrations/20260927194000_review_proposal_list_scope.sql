-- Approving a proposal must not touch an item on another list.
-- review_proposal is SECURITY DEFINER, so it bypasses items RLS. Bind every
-- applied change to the proposal's list, and make the pending -> reviewed
-- transition a single locked update so two approvals cannot both apply.
--
-- Rows already stored with another list's item_id are left as they are.
-- Approving one raises and stays pending; rejecting one still does not write items.

CREATE OR REPLACE FUNCTION private.change_proposals_item_on_list()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.action = 'create' THEN
    IF NEW.item_id IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM public.items AS proposal_item
      WHERE proposal_item.id = NEW.item_id
        AND proposal_item.list_id = NEW.list_id
    ) THEN
      RAISE EXCEPTION 'proposal item is not on this list'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.action IN ('update', 'delete', 'check', 'uncheck') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.items AS proposal_item
      WHERE proposal_item.id = NEW.item_id
        AND proposal_item.list_id = NEW.list_id
    ) THEN
      RAISE EXCEPTION 'proposal item is not on this list'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'invalid proposal action'
    USING ERRCODE = '23514';
END;
$$;

DROP TRIGGER IF EXISTS change_proposals_item_on_list ON public.change_proposals;
CREATE TRIGGER change_proposals_item_on_list
  BEFORE INSERT ON public.change_proposals
  FOR EACH ROW EXECUTE FUNCTION private.change_proposals_item_on_list();

GRANT EXECUTE ON FUNCTION private.change_proposals_item_on_list() TO anon, authenticated, service_role;

DROP POLICY IF EXISTS change_proposals_insert ON public.change_proposals;
CREATE POLICY change_proposals_insert ON public.change_proposals
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (SELECT private.can_propose_list(list_id))
    AND (
      (
        action = 'create'
        AND (
          item_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.items AS proposal_item
            WHERE proposal_item.id = change_proposals.item_id
              AND proposal_item.list_id = change_proposals.list_id
          )
        )
      )
      OR (
        action IN ('update', 'delete', 'check', 'uncheck')
        AND EXISTS (
          SELECT 1
          FROM public.items AS proposal_item
          WHERE proposal_item.id = change_proposals.item_id
            AND proposal_item.list_id = change_proposals.list_id
        )
      )
    )
  );

CREATE OR REPLACE FUNCTION public.review_proposal(
  p_proposal_id uuid,
  p_approve boolean,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  prop public.change_proposals%ROWTYPE;
  max_pos double precision;
  touched_id uuid;
BEGIN
  SELECT * INTO prop
  FROM public.change_proposals
  WHERE id = p_proposal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'proposal not found';
  END IF;

  IF prop.status <> 'pending' THEN
    RAISE EXCEPTION 'proposal already reviewed';
  END IF;

  IF NOT (
    (SELECT private.is_list_owner(prop.list_id))
    OR (SELECT private.can_edit_list(prop.list_id))
  ) THEN
    RAISE EXCEPTION 'not allowed to review';
  END IF;

  UPDATE public.change_proposals
  SET
    status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
    reviewer_id = (SELECT auth.uid()),
    review_note = p_note,
    reviewed_at = now()
  WHERE id = p_proposal_id
    AND status = 'pending'
  RETURNING id INTO touched_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'proposal already reviewed';
  END IF;

  IF p_approve THEN
    IF prop.action = 'create' THEN
      IF prop.item_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM public.items AS proposal_item
        WHERE proposal_item.id = prop.item_id
          AND proposal_item.list_id = prop.list_id
      ) THEN
        RAISE EXCEPTION 'proposal item is not on this list';
      END IF;

      SELECT coalesce(max(i.position), 0) + 1 INTO max_pos
      FROM public.items i WHERE i.list_id = prop.list_id;

      INSERT INTO public.items (list_id, values, position, created_by, updated_by)
      VALUES (
        prop.list_id,
        coalesce(prop.payload -> 'values', '{}'::jsonb),
        max_pos,
        prop.user_id,
        (SELECT auth.uid())
      );
    ELSIF prop.action IN ('update', 'delete', 'check', 'uncheck') THEN
      PERFORM 1
      FROM public.items AS proposal_item
      WHERE proposal_item.id = prop.item_id
        AND proposal_item.list_id = prop.list_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'proposal item is not on this list';
      END IF;

      IF prop.action = 'update' THEN
        UPDATE public.items
        SET
          values = coalesce(prop.payload -> 'values', values),
          updated_by = (SELECT auth.uid())
        WHERE id = prop.item_id
          AND list_id = prop.list_id
        RETURNING id INTO touched_id;
      ELSIF prop.action = 'delete' THEN
        DELETE FROM public.items
        WHERE id = prop.item_id
          AND list_id = prop.list_id
        RETURNING id INTO touched_id;
      ELSIF prop.action = 'check' THEN
        UPDATE public.items
        SET is_checked = true, checked_at = now(), updated_by = (SELECT auth.uid())
        WHERE id = prop.item_id
          AND list_id = prop.list_id
        RETURNING id INTO touched_id;
      ELSIF prop.action = 'uncheck' THEN
        UPDATE public.items
        SET is_checked = false, checked_at = NULL, updated_by = (SELECT auth.uid())
        WHERE id = prop.item_id
          AND list_id = prop.list_id
        RETURNING id INTO touched_id;
      END IF;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'proposal item is not on this list';
      END IF;
    ELSE
      RAISE EXCEPTION 'invalid proposal action';
    END IF;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, payload)
  VALUES (
    prop.user_id,
    'proposal_reviewed',
    CASE WHEN p_approve THEN 'Предложение принято' ELSE 'Предложение отклонено' END,
    p_note,
    jsonb_build_object('proposal_id', prop.id, 'list_id', prop.list_id, 'approved', p_approve)
  );
END;
$$;
