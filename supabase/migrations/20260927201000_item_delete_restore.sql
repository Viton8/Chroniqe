-- Soft-delete items so undo can restore the original id together with
-- ratings, comments, and proposals. Bulk delete/restore run in one RPC.

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS items_list_alive_position_idx
  ON public.items (list_id, position)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Hide deleted rows from ordinary reads/writes. Restore goes through RPC.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS items_select ON public.items;
CREATE POLICY items_select ON public.items
  FOR SELECT TO anon, authenticated
  USING (
    (SELECT private.can_view_list(list_id))
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS items_insert ON public.items;
CREATE POLICY items_insert ON public.items
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.can_edit_list(list_id))
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS items_update ON public.items;
CREATE POLICY items_update ON public.items
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.can_edit_list(list_id))
    AND deleted_at IS NULL
  )
  WITH CHECK (
    (SELECT private.can_edit_list(list_id))
    AND deleted_at IS NULL
  );

-- Hard DELETE cascaded from lists / move_item / review_proposal still works
-- (those run as table owner or SECURITY DEFINER). Authenticated clients cannot
-- skip the RPC and drop ratings/comments.
DROP POLICY IF EXISTS items_delete ON public.items;

CREATE OR REPLACE FUNCTION private.can_write_item_rating(p_item_id uuid, p_field_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.items i
    JOIN public.lists l ON l.id = i.list_id
    WHERE i.id = p_item_id
      AND i.deleted_at IS NULL
      AND (SELECT auth.uid()) IS NOT NULL
      AND NOT (SELECT private.is_blocked())
      AND (
        (SELECT private.can_edit_list(i.list_id))
        OR (
          (SELECT private.can_view_list(i.list_id))
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(coalesce(l.schema->'fields', '[]'::jsonb)) f
            WHERE f->>'id' = p_field_id
              AND f->>'type' = 'community_rating'
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.log_item_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_list_id uuid;
  v_item_id uuid;
  v_type text;
  v_payload jsonb := '{}'::jsonb;
  subscriber uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_list_id := OLD.list_id;
    v_item_id := OLD.id;
    v_type := 'item_deleted';
    v_payload := jsonb_build_object('values', OLD.values);
  ELSIF TG_OP = 'INSERT' THEN
    v_list_id := NEW.list_id;
    v_item_id := NEW.id;
    v_type := 'item_created';
    v_payload := jsonb_build_object('values', NEW.values);
  ELSIF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    v_list_id := NEW.list_id;
    v_item_id := NEW.id;
    v_type := 'item_deleted';
    v_payload := jsonb_build_object('values', OLD.values);
  ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
    v_list_id := NEW.list_id;
    v_item_id := NEW.id;
    v_type := 'item_created';
    v_payload := jsonb_build_object('values', NEW.values);
  ELSE
    v_list_id := NEW.list_id;
    v_item_id := NEW.id;
    IF OLD.is_checked IS DISTINCT FROM NEW.is_checked THEN
      v_type := CASE WHEN NEW.is_checked THEN 'item_checked' ELSE 'item_unchecked' END;
    ELSE
      v_type := 'item_updated';
    END IF;
    v_payload := jsonb_build_object('values', NEW.values);
  END IF;

  INSERT INTO public.activity_events (list_id, item_id, actor_id, event_type, payload)
  VALUES (
    v_list_id,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE v_item_id END,
    (SELECT auth.uid()),
    v_type,
    v_payload
  );

  FOR subscriber IN
    SELECT s.user_id
    FROM public.list_subscriptions s
    WHERE s.list_id = v_list_id
      AND s.user_id IS DISTINCT FROM (SELECT auth.uid())
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, payload)
    VALUES (
      subscriber,
      v_type,
      'Изменения в списке',
      v_type,
      jsonb_build_object('list_id', v_list_id, 'item_id', v_item_id, 'event', v_type)
    );
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private._lock_editable_items(p_item_ids uuid[])
RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  ids uuid[];
  found int;
BEGIN
  SELECT array_agg(DISTINCT x ORDER BY x)
  INTO ids
  FROM unnest(p_item_ids) AS x
  WHERE x IS NOT NULL;

  IF ids IS NULL THEN
    RETURN ARRAY[]::uuid[];
  END IF;

  PERFORM i.id
  FROM public.items i
  WHERE i.id = ANY (ids)
  ORDER BY i.id
  FOR UPDATE OF i;

  SELECT count(*)::int INTO found FROM public.items i WHERE i.id = ANY (ids);
  IF found <> cardinality(ids) THEN
    RAISE EXCEPTION 'item not found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.items i
    WHERE i.id = ANY (ids)
      AND NOT (SELECT private.can_edit_list(i.list_id))
  ) THEN
    RAISE EXCEPTION 'cannot edit';
  END IF;

  RETURN ids;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_items(p_item_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  ids uuid[];
BEGIN
  ids := private._lock_editable_items(p_item_ids);
  IF cardinality(ids) = 0 THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.items i WHERE i.id = ANY (ids) AND i.deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'item already deleted';
  END IF;

  UPDATE public.items
  SET
    deleted_at = now(),
    updated_by = (SELECT auth.uid())
  WHERE id = ANY (ids)
    AND deleted_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_items(p_item_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  ids uuid[];
BEGIN
  ids := private._lock_editable_items(p_item_ids);
  IF cardinality(ids) = 0 THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.items i WHERE i.id = ANY (ids) AND i.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'item is not deleted';
  END IF;

  UPDATE public.items
  SET
    deleted_at = NULL,
    updated_by = (SELECT auth.uid())
  WHERE id = ANY (ids)
    AND deleted_at IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION private._lock_editable_items(uuid[]) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.delete_items(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_items(uuid[]) TO authenticated;

REVOKE ALL ON FUNCTION public.restore_items(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_items(uuid[]) TO authenticated;

-- Refuse to move a soft-deleted row (would copy it back into a live list).
CREATE OR REPLACE FUNCTION public.move_item(
  p_item_id uuid,
  p_target_list_id uuid,
  p_field_map jsonb DEFAULT '{}'::jsonb,
  p_delete_source boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  src public.items%ROWTYPE;
  new_values jsonb := '{}'::jsonb;
  new_id uuid;
  max_pos double precision;
BEGIN
  SELECT * INTO src FROM public.items WHERE id = p_item_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'item not found';
  END IF;

  IF NOT (SELECT private.can_edit_list(src.list_id)) THEN
    RAISE EXCEPTION 'cannot edit source list';
  END IF;

  IF NOT (SELECT private.can_edit_list(p_target_list_id)) THEN
    RAISE EXCEPTION 'cannot edit target list';
  END IF;

  IF p_field_map IS NULL OR p_field_map = '{}'::jsonb THEN
    new_values := src.values;
  ELSE
    new_values := (
      SELECT coalesce(jsonb_object_agg(map.value, src.values -> map.key), '{}'::jsonb)
      FROM jsonb_each_text(p_field_map) AS map(key, value)
      WHERE src.values ? map.key
    );
  END IF;

  SELECT coalesce(max(i.position), 0) + 1
  INTO max_pos
  FROM public.items i
  WHERE i.list_id = p_target_list_id
    AND i.deleted_at IS NULL;

  INSERT INTO public.items (
    list_id,
    values,
    position,
    is_checked,
    checked_at,
    check_snapshot,
    created_by,
    updated_by
  )
  VALUES (
    p_target_list_id,
    new_values,
    max_pos,
    src.is_checked,
    src.checked_at,
    src.check_snapshot,
    (SELECT auth.uid()),
    (SELECT auth.uid())
  )
  RETURNING id INTO new_id;

  INSERT INTO public.item_ratings (item_id, field_id, user_id, value, created_at, updated_at)
  SELECT new_id, r.field_id, r.user_id, r.value, r.created_at, r.updated_at
  FROM public.item_ratings r
  WHERE r.item_id = p_item_id;

  INSERT INTO public.item_comments (item_id, user_id, body, color, show_author, show_time, created_at, updated_at)
  SELECT new_id, c.user_id, c.body, c.color, c.show_author, c.show_time, c.created_at, c.updated_at
  FROM public.item_comments c
  WHERE c.item_id = p_item_id;

  INSERT INTO public.activity_events (list_id, item_id, actor_id, event_type, payload)
  VALUES (
    src.list_id,
    new_id,
    (SELECT auth.uid()),
    'item_moved',
    jsonb_build_object(
      'source_list_id', src.list_id,
      'target_list_id', p_target_list_id,
      'new_item_id', new_id,
      'values', src.values
    )
  );

  IF p_delete_source THEN
    DELETE FROM public.items WHERE id = p_item_id;
  END IF;

  RETURN new_id;
END;
$$;
