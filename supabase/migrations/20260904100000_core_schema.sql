-- Chroniqe core schema: flexible lists, social access, files, automations.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO postgres, service_role, authenticated, anon;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  bio text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_username_format CHECK (username ~ '^[a-z0-9_]{3,24}$'),
  CONSTRAINT profiles_bio_len CHECK (bio IS NULL OR char_length(bio) <= 500),
  CONSTRAINT profiles_display_name_len CHECK (char_length(display_name) BETWEEN 0 AND 80)
);

CREATE UNIQUE INDEX profiles_username_key ON public.profiles (username);
CREATE INDEX profiles_username_trgm_idx ON public.profiles USING gin (username gin_trgm_ops);

CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT friendships_not_self CHECK (requester_id <> addressee_id)
);

CREATE UNIQUE INDEX friendships_pair_key ON public.friendships (
  LEAST(requester_id, addressee_id),
  GREATEST(requester_id, addressee_id)
);
CREATE INDEX friendships_requester_idx ON public.friendships (requester_id);
CREATE INDEX friendships_addressee_idx ON public.friendships (addressee_id);
CREATE INDEX friendships_status_idx ON public.friendships (status);

CREATE TABLE public.lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  icon text,
  cover_url text,
  template_key text,
  schema jsonb NOT NULL DEFAULT '{"fields":[]}'::jsonb,
  view_config jsonb NOT NULL DEFAULT '{"mode":"table"}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'invite', 'friends', 'public')),
  edit_mode text NOT NULL DEFAULT 'owner'
    CHECK (edit_mode IN ('owner', 'selected', 'friends', 'proposals')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lists_title_len CHECK (char_length(title) BETWEEN 1 AND 120),
  CONSTRAINT lists_description_len CHECK (description IS NULL OR char_length(description) <= 2000),
  CONSTRAINT lists_icon_len CHECK (icon IS NULL OR char_length(icon) <= 16)
);

CREATE INDEX lists_owner_id_idx ON public.lists (owner_id);
CREATE INDEX lists_visibility_public_idx ON public.lists (created_at DESC)
  WHERE visibility = 'public';
CREATE INDEX lists_title_trgm_idx ON public.lists USING gin (title gin_trgm_ops);

