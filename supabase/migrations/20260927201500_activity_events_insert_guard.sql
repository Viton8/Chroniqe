-- Client INSERT on activity_events is not needed: item triggers and
-- move_item already write rows as SECURITY DEFINER. Viewers were able to
-- forge feed events and crash friend_feed with a non-uuid target_list_id.

DROP POLICY IF EXISTS activity_events_insert ON public.activity_events;

REVOKE INSERT ON public.activity_events FROM authenticated;
REVOKE INSERT ON public.activity_events FROM anon;

CREATE OR REPLACE FUNCTION private.uuid_if_valid(p_text text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN p_text::uuid
    ELSE NULL
  END;
$$;

GRANT EXECUTE ON FUNCTION private.uuid_if_valid(text) TO postgres, service_role, authenticated, anon;

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
    ON tl.id = private.uuid_if_valid(e.payload ->> 'target_list_id')
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
