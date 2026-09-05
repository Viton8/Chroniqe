ALTER TABLE public.item_comments
  ADD COLUMN IF NOT EXISTS show_author boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_time boolean NOT NULL DEFAULT true;

UPDATE public.item_comments
SET
  show_author = show_attribution,
  show_time = show_attribution
WHERE show_attribution IS NOT NULL;

ALTER TABLE public.item_comments
  DROP COLUMN IF EXISTS show_attribution;
