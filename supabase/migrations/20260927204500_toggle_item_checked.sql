-- Check-off, snapshot, and on-check/on-uncheck actions (including moves) must
-- run in one transaction. The browser used to UPDATE is_checked, then fire each
-- action as its own request, so a failed move left the item checked. Approving
-- a check proposal only flipped is_checked and never ran settings.onCheck.
--
-- Clients and review_proposal both call public.toggle_item_checked.
--
-- Overlap with draft PR #14 (review_proposal list-scope): this migration
-- replaces review_proposal based on main, changing only the check/uncheck
-- branches. If #14 lands first, keep its locking and list-scope guards and
-- swap those two UPDATE blocks for PERFORM public.toggle_item_checked(...).
-- If this lands first, #14 should keep those PERFORM calls when it rewrites
-- the function.

CREATE OR REPLACE FUNCTION private.schema_field_type(p_schema jsonb, p_field_id text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT f->>'type'
  FROM jsonb_array_elements(coalesce(p_schema -> 'fields', '[]'::jsonb)) AS f
  WHERE f->>'id' = p_field_id
  LIMIT 1;
$$;

-- Mirrors src/lib/automations.ts stampForField.
CREATE OR REPLACE FUNCTION private.check_action_stamp(
  p_field_type text,
  p_token text,
  p_now_date text,
  p_now_datetime text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_field_type = 'datetime' THEN p_now_datetime
    WHEN p_field_type = 'date' OR p_token IN ('today', 'set_now') THEN p_now_date
    ELSE p_now_datetime
  END;
$$;

CREATE OR REPLACE FUNCTION private.apply_item_actions(
  p_item_id uuid,
  p_actions jsonb,
  p_schema jsonb,
  p_now_date text,
  p_now_datetime text
)
RETURNS public.items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current public.items%ROWTYPE;
  action jsonb;
  action_type text;
  field_id text;
  field_type text;
  stamp text;
  raw jsonb;
  new_id uuid;
BEGIN
  SELECT * INTO current FROM public.items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'item not found';
  END IF;

  IF p_actions IS NULL OR jsonb_typeof(p_actions) <> 'array' THEN
    RETURN current;
  END IF;

  FOR action IN SELECT value FROM jsonb_array_elements(p_actions) AS t(value)
  LOOP
    action_type := action->>'type';

    IF action_type IN ('set_now', 'set_field') THEN
      field_id := action->>'fieldId';
      IF field_id IS NULL OR field_id = '' THEN
        CONTINUE;
      END IF;
      field_type := private.schema_field_type(p_schema, field_id);
      IF action_type = 'set_now' THEN
        stamp := private.check_action_stamp(field_type, 'set_now', p_now_date, p_now_datetime);
        current.values := jsonb_set(current.values, ARRAY[field_id], to_jsonb(stamp), true);
      ELSE
        raw := action->'value';
        IF raw = to_jsonb('$now'::text) THEN
          stamp := private.check_action_stamp(field_type, 'now', p_now_date, p_now_datetime);
          current.values := jsonb_set(current.values, ARRAY[field_id], to_jsonb(stamp), true);
        ELSIF raw = to_jsonb('$today'::text) THEN
          stamp := private.check_action_stamp(field_type, 'today', p_now_date, p_now_datetime);
          current.values := jsonb_set(current.values, ARRAY[field_id], to_jsonb(stamp), true);
        ELSE
          current.values := jsonb_set(current.values, ARRAY[field_id], coalesce(raw, 'null'::jsonb), true);
        END IF;
      END IF;

      UPDATE public.items
      SET
        values = current.values,
        updated_by = (SELECT auth.uid())
      WHERE id = current.id
      RETURNING * INTO current;

    ELSIF action_type = 'restore_snapshot' THEN
      IF current.check_snapshot IS NOT NULL THEN
        UPDATE public.items
        SET
          values = current.check_snapshot,
          check_snapshot = NULL,
          updated_by = (SELECT auth.uid())
        WHERE id = current.id
        RETURNING * INTO current;
      END IF;

    ELSIF action_type = 'move_to_list' THEN
      IF coalesce(action->>'targetListId', '') = '' THEN
        RAISE EXCEPTION 'move target list is required';
      END IF;
      new_id := public.move_item(
        current.id,
        (action->>'targetListId')::uuid,
        coalesce(action->'fieldMap', '{}'::jsonb),
        coalesce((action->>'deleteSource')::boolean, true)
      );
      SELECT * INTO current FROM public.items WHERE id = new_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'moved item not found';
      END IF;
    END IF;
  END LOOP;

  RETURN current;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_item_checked(
  p_item_id uuid,
  p_checked boolean,
  p_now_date text DEFAULT NULL,
  p_now_datetime text DEFAULT NULL
)
RETURNS public.items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  src public.items%ROWTYPE;
  lst public.lists%ROWTYPE;
  current public.items%ROWTYPE;
  leftover public.items%ROWTYPE;
  actions jsonb := '[]'::jsonb;
  auto_actions jsonb;
  now_date text;
  now_datetime text;
BEGIN
  now_date := coalesce(
    nullif(btrim(p_now_date), ''),
    to_char((timezone('UTC', now()))::date, 'YYYY-MM-DD')
  );
  now_datetime := coalesce(
    nullif(btrim(p_now_datetime), ''),
    to_char(timezone('UTC', now()), 'YYYY-MM-DD"T"HH24:MI')
  );

  SELECT * INTO src FROM public.items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'item not found';
  END IF;

  IF NOT (SELECT private.can_edit_list(src.list_id)) THEN
    RAISE EXCEPTION 'cannot edit source list';
  END IF;

  SELECT * INTO lst FROM public.lists WHERE id = src.list_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'list not found';
  END IF;

  UPDATE public.items
  SET
    is_checked = p_checked,
    checked_at = CASE WHEN p_checked THEN now() ELSE NULL END,
    check_snapshot = CASE WHEN p_checked THEN src.values ELSE src.check_snapshot END,
    updated_by = (SELECT auth.uid())
  WHERE id = p_item_id
  RETURNING * INTO current;

  IF p_checked THEN
    actions := coalesce(lst.settings -> 'onCheck', '[]'::jsonb);
  ELSE
    actions := coalesce(lst.settings -> 'onUncheck', '[]'::jsonb);
  END IF;
  IF jsonb_typeof(actions) <> 'array' THEN
    actions := '[]'::jsonb;
  END IF;

  FOR auto_actions IN
    SELECT a.actions
    FROM public.list_automations a
    WHERE a.list_id = lst.id
      AND a.enabled
      AND a.trigger->>'type' = CASE WHEN p_checked THEN 'checked' ELSE 'unchecked' END
    ORDER BY a.created_at, a.id
  LOOP
    IF jsonb_typeof(auto_actions) = 'array' THEN
      actions := actions || auto_actions;
    END IF;
  END LOOP;

  current := private.apply_item_actions(
    current.id,
    actions,
    lst.schema,
    now_date,
    now_datetime
  );

  -- Prefer the source row when it still exists (copy-without-delete). The
  -- client drops the source only when this returned row lives on another list.
  SELECT * INTO leftover FROM public.items WHERE id = p_item_id;
  IF FOUND THEN
    RETURN leftover;
  END IF;
  RETURN current;
END;
$$;

GRANT EXECUTE ON FUNCTION private.schema_field_type(jsonb, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.check_action_stamp(text, text, text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.apply_item_actions(uuid, jsonb, jsonb, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_item_checked(uuid, boolean, text, text) TO authenticated;

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
BEGIN
  SELECT * INTO prop FROM public.change_proposals WHERE id = p_proposal_id;
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
  WHERE id = p_proposal_id;

  IF p_approve THEN
    IF prop.action = 'create' THEN
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
    ELSIF prop.action = 'update' AND prop.item_id IS NOT NULL THEN
      UPDATE public.items
      SET
        values = coalesce(prop.payload -> 'values', values),
        updated_by = (SELECT auth.uid())
      WHERE id = prop.item_id;
    ELSIF prop.action = 'delete' AND prop.item_id IS NOT NULL THEN
      DELETE FROM public.items WHERE id = prop.item_id;
    ELSIF prop.action = 'check' AND prop.item_id IS NOT NULL THEN
      PERFORM public.toggle_item_checked(prop.item_id, true);
    ELSIF prop.action = 'uncheck' AND prop.item_id IS NOT NULL THEN
      PERFORM public.toggle_item_checked(prop.item_id, false);
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
