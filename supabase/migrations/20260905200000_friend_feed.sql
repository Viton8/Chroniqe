-- Friends chronology feed: recent adds / check-offs / moves by accepted friends
-- on lists the viewer is allowed to see. Also keep item titles on moves.

CREATE INDEX IF NOT EXISTS activity_events_actor_created_idx
  ON public.activity_events (actor_id, created_at DESC);

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

CREATE OR REPLACE FUNCTION public.friend_feed(p_limit integer DEFAULT 60)
RETURNS TABLE (
  id uuid,
  list_id uuid,
  item_id uuid,
  actor_id uuid,
  event_type text,
  payload jsonb,
  created_at timestamptz,
  actor_username text,
  actor_display_name text,
  actor_avatar_url text,
  list_title text,
  list_icon text,
  list_schema jsonb,
  target_list_id uuid,
  target_list_title text,
  target_list_icon text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH me AS (
    SELECT auth.uid() AS uid
  ),
  buddy AS (
    SELECT CASE
      WHEN f.requester_id = me.uid THEN f.addressee_id
      ELSE f.requester_id
    END AS friend_id
    FROM public.friendships f
    CROSS JOIN me
    WHERE f.status = 'accepted'
      AND me.uid IS NOT NULL
      AND (f.requester_id = me.uid OR f.addressee_id = me.uid)
  )
  SELECT
    e.id,
    e.list_id,
    e.item_id,
    e.actor_id,
    e.event_type,
    e.payload,
    e.created_at,
    p.username,
    p.display_name,
    p.avatar_url,
    l.title,
    l.icon,
    l.schema,
    tl.id,
    tl.title,
    tl.icon
  FROM public.activity_events e
  JOIN buddy b ON b.friend_id = e.actor_id
  JOIN public.profiles p ON p.id = e.actor_id
  LEFT JOIN public.lists l ON l.id = e.list_id
  LEFT JOIN public.lists tl
    ON tl.id = NULLIF(e.payload ->> 'target_list_id', '')::uuid
   AND (SELECT private.can_view_list(tl.id))
  WHERE (SELECT uid FROM me) IS NOT NULL
    AND e.actor_id IS DISTINCT FROM (SELECT uid FROM me)
    AND e.event_type IN ('item_created', 'item_checked', 'item_unchecked', 'item_moved')
    AND e.list_id IS NOT NULL
    AND p.blocked_at IS NULL
    AND (SELECT private.can_view_list(e.list_id))
  ORDER BY e.created_at DESC
  LIMIT LEAST(100, GREATEST(1, COALESCE(p_limit, 60)));
$$;

REVOKE ALL ON FUNCTION public.friend_feed(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.friend_feed(integer) TO authenticated;
