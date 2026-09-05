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
  SELECT * INTO src FROM public.items WHERE id = p_item_id;
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
  WHERE i.list_id = p_target_list_id;

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
    p_item_id,
    (SELECT auth.uid()),
    'item_moved',
    jsonb_build_object(
      'target_list_id', p_target_list_id,
      'new_item_id', new_id
    )
  );

  IF p_delete_source THEN
    DELETE FROM public.items WHERE id = p_item_id;
  END IF;

  RETURN new_id;
END;
$$;