CREATE TABLE public.list_members (
  list_id uuid NOT NULL REFERENCES public.lists (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('viewer', 'editor', 'proposer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, user_id)
);

CREATE INDEX list_members_user_id_idx ON public.list_members (user_id);

CREATE TABLE public.list_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.lists (id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  invitee_id uuid REFERENCES public.profiles (id) ON DELETE CASCADE,
  email text,
  role text NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('viewer', 'editor', 'proposer')),
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX list_invites_list_id_idx ON public.list_invites (list_id);
CREATE INDEX list_invites_invitee_id_idx ON public.list_invites (invitee_id);
CREATE UNIQUE INDEX list_invites_token_key ON public.list_invites (token);

CREATE TABLE public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.lists (id) ON DELETE CASCADE,
  values jsonb NOT NULL DEFAULT '{}'::jsonb,
  position double precision NOT NULL DEFAULT 0,
  is_checked boolean NOT NULL DEFAULT false,
  checked_at timestamptz,
  check_snapshot jsonb,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX items_list_id_idx ON public.items (list_id);
CREATE INDEX items_list_position_idx ON public.items (list_id, position);
CREATE INDEX items_values_gin_idx ON public.items USING gin (values);

CREATE TABLE public.item_ratings (
  item_id uuid NOT NULL REFERENCES public.items (id) ON DELETE CASCADE,
  field_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  value numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, field_id, user_id),
  CONSTRAINT item_ratings_value_range CHECK (value >= 0 AND value <= 100)
);

CREATE INDEX item_ratings_user_id_idx ON public.item_ratings (user_id);

CREATE TABLE public.item_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.items (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT item_comments_body_len CHECK (char_length(body) BETWEEN 1 AND 4000)
);

CREATE INDEX item_comments_item_id_idx ON public.item_comments (item_id);
CREATE INDEX item_comments_user_id_idx ON public.item_comments (user_id);

CREATE TABLE public.change_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.lists (id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.items (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete', 'check', 'uncheck')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX change_proposals_list_id_idx ON public.change_proposals (list_id);
CREATE INDEX change_proposals_user_id_idx ON public.change_proposals (user_id);
CREATE INDEX change_proposals_pending_idx ON public.change_proposals (list_id)
  WHERE status = 'pending';

CREATE TABLE public.list_subscriptions (
  list_id uuid NOT NULL REFERENCES public.lists (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, user_id)
);

CREATE INDEX list_subscriptions_user_id_idx ON public.list_subscriptions (user_id);

CREATE TABLE public.list_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.lists (id) ON DELETE CASCADE,
  name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  trigger jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT list_automations_name_len CHECK (char_length(name) BETWEEN 1 AND 80)
);

CREATE INDEX list_automations_list_id_idx ON public.list_automations (list_id);

CREATE TABLE public.list_charts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.lists (id) ON DELETE CASCADE,
  name text NOT NULL,
  chart_type text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT list_charts_name_len CHECK (char_length(name) BETWEEN 1 AND 80)
);

CREATE INDEX list_charts_list_id_idx ON public.list_charts (list_id);

CREATE TABLE public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES public.lists (id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.items (id) ON DELETE SET NULL,
  actor_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX activity_events_list_id_idx ON public.activity_events (list_id, created_at DESC);
CREATE INDEX activity_events_actor_id_idx ON public.activity_events (actor_id);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_id_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX notifications_unread_idx ON public.notifications (user_id)
  WHERE read_at IS NULL;

CREATE TABLE public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  list_id uuid REFERENCES public.lists (id) ON DELETE SET NULL,
  bucket text NOT NULL,
  path text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  original_name text,
  scan_status text NOT NULL DEFAULT 'pending'
    CHECK (scan_status IN ('pending', 'clean', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT files_size_positive CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  CONSTRAINT files_mime_allowed CHECK (
    mime_type IN (
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'text/csv',
      'application/json',
      'text/plain'
    )
  )
);

CREATE UNIQUE INDEX files_path_key ON public.files (bucket, path);
CREATE INDEX files_owner_id_idx ON public.files (owner_id);
CREATE INDEX files_list_id_idx ON public.files (list_id);

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER lists_set_updated_at
  BEFORE UPDATE ON public.lists
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER items_set_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER item_comments_set_updated_at
  BEFORE UPDATE ON public.item_comments
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER item_ratings_set_updated_at
  BEFORE UPDATE ON public.item_ratings
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth: create profile on signup
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  base_username text;
  final_username text;
BEGIN
  base_username := lower(regexp_replace(
    coalesce(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    '[^a-z0-9_]',
    '',
    'g'
  ));

  IF char_length(base_username) < 3 THEN
    base_username := 'user' || substr(replace(NEW.id::text, '-', ''), 1, 8);
  END IF;

  IF char_length(base_username) > 20 THEN
    base_username := substr(base_username, 1, 20);
  END IF;

  final_username := base_username;

  IF EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.username = final_username
  ) THEN
    final_username := substr(base_username, 1, 16)
      || substr(replace(NEW.id::text, '-', ''), 1, 4);
  END IF;

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    final_username,
    coalesce(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1))
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Access helpers (SECURITY DEFINER, bypass RLS, avoid recursion)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.are_friends(a uuid, b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    a IS NOT NULL
    AND b IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.requester_id = a AND f.addressee_id = b)
          OR (f.requester_id = b AND f.addressee_id = a)
        )
    );
$$;

