-- Link-only lists must not be world-readable. Visibility = link is no longer
-- enough for SELECT; callers need the unguessable share_token (request header
-- or a grant recorded after open_list_share). linkAccess applies only after
-- that check. Public lists stay world-readable; their linkAccess is unchanged.

ALTER TABLE public.lists
  ADD COLUMN IF NOT EXISTS share_token uuid;

UPDATE public.lists
SET share_token = gen_random_uuid()
WHERE share_token IS NULL;

ALTER TABLE public.lists
  ALTER COLUMN share_token SET DEFAULT gen_random_uuid(),
  ALTER COLUMN share_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS lists_share_token_key ON public.lists (share_token);

CREATE TABLE IF NOT EXISTS public.list_link_grants (
  list_id uuid NOT NULL REFERENCES public.lists (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, user_id)
);

CREATE INDEX IF NOT EXISTS list_link_grants_user_id_idx ON public.list_link_grants (user_id);

ALTER TABLE public.list_link_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS list_link_grants_select ON public.list_link_grants;
CREATE POLICY list_link_grants_select ON public.list_link_grants
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

GRANT SELECT ON public.list_link_grants TO authenticated;

CREATE OR REPLACE FUNCTION private.presented_share_token()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  raw text;
  headers_json jsonb;
  parsed uuid;
BEGIN
  raw := nullif(current_setting('request.headers', true), '');
  IF raw IS NOT NULL THEN
    BEGIN
      headers_json := raw::jsonb;
      raw := nullif(
        coalesce(
          headers_json ->> 'x-list-share-token',
          headers_json ->> 'X-List-Share-Token'
        ),
        ''
      );
    EXCEPTION WHEN OTHERS THEN
      raw := NULL;
    END;
  END IF;

  IF raw IS NULL THEN
    raw := nullif(current_setting('request.header.x-list-share-token', true), '');
  END IF;

  IF raw IS NULL OR raw = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    parsed := raw::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;

  RETURN parsed;
END;
$$;

CREATE OR REPLACE FUNCTION private.has_link_share_access(p_list_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lists l
    WHERE l.id = p_list_id
      AND l.visibility = 'link'
      AND (
        (
          (SELECT private.presented_share_token()) IS NOT NULL
          AND l.share_token = (SELECT private.presented_share_token())
        )
        OR (
          (SELECT auth.uid()) IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.list_link_grants g
            WHERE g.list_id = l.id
              AND g.user_id = (SELECT auth.uid())
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_view_list(p_list_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lists l
    WHERE l.id = p_list_id
      AND (
        l.visibility = 'public'
        OR l.owner_id = (SELECT auth.uid())
        OR (
          l.visibility = 'friends'
          AND (SELECT private.are_friends(l.owner_id, (SELECT auth.uid())))
        )
        OR EXISTS (
          SELECT 1
          FROM public.list_members m
          WHERE m.list_id = l.id
            AND m.user_id = (SELECT auth.uid())
        )
        OR (SELECT private.has_link_share_access(l.id))
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_edit_list(p_list_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lists l
    WHERE l.id = p_list_id
      AND (SELECT auth.uid()) IS NOT NULL
      AND NOT (SELECT private.is_blocked())
      AND (
        l.owner_id = (SELECT auth.uid())
        OR (
          l.visibility = 'public'
          AND coalesce(l.settings->>'linkAccess', '') = 'edit'
        )
        OR (
          (SELECT private.has_link_share_access(l.id))
          AND coalesce(l.settings->>'linkAccess', '') = 'edit'
        )
        OR (
          l.edit_mode = 'selected'
          AND (SELECT private.member_role(l.id, (SELECT auth.uid()))) = 'editor'
        )
        OR (
          l.edit_mode = 'friends'
          AND (SELECT private.are_friends(l.owner_id, (SELECT auth.uid())))
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_propose_list(p_list_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (SELECT auth.uid()) IS NOT NULL
    AND NOT (SELECT private.is_blocked())
    AND (SELECT private.can_view_list(p_list_id))
    AND NOT (SELECT private.can_edit_list(p_list_id))
    AND EXISTS (
      SELECT 1
      FROM public.lists l
      WHERE l.id = p_list_id
        AND (
          l.edit_mode = 'proposals'
          OR (
            l.visibility = 'public'
            AND coalesce(l.settings->>'linkAccess', '') = 'propose'
          )
          OR (
            (SELECT private.has_link_share_access(l.id))
            AND coalesce(l.settings->>'linkAccess', '') = 'propose'
          )
          OR (SELECT private.member_role(l.id, (SELECT auth.uid()))) = 'proposer'
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.open_list_share(p_token uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  lid uuid;
  uid uuid := (SELECT auth.uid());
BEGIN
  IF p_token IS NULL THEN
    RAISE EXCEPTION 'Share link not found';
  END IF;

  SELECT l.id INTO lid
  FROM public.lists l
  WHERE l.share_token = p_token
    AND l.visibility = 'link';

  IF lid IS NULL THEN
    RAISE EXCEPTION 'Share link not found';
  END IF;

  IF uid IS NOT NULL AND NOT (SELECT private.is_blocked()) THEN
    INSERT INTO public.list_link_grants (list_id, user_id)
    VALUES (lid, uid)
    ON CONFLICT (list_id, user_id) DO NOTHING;
  END IF;

  RETURN lid;
END;
$$;

CREATE OR REPLACE FUNCTION private.guard_list_share_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.share_token := gen_random_uuid();
    RETURN NEW;
  END IF;

  IF OLD.visibility = 'link' AND NEW.visibility IS DISTINCT FROM 'link' THEN
    NEW.share_token := gen_random_uuid();
    DELETE FROM public.list_link_grants WHERE list_id = OLD.id;
  ELSE
    NEW.share_token := OLD.share_token;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lists_guard_share_token ON public.lists;
CREATE TRIGGER lists_guard_share_token
  BEFORE INSERT OR UPDATE ON public.lists
  FOR EACH ROW EXECUTE FUNCTION private.guard_list_share_token();

REVOKE ALL ON FUNCTION public.open_list_share(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_list_share(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.presented_share_token() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.has_link_share_access(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.can_view_list(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.can_edit_list(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.can_propose_list(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.guard_list_share_token() TO postgres, service_role;
