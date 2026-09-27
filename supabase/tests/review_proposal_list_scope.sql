-- Regression checks for issue #4: approving a proposal must not change an item
-- on another list, inserts must name an item on the proposal's list, and a
-- second review must not apply the change again.
--
-- Run as a superuser after the migrations, then roll back the fixtures:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/review_proposal_list_scope.sql
--
-- Overlapping approvals need two sessions. The pending-status guard is covered
-- here by reviewing the same row twice. A two-session check is in
-- supabase/tests/review_proposal_concurrent.sh.

BEGIN;

CREATE OR REPLACE PROCEDURE pg_temp.as_user(p_uid uuid)
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_uid::text, true);
  PERFORM set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_uid, 'role', 'authenticated')::text,
    true
  );
  EXECUTE 'SET LOCAL ROLE authenticated';
END;
$$;

CREATE OR REPLACE PROCEDURE pg_temp.as_super()
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '', true);
END;
$$;

DO $test$
DECLARE
  owner_a uuid := '11111111-1111-4111-8111-111111111111';
  proposer uuid := '22222222-2222-4222-8222-222222222222';
  owner_b uuid := '33333333-3333-4333-8333-333333333333';
  editor uuid := '44444444-4444-4444-8444-444444444444';
  list_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  list_b uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  list_c uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  item_a uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  item_b uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  item_check uuid := 'f1111111-1111-4111-8111-111111111111';
  item_uncheck uuid := 'f2222222-2222-4222-8222-222222222222';
  item_delete uuid := 'f3333333-3333-4333-8333-333333333333';
  item_move uuid := 'f4444444-4444-4444-8444-444444444444';
  item_editor uuid := 'f5555555-5555-4555-8555-555555555555';
  fn_src text;
  policy_check text;
  item_count integer;
  prop_status text;
  item_values jsonb;
  item_list uuid;
  item_checked boolean;