CREATE OR REPLACE FUNCTION private.member_role(p_list_id uuid, p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT m.role
  FROM public.list_members m
  WHERE m.list_id = p_list_id AND m.user_id = p_user_id;
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
      AND (
        l.owner_id = (SELECT auth.uid())
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
    AND (SELECT private.can_view_list(p_list_id))
    AND NOT (SELECT private.can_edit_list(p_list_id))
    AND EXISTS (
      SELECT 1
      FROM public.lists l
      WHERE l.id = p_list_id
        AND (
          l.edit_mode = 'proposals'
          OR (SELECT private.member_role(l.id, (SELECT auth.uid()))) = 'proposer'
        )
    );
$$;

CREATE OR REPLACE FUNCTION private.is_list_owner(p_list_id uuid)
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
      AND l.owner_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.list_permissions(p_list_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'view', (SELECT private.can_view_list(p_list_id)),
    'edit', (SELECT private.can_edit_list(p_list_id)),
    'propose', (SELECT private.can_propose_list(p_list_id)),
    'owner', (SELECT private.is_list_owner(p_list_id)),
    'role', (
      SELECT CASE
        WHEN l.owner_id = (SELECT auth.uid()) THEN 'owner'
        ELSE coalesce((SELECT private.member_role(p_list_id, (SELECT auth.uid()))), 'none')
      END
      FROM public.lists l
      WHERE l.id = p_list_id
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.list_permissions(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Item transfer (atomic copy + optional delete)
-- ---------------------------------------------------------------------------

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

  INSERT INTO public.items (list_id, values, position, created_by, updated_by)
  VALUES (
    p_target_list_id,
    new_values,
    max_pos,
    (SELECT auth.uid()),
    (SELECT auth.uid())
  )
  RETURNING id INTO new_id;

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

GRANT EXECUTE ON FUNCTION public.move_item(uuid, uuid, jsonb, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- Apply an approved proposal (owner/editor)
-- ---------------------------------------------------------------------------

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
      UPDATE public.items
      SET is_checked = true, checked_at = now(), updated_by = (SELECT auth.uid())
      WHERE id = prop.item_id;
    ELSIF prop.action = 'uncheck' AND prop.item_id IS NOT NULL THEN
      UPDATE public.items
      SET is_checked = false, checked_at = NULL, updated_by = (SELECT auth.uid())
      WHERE id = prop.item_id;
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

GRANT EXECUTE ON FUNCTION public.review_proposal(uuid, boolean, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Activity + subscriber notifications
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.log_item_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_list_id uuid;
  v_item_id uuid;
  v_type text;
  v_payload jsonb := '{}'::jsonb;
  subscriber uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_list_id := OLD.list_id;
    v_item_id := OLD.id;
    v_type := 'item_deleted';
    v_payload := jsonb_build_object('values', OLD.values);
  ELSIF TG_OP = 'INSERT' THEN
    v_list_id := NEW.list_id;
    v_item_id := NEW.id;
    v_type := 'item_created';
    v_payload := jsonb_build_object('values', NEW.values);
  ELSE
    v_list_id := NEW.list_id;
    v_item_id := NEW.id;
    IF OLD.is_checked IS DISTINCT FROM NEW.is_checked THEN
      v_type := CASE WHEN NEW.is_checked THEN 'item_checked' ELSE 'item_unchecked' END;
    ELSE
      v_type := 'item_updated';
    END IF;
    v_payload := jsonb_build_object('values', NEW.values);
  END IF;

  INSERT INTO public.activity_events (list_id, item_id, actor_id, event_type, payload)
  VALUES (v_list_id, CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE v_item_id END, (SELECT auth.uid()), v_type, v_payload);

  FOR subscriber IN
    SELECT s.user_id
    FROM public.list_subscriptions s
    WHERE s.list_id = v_list_id
      AND s.user_id IS DISTINCT FROM (SELECT auth.uid())
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, payload)
    VALUES (
      subscriber,
      v_type,
      'Изменения в списке',
      v_type,
      jsonb_build_object('list_id', v_list_id, 'item_id', v_item_id, 'event', v_type)
    );
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER items_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.items
  FOR EACH ROW EXECUTE FUNCTION private.log_item_activity();

CREATE OR REPLACE FUNCTION private.notify_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, type, title, body, payload)
    VALUES (
      NEW.addressee_id,
      'friend_request',
      'Заявка в друзья',
      NULL,
      jsonb_build_object('friendship_id', NEW.id, 'from', NEW.requester_id)
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, type, title, body, payload)
    VALUES (
      NEW.requester_id,
      'friend_accepted',
      'Заявка в друзья принята',
      NULL,
      jsonb_build_object('friendship_id', NEW.id, 'with', NEW.addressee_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER friendships_notify
  AFTER INSERT OR UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION private.notify_friend_request();

CREATE OR REPLACE FUNCTION private.notify_invite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'pending' AND NEW.invitee_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, payload)
    VALUES (
      NEW.invitee_id,
      'list_invite',
      'Приглашение в список',
      NULL,
      jsonb_build_object('invite_id', NEW.id, 'list_id', NEW.list_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER list_invites_notify
  AFTER INSERT ON public.list_invites
  FOR EACH ROW EXECUTE FUNCTION private.notify_invite();

CREATE OR REPLACE FUNCTION private.notify_proposal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  owner uuid;
BEGIN
  SELECT l.owner_id INTO owner FROM public.lists l WHERE l.id = NEW.list_id;
  IF owner IS NOT NULL AND owner IS DISTINCT FROM NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, body, payload)
    VALUES (
      owner,
      'proposal_created',
      'Новое предложение изменений',
      NULL,
      jsonb_build_object('proposal_id', NEW.id, 'list_id', NEW.list_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER change_proposals_notify
  AFTER INSERT ON public.change_proposals
  FOR EACH ROW EXECUTE FUNCTION private.notify_proposal();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- friendships
CREATE POLICY friendships_select ON public.friendships
  FOR SELECT TO authenticated
  USING (
    requester_id = (SELECT auth.uid())
    OR addressee_id = (SELECT auth.uid())
  );

CREATE POLICY friendships_insert ON public.friendships
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = (SELECT auth.uid()));

CREATE POLICY friendships_update ON public.friendships
  FOR UPDATE TO authenticated
  USING (
    addressee_id = (SELECT auth.uid())
    OR requester_id = (SELECT auth.uid())
  );

CREATE POLICY friendships_delete ON public.friendships
  FOR DELETE TO authenticated
  USING (
    requester_id = (SELECT auth.uid())
    OR addressee_id = (SELECT auth.uid())
  );

-- lists
CREATE POLICY lists_select ON public.lists
  FOR SELECT TO anon, authenticated
  USING ((SELECT private.can_view_list(id)));

CREATE POLICY lists_insert ON public.lists
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY lists_update ON public.lists
  FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY lists_delete ON public.lists
  FOR DELETE TO authenticated
  USING (owner_id = (SELECT auth.uid()));

-- members
CREATE POLICY list_members_select ON public.list_members
  FOR SELECT TO authenticated
  USING ((SELECT private.can_view_list(list_id)));

CREATE POLICY list_members_insert ON public.list_members
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.is_list_owner(list_id)));

CREATE POLICY list_members_update ON public.list_members
  FOR UPDATE TO authenticated
  USING ((SELECT private.is_list_owner(list_id)));

CREATE POLICY list_members_delete ON public.list_members
  FOR DELETE TO authenticated
  USING (
    (SELECT private.is_list_owner(list_id))
    OR user_id = (SELECT auth.uid())
  );

-- invites
CREATE POLICY list_invites_select ON public.list_invites
  FOR SELECT TO authenticated
  USING (
    (SELECT private.is_list_owner(list_id))
    OR invitee_id = (SELECT auth.uid())
    OR inviter_id = (SELECT auth.uid())
  );

CREATE POLICY list_invites_insert ON public.list_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    inviter_id = (SELECT auth.uid())
    AND (SELECT private.is_list_owner(list_id))
  );

CREATE POLICY list_invites_update ON public.list_invites
  FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_list_owner(list_id))
    OR invitee_id = (SELECT auth.uid())
  );

-- items
CREATE POLICY items_select ON public.items
  FOR SELECT TO anon, authenticated
  USING ((SELECT private.can_view_list(list_id)));

CREATE POLICY items_insert ON public.items
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.can_edit_list(list_id)));

CREATE POLICY items_update ON public.items
  FOR UPDATE TO authenticated
  USING ((SELECT private.can_edit_list(list_id)))
  WITH CHECK ((SELECT private.can_edit_list(list_id)));

CREATE POLICY items_delete ON public.items
  FOR DELETE TO authenticated
  USING ((SELECT private.can_edit_list(list_id)));

-- ratings
CREATE POLICY item_ratings_select ON public.item_ratings
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = item_id AND (SELECT private.can_view_list(i.list_id))
    )
  );

