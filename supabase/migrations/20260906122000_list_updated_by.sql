-- Last editor of a list, including item changes. Owner-only RLS on lists
-- means item triggers must stamp the row as SECURITY DEFINER.

ALTER TABLE public.lists
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

UPDATE public.lists
SET updated_by = owner_id
WHERE updated_by IS NULL;

CREATE INDEX IF NOT EXISTS lists_updated_by_idx ON public.lists (updated_by);
CREATE INDEX IF NOT EXISTS lists_updated_at_idx ON public.lists (updated_at DESC);

CREATE OR REPLACE FUNCTION private.lists_stamp_actor()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL THEN
    NEW.updated_by := (SELECT auth.uid());
  ELSIF NEW.updated_by IS NULL THEN
    NEW.updated_by := NEW.owner_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lists_stamp_actor ON public.lists;
CREATE TRIGGER lists_stamp_actor
  BEFORE INSERT OR UPDATE ON public.lists
  FOR EACH ROW EXECUTE FUNCTION private.lists_stamp_actor();

CREATE OR REPLACE FUNCTION private.touch_list_from_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.lists
  SET updated_at = now()
  WHERE id = COALESCE(NEW.list_id, OLD.list_id);
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS items_touch_list ON public.items;
CREATE TRIGGER items_touch_list
  AFTER INSERT OR UPDATE OR DELETE ON public.items
  FOR EACH ROW EXECUTE FUNCTION private.touch_list_from_item();
