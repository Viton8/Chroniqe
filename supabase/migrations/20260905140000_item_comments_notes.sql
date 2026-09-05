ALTER TABLE public.item_comments
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT 'violet',
  ADD COLUMN IF NOT EXISTS show_attribution boolean NOT NULL DEFAULT true;

ALTER TABLE public.item_comments
  DROP CONSTRAINT IF EXISTS item_comments_color_check;

ALTER TABLE public.item_comments
  ADD CONSTRAINT item_comments_color_check
  CHECK (color IN ('violet', 'rose', 'amber', 'teal', 'sky', 'emerald', 'slate'));