CREATE POLICY item_ratings_insert ON public.item_ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = item_id AND (SELECT private.can_view_list(i.list_id))
    )
  );

CREATE POLICY item_ratings_update ON public.item_ratings
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY item_ratings_delete ON public.item_ratings
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- comments
CREATE POLICY item_comments_select ON public.item_comments
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = item_id AND (SELECT private.can_view_list(i.list_id))
    )
  );

CREATE POLICY item_comments_insert ON public.item_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = item_id AND (SELECT private.can_view_list(i.list_id))
    )
  );

CREATE POLICY item_comments_update ON public.item_comments
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY item_comments_delete ON public.item_comments
  FOR DELETE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.items i
      WHERE i.id = item_id AND (SELECT private.is_list_owner(i.list_id))
    )
  );

-- proposals
CREATE POLICY change_proposals_select ON public.change_proposals
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT private.is_list_owner(list_id))
    OR (SELECT private.can_edit_list(list_id))
  );

CREATE POLICY change_proposals_insert ON public.change_proposals
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (SELECT private.can_propose_list(list_id))
  );

-- subscriptions
CREATE POLICY list_subscriptions_select ON public.list_subscriptions
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT private.is_list_owner(list_id))
  );

CREATE POLICY list_subscriptions_insert ON public.list_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (SELECT private.can_view_list(list_id))
  );

