-- multi_rating: only list editors. community_rating: any signed-in viewer.

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

GRANT EXECUTE ON FUNCTION private.can_write_item_rating(uuid, text) TO anon, authenticated;

DROP POLICY IF EXISTS item_ratings_insert ON public.item_ratings;
CREATE POLICY item_ratings_insert ON public.item_ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (SELECT private.can_write_item_rating(item_id, field_id))
  );

DROP POLICY IF EXISTS item_ratings_update ON public.item_ratings;
CREATE POLICY item_ratings_update ON public.item_ratings
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND (SELECT private.can_write_item_rating(item_id, field_id))
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (SELECT private.can_write_item_rating(item_id, field_id))
  );

DROP POLICY IF EXISTS item_ratings_delete ON public.item_ratings;
CREATE POLICY item_ratings_delete ON public.item_ratings
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND (SELECT private.can_write_item_rating(item_id, field_id))
  );