BEGIN
  INSERT INTO auth.users (id, email, raw_user_meta_data)
  VALUES
    (owner_a, 'ownera@example.com', '{"username":"ownera","display_name":"Owner A"}'::jsonb),
    (proposer, 'proposer@example.com', '{"username":"proposer","display_name":"Proposer"}'::jsonb),
    (owner_b, 'ownerb@example.com', '{"username":"ownerb","display_name":"Owner B"}'::jsonb),
    (editor, 'editor@example.com', '{"username":"editorc","display_name":"Editor"}'::jsonb);

  INSERT INTO public.lists (id, owner_id, title, visibility, edit_mode)
  VALUES
    (list_a, owner_a, 'List A', 'public', 'proposals'),
    (list_b, owner_b, 'List B', 'private', 'owner'),
    (list_c, owner_a, 'List C', 'private', 'selected');

  INSERT INTO public.list_members (list_id, user_id, role)
  VALUES
    (list_b, proposer, 'viewer'),
    (list_c, editor, 'editor'),
    (list_c, proposer, 'proposer');

  INSERT INTO public.items (id, list_id, values, position, is_checked, created_by, updated_by)
  VALUES
    (item_a, list_a, '{"title":"on A"}'::jsonb, 1, false, owner_a, owner_a),
    (item_b, list_b, '{"title":"secret"}'::jsonb, 1, false, owner_b, owner_b),
    (item_check, list_a, '{"title":"check me"}'::jsonb, 2, false, owner_a, owner_a),
    (item_uncheck, list_a, '{"title":"uncheck me"}'::jsonb, 3, true, owner_a, owner_a),
    (item_delete, list_a, '{"title":"delete me"}'::jsonb, 4, false, owner_a, owner_a),
    (item_move, list_a, '{"title":"will move"}'::jsonb, 5, false, owner_a, owner_a),
    (item_editor, list_c, '{"title":"editor list"}'::jsonb, 1, false, owner_a, owner_a);

  SELECT pg_get_functiondef('public.review_proposal(uuid, boolean, text)'::regprocedure)
  INTO fn_src;
  IF fn_src NOT LIKE '%FOR UPDATE%' THEN
    RAISE EXCEPTION 'review_proposal does not lock the proposal row';
  END IF;
  IF fn_src NOT LIKE '%status = ''pending''%' THEN
    RAISE EXCEPTION 'review_proposal does not claim pending status';
  END IF;
  IF fn_src NOT LIKE '%proposal_item.list_id = prop.list_id%' THEN
    RAISE EXCEPTION 'review_proposal does not scope item writes to the proposal list';
  END IF;

  SELECT pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO policy_check
  FROM pg_policy pol
  JOIN pg_class rel ON rel.oid = pol.polrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'change_proposals'
    AND pol.polname = 'change_proposals_insert';
  IF policy_check NOT LIKE '%change_proposals.list_id%' THEN
    RAISE EXCEPTION 'insert policy does not compare item list_id to the proposal list';
  END IF;

  -- Insert policy rejects a foreign item even when the trigger is off and the
  -- proposer can see that item.
  CALL pg_temp.as_super();
  ALTER TABLE public.change_proposals DISABLE TRIGGER change_proposals_item_on_list;
  CALL pg_temp.as_user(proposer);
  BEGIN
    INSERT INTO public.change_proposals (list_id, item_id, user_id, action, payload)
    VALUES (list_a, item_b, proposer, 'delete', '{}'::jsonb);
    RAISE EXCEPTION 'insert policy allowed a foreign item';
  EXCEPTION
    WHEN insufficient_privilege THEN
      NULL;
    WHEN OTHERS THEN
      IF SQLERRM = 'insert policy allowed a foreign item' THEN
        RAISE;
      END IF;
      IF SQLSTATE <> '42501' THEN
        RAISE EXCEPTION 'expected RLS rejection (42501), got %: %', SQLSTATE, SQLERRM;
      END IF;
  END;
  CALL pg_temp.as_super();
  ALTER TABLE public.change_proposals ENABLE TRIGGER change_proposals_item_on_list;

  -- Trigger rejects the same insert for a role that bypasses RLS.
  BEGIN
    INSERT INTO public.change_proposals (list_id, item_id, user_id, action, payload)
    VALUES (list_a, item_b, proposer, 'update', '{"values":{"title":"pwned"}}'::jsonb);
    RAISE EXCEPTION 'trigger allowed a foreign item';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'trigger allowed a foreign item' THEN
        RAISE;
      END IF;
      IF SQLSTATE <> '23514' OR SQLERRM NOT LIKE '%proposal item is not on this list%' THEN
        RAISE EXCEPTION 'expected trigger check_violation, got %: %', SQLSTATE, SQLERRM;
      END IF;
  END;

  CALL pg_temp.as_user(proposer);
  BEGIN
    INSERT INTO public.change_proposals (list_id, item_id, user_id, action, payload)
    VALUES (list_a, NULL, proposer, 'update', '{}'::jsonb);
    RAISE EXCEPTION 'insert allowed update without an item';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'insert allowed update without an item' THEN
        RAISE;
      END IF;
      IF SQLSTATE NOT IN ('23514', '42501') THEN
        RAISE EXCEPTION 'expected rejection of itemless update, got %: %', SQLSTATE, SQLERRM;
      END IF;
  END;

  INSERT INTO public.change_proposals (list_id, item_id, user_id, action, payload)
  VALUES (list_a, NULL, proposer, 'create', '{"values":{"title":"from proposal"}}'::jsonb);
  INSERT INTO public.change_proposals (list_id, item_id, user_id, action, payload)
  VALUES (list_a, item_a, proposer, 'update', '{"values":{"title":"updated A"}}'::jsonb);
  INSERT INTO public.change_proposals (list_id, item_id, user_id, action, payload)
  VALUES (list_a, item_check, proposer, 'check', '{}'::jsonb);
  INSERT INTO public.change_proposals (list_id, item_id, user_id, action, payload)
  VALUES (list_a, item_uncheck, proposer, 'uncheck', '{}'::jsonb);
  INSERT INTO public.change_proposals (list_id, item_id, user_id, action, payload)
  VALUES (list_a, item_delete, proposer, 'delete', '{}'::jsonb);
  INSERT INTO public.change_proposals (list_id, item_id, user_id, action, payload)
  VALUES (list_a, item_move, proposer, 'update', '{"values":{"title":"should not apply"}}'::jsonb);
  INSERT INTO public.change_proposals (list_id, item_id, user_id, action, payload)
  VALUES (list_c, item_editor, proposer, 'update', '{"values":{"title":"editor applied"}}'::jsonb);

  CALL pg_temp.as_super();

  -- Rows that already point at another list (inserted before this fix).
  ALTER TABLE public.change_proposals DISABLE TRIGGER change_proposals_item_on_list;
  INSERT INTO public.change_proposals (id, list_id, item_id, user_id, action, payload)
  VALUES
    ('a1111111-1111-4111-8111-111111111111', list_a, item_b, proposer, 'update', '{"values":{"title":"pwned"}}'::jsonb),
    ('a2222222-2222-4222-8222-222222222222', list_a, item_b, proposer, 'delete', '{}'::jsonb),
    ('a3333333-3333-4333-8333-333333333333', list_a, item_b, proposer, 'check', '{}'::jsonb),
    ('a4444444-4444-4444-8444-444444444444', list_a, item_b, proposer, 'uncheck', '{}'::jsonb),
    ('a5555555-5555-4555-8555-555555555555', list_a, item_b, proposer, 'create', '{"values":{"title":"should not appear"}}'::jsonb);
  ALTER TABLE public.change_proposals ENABLE TRIGGER change_proposals_item_on_list;

  CALL pg_temp.as_user(owner_a);
  FOREACH fn_src IN ARRAY ARRAY[
    'a1111111-1111-4111-8111-111111111111',
    'a2222222-2222-4222-8222-222222222222',
    'a3333333-3333-4333-8333-333333333333',
    'a4444444-4444-4444-8444-444444444444',
    'a5555555-5555-4555-8555-555555555555'
  ]
  LOOP
    BEGIN
      PERFORM public.review_proposal(fn_src::uuid, true, NULL);
      RAISE EXCEPTION 'cross-list approve succeeded for %', fn_src;
    EXCEPTION
      WHEN OTHERS THEN
        IF SQLERRM LIKE 'cross-list approve succeeded%' THEN
          RAISE;
        END IF;
        IF SQLERRM NOT LIKE '%proposal item is not on this list%' THEN
          RAISE EXCEPTION 'unexpected approve error for %: %', fn_src, SQLERRM;
        END IF;
    END;

    SELECT status INTO prop_status FROM public.change_proposals WHERE id = fn_src::uuid;
    IF prop_status IS DISTINCT FROM 'pending' THEN
      RAISE EXCEPTION 'failed approve changed proposal % to %', fn_src, prop_status;
    END IF;
  END LOOP;

  CALL pg_temp.as_super();
  SELECT count(*) INTO item_count
  FROM public.items
  WHERE list_id = list_a AND values->>'title' = 'should not appear';
  IF item_count <> 0 THEN
    RAISE EXCEPTION 'poisoned create inserted an item';
  END IF;

  SELECT values, list_id, is_checked
  INTO item_values, item_list, item_checked
  FROM public.items
  WHERE id = item_b;
  IF item_values->>'title' IS DISTINCT FROM 'secret'
     OR item_list IS DISTINCT FROM list_b
     OR item_checked IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'item on list B changed: % list % checked %', item_values, item_list, item_checked;
  END IF;

  CALL pg_temp.as_user(owner_a);
  PERFORM public.review_proposal('a2222222-2222-4222-8222-222222222222', false, 'no');
  SELECT status INTO prop_status
  FROM public.change_proposals
  WHERE id = 'a2222222-2222-4222-8222-222222222222';
  IF prop_status IS DISTINCT FROM 'rejected' THEN
    RAISE EXCEPTION 'rejecting a cross-list proposal left status %', prop_status;
  END IF;
  CALL pg_temp.as_super();
  IF (SELECT values->>'title' FROM public.items WHERE id = item_b) IS DISTINCT FROM 'secret' THEN
    RAISE EXCEPTION 'reject changed the other list';
  END IF;

  -- Someone who cannot review list A.
  CALL pg_temp.as_user(owner_b);
  BEGIN
    PERFORM public.review_proposal('a1111111-1111-4111-8111-111111111111', true, NULL);
    RAISE EXCEPTION 'outsider approved a proposal';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'outsider approved a proposal' THEN
        RAISE;
      END IF;
      IF SQLERRM NOT LIKE '%not allowed to review%' THEN
        RAISE EXCEPTION 'expected not allowed, got %', SQLERRM;
      END IF;
  END;

  CALL pg_temp.as_user(owner_a);

  PERFORM public.review_proposal(
    (SELECT id FROM public.change_proposals
     WHERE item_id = item_a AND action = 'update' AND status = 'pending'),
    true,
    NULL
  );
  IF (SELECT values->>'title' FROM public.items WHERE id = item_a) IS DISTINCT FROM 'updated A' THEN
    RAISE EXCEPTION 'legitimate update did not apply';
  END IF;
  IF (SELECT status FROM public.change_proposals WHERE item_id = item_a AND action = 'update')
     IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'legitimate update was not marked approved';
  END IF;
  BEGIN
    PERFORM public.review_proposal(
      (SELECT id FROM public.change_proposals WHERE item_id = item_a AND action = 'update'),
      true,
      NULL
    );
    RAISE EXCEPTION 'second approve succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'second approve succeeded' THEN
        RAISE;
      END IF;
      IF SQLERRM NOT LIKE '%proposal already reviewed%' THEN
        RAISE EXCEPTION 'expected already reviewed, got %', SQLERRM;
      END IF;
  END;
  IF (SELECT values->>'title' FROM public.items WHERE id = item_a) IS DISTINCT FROM 'updated A' THEN
    RAISE EXCEPTION 'second approve changed the item again';
  END IF;

  PERFORM public.review_proposal(
    (SELECT id FROM public.change_proposals WHERE item_id = item_check AND action = 'check'),
    true,
    NULL
  );
  IF NOT (SELECT is_checked FROM public.items WHERE id = item_check) THEN
    RAISE EXCEPTION 'check proposal did not check the item';
  END IF;

  PERFORM public.review_proposal(
    (SELECT id FROM public.change_proposals WHERE item_id = item_uncheck AND action = 'uncheck'),
    true,
    NULL
  );
  IF (SELECT is_checked FROM public.items WHERE id = item_uncheck) THEN
    RAISE EXCEPTION 'uncheck proposal left the item checked';
  END IF;

  SELECT count(*) INTO item_count FROM public.items WHERE list_id = list_a;
  PERFORM public.review_proposal(
    (SELECT id FROM public.change_proposals
     WHERE list_id = list_a AND action = 'create' AND status = 'pending' AND item_id IS NULL),
    true,
    NULL
  );
  IF (SELECT count(*) FROM public.items WHERE list_id = list_a) <> item_count + 1 THEN
    RAISE EXCEPTION 'create proposal did not insert exactly one item';
  END IF;
  IF (SELECT count(*) FROM public.items WHERE list_id = list_a AND values->>'title' = 'from proposal') <> 1 THEN
    RAISE EXCEPTION 'created item missing';
  END IF;
  BEGIN
    PERFORM public.review_proposal(
      (SELECT id FROM public.change_proposals
       WHERE list_id = list_a AND action = 'create' AND item_id IS NULL),
      true,
      NULL
    );
    RAISE EXCEPTION 'second create approve succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'second create approve succeeded' THEN
        RAISE;
      END IF;
      IF SQLERRM NOT LIKE '%proposal already reviewed%' THEN
        RAISE EXCEPTION 'expected already reviewed on create, got %', SQLERRM;
      END IF;
  END;
  IF (SELECT count(*) FROM public.items WHERE list_id = list_a AND values->>'title' = 'from proposal') <> 1 THEN
    RAISE EXCEPTION 'second create approve inserted another item';
  END IF;

  PERFORM public.review_proposal(
    (SELECT id FROM public.change_proposals WHERE item_id = item_delete AND action = 'delete'),
    true,
    NULL
  );
  IF EXISTS (SELECT 1 FROM public.items WHERE id = item_delete) THEN
    RAISE EXCEPTION 'delete proposal left the item in place';
  END IF;

  CALL pg_temp.as_super();
  UPDATE public.items SET list_id = list_b WHERE id = item_move;
  CALL pg_temp.as_user(owner_a);
  BEGIN
    PERFORM public.review_proposal(
      (SELECT id FROM public.change_proposals WHERE item_id = item_move AND action = 'update'),
      true,
      NULL
    );
    RAISE EXCEPTION 'approve applied after the item moved';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'approve applied after the item moved' THEN
        RAISE;
      END IF;
      IF SQLERRM NOT LIKE '%proposal item is not on this list%' THEN
        RAISE EXCEPTION 'expected list mismatch after move, got %', SQLERRM;
      END IF;
  END;
  CALL pg_temp.as_super();
  IF (SELECT values->>'title' FROM public.items WHERE id = item_move) IS DISTINCT FROM 'will move'
     OR (SELECT list_id FROM public.items WHERE id = item_move) IS DISTINCT FROM list_b THEN
    RAISE EXCEPTION 'moved item was modified';
  END IF;

  CALL pg_temp.as_user(editor);
  PERFORM public.review_proposal(
    (SELECT id FROM public.change_proposals WHERE item_id = item_editor AND action = 'update'),
    true,
    NULL
  );
  IF (SELECT values->>'title' FROM public.items WHERE id = item_editor) IS DISTINCT FROM 'editor applied' THEN
    RAISE EXCEPTION 'editor could not apply a same-list proposal';
  END IF;

  CALL pg_temp.as_super();
END;
$test$;

SELECT 'review_proposal_list_scope ok' AS result;

ROLLBACK;