CREATE POLICY list_subscriptions_delete ON public.list_subscriptions
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- automations (owner)
CREATE POLICY list_automations_select ON public.list_automations
  FOR SELECT TO authenticated
  USING ((SELECT private.can_view_list(list_id)));

CREATE POLICY list_automations_mutate ON public.list_automations
  FOR ALL TO authenticated
  USING ((SELECT private.is_list_owner(list_id)))
  WITH CHECK ((SELECT private.is_list_owner(list_id)));

-- charts
CREATE POLICY list_charts_select ON public.list_charts
  FOR SELECT TO anon, authenticated
  USING ((SELECT private.can_view_list(list_id)));

CREATE POLICY list_charts_mutate ON public.list_charts
  FOR ALL TO authenticated
  USING ((SELECT private.can_edit_list(list_id)) OR (SELECT private.is_list_owner(list_id)))
  WITH CHECK ((SELECT private.can_edit_list(list_id)) OR (SELECT private.is_list_owner(list_id)));

-- activity
CREATE POLICY activity_events_select ON public.activity_events
  FOR SELECT TO anon, authenticated
  USING (list_id IS NOT NULL AND (SELECT private.can_view_list(list_id)));

CREATE POLICY activity_events_insert ON public.activity_events
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = (SELECT auth.uid())
    AND (list_id IS NULL OR (SELECT private.can_view_list(list_id)))
  );

-- notifications
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY notifications_delete ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- files
CREATE POLICY files_select ON public.files
  FOR SELECT TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR (list_id IS NOT NULL AND (SELECT private.can_view_list(list_id)))
  );

CREATE POLICY files_insert ON public.files
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY files_update ON public.files
  FOR UPDATE TO authenticated
  USING (owner_id = (SELECT auth.uid()));

CREATE POLICY files_delete ON public.files
  FOR DELETE TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR (list_id IS NOT NULL AND (SELECT private.is_list_owner(list_id)))
  );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.profiles, public.lists, public.items, public.item_ratings,
  public.item_comments, public.list_charts, public.activity_events
  TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'list-files',
  'list-files',
  false,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/csv',
    'application/json',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  public = false;

CREATE POLICY avatars_public_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY avatars_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = ((SELECT auth.uid())::text)
  );

CREATE POLICY avatars_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = ((SELECT auth.uid())::text)
  );

CREATE POLICY avatars_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = ((SELECT auth.uid())::text)
  );

CREATE POLICY list_files_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'list-files'
    AND (
      (storage.foldername(name))[1] = ((SELECT auth.uid())::text)
      OR (
        CASE
          WHEN (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
            THEN (SELECT private.can_view_list(((storage.foldername(name))[2])::uuid))
          ELSE false
        END
      )
    )
  );

CREATE POLICY list_files_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'list-files'
    AND (storage.foldername(name))[1] = ((SELECT auth.uid())::text)
    AND (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
    AND (SELECT private.can_edit_list(((storage.foldername(name))[2])::uuid))
  );

CREATE POLICY list_files_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'list-files'
    AND (storage.foldername(name))[1] = ((SELECT auth.uid())::text)
  );

CREATE POLICY list_files_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'list-files'
    AND (
      (storage.foldername(name))[1] = ((SELECT auth.uid())::text)
      OR (
        (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
        AND (SELECT private.is_list_owner(((storage.foldername(name))[2])::uuid))
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.items REPLICA IDENTITY FULL;
ALTER TABLE public.change_proposals REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.change_proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_events;
