-- INSERT ... RETURNING evaluates SELECT RLS on the new row. can_view_list()
-- re-queries public.lists and can miss the in-flight row, so owners must
-- pass USING via the row's owner_id column.
ALTER TABLE public.lists
  ALTER COLUMN owner_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS lists_select ON public.lists;

CREATE POLICY lists_select ON public.lists
  FOR SELECT TO anon, authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR visibility = 'public'
    OR (SELECT private.can_view_list(id))
  );
