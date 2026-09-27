-- Regression for issue #9: checking an item (directly or by approving a
-- proposal) must snapshot values, run onCheck/onUncheck, and move in one
-- transaction. A failed move must not leave the item checked.
--
-- Run as a superuser after the migrations, then roll back the fixtures:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/toggle_item_checked.sql
-- Or: bash supabase/tests/run-toggle-item-checked.sh

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
  list_shop uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  list_bought uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  list_other uuid := 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  item_buy uuid := 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  item_fail uuid := 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  item_plain uuid := 'f1111111-1111-4111-8111-111111111111';
  item_copy uuid := 'f2222222-2222-4222-8222-222222222222';
  item_auto uuid := 'f3333333-3333-4333-8333-333333333333';
  item_prop uuid := 'f4444444-4444-4444-8444-444444444444';
  item_uncheck uuid := 'f5555555-5555-4555-8555-555555555555';
  item_prop_fail uuid := 'f6666666-6666-4666-8666-666666666666';
  prop_check uuid;
  prop_uncheck uuid;
  prop_fail uuid;
  result public.items%ROWTYPE;
  moved public.items%ROWTYPE;
  item_count integer;
  bought_at text;
BEGIN
  INSERT INTO auth.users (id, email, raw_user_meta_data)
  VALUES
    (owner_a, 'ownera@example.com', '{"username":"ownera","display_name":"Owner A"}'::jsonb),
    (proposer, 'proposer@example.com', '{"username":"proposer","display_name":"Proposer"}'::jsonb),
    (owner_b, 'ownerb@example.com', '{"username":"ownerb","display_name":"Owner B"}'::jsonb);

  INSERT INTO public.lists (
    id, owner_id, title, visibility, edit_mode, schema, settings
  )
  VALUES
    (
      list_shop,
      owner_a,
      'Shopping',
      'public',
      'proposals',
      '{"fields":[{"id":"name","type":"text"},{"id":"bought_at","type":"date"},{"id":"qty","type":"number"}]}'::jsonb,
      jsonb_build_object(
        'enableCheck', true,
        'onCheck', jsonb_build_array(
          jsonb_build_object('type', 'set_now', 'fieldId', 'bought_at'),
          jsonb_build_object(
            'type', 'move_to_list',
            'targetListId', list_bought,
            'fieldMap', jsonb_build_object('name', 'name', 'qty', 'qty', 'bought_at', 'bought_at'),
            'deleteSource', true
          )
        ),
        'onUncheck', jsonb_build_array(jsonb_build_object('type', 'restore_snapshot'))
      )
    ),
    (
      list_bought,
      owner_a,
      'Bought',
      'private',
      'owner',
      '{"fields":[{"id":"name","type":"text"},{"id":"bought_at","type":"date"},{"id":"qty","type":"number"}]}'::jsonb,
      '{}'::jsonb
    ),
    (
      list_other,
      owner_b,
      'Someone else',
      'private',
      'owner',
      '{"fields":[{"id":"name","type":"text"}]}'::jsonb,
      '{}'::jsonb
    );

  INSERT INTO public.items (id, list_id, values, position, is_checked, created_by, updated_by)
  VALUES
    (item_buy, list_shop, '{"name":"Milk","qty":1}'::jsonb, 1, false, owner_a, owner_a),
    (item_fail, list_shop, '{"name":"Locked","qty":1}'::jsonb, 2, false, owner_a, owner_a),
    (item_plain, list_shop, '{"name":"No move"}'::jsonb, 3, false, owner_a, owner_a),
    (item_copy, list_shop, '{"name":"Keep me"}'::jsonb, 4, false, owner_a, owner_a),
    (item_auto, list_shop, '{"name":"From auto"}'::jsonb, 5, false, owner_a, owner_a),
    (item_prop, list_shop, '{"name":"Propose me","qty":2}'::jsonb, 6, false, owner_a, owner_a),
    (item_uncheck, list_shop, '{"name":"Was checked","bought_at":"2020-01-01"}'::jsonb, 7, true, owner_a, owner_a),
    (item_prop_fail, list_shop, '{"name":"Approve fail"}'::jsonb, 8, false, owner_a, owner_a);

  UPDATE public.items
  SET check_snapshot = '{"name":"original"}'::jsonb
  WHERE id = item_uncheck;

  INSERT INTO public.list_automations (list_id, name, enabled, trigger, actions)
  VALUES (
    list_shop,
    'stamp on check',
    true,
    '{"type":"checked"}'::jsonb,
    '[{"type":"set_field","fieldId":"qty","value":9}]'::jsonb
  );

  -- Direct check: snapshot, set_now, move, plus the list automation.
  CALL pg_temp.as_user(owner_a);
  SELECT * INTO result
  FROM public.toggle_item_checked(item_buy, true, '2026-09-27', '2026-09-27T12:00');

  IF result.list_id IS DISTINCT FROM list_bought THEN
    RAISE EXCEPTION 'direct check did not return the moved item (list %)', result.list_id;
  END IF;
  IF result.id = item_buy THEN
    RAISE EXCEPTION 'direct check returned the source id after a deleting move';
  END IF;
  IF NOT result.is_checked THEN
    RAISE EXCEPTION 'moved item is not checked';
  END IF;
  IF result.check_snapshot->>'name' IS DISTINCT FROM 'Milk' THEN
    RAISE EXCEPTION 'check snapshot was not taken: %', result.check_snapshot;
  END IF;
  IF result.values->>'bought_at' IS DISTINCT FROM '2026-09-27' THEN
    RAISE EXCEPTION 'set_now did not stamp bought_at: %', result.values;
  END IF;
  IF result.values->>'qty' IS DISTINCT FROM '9' THEN
    RAISE EXCEPTION 'checked automation did not run: %', result.values;
  END IF;

  CALL pg_temp.as_super();
  IF EXISTS (SELECT 1 FROM public.items WHERE id = item_buy) THEN
    RAISE EXCEPTION 'source row still on the shopping list after a deleting move';
  END IF;
  SELECT count(*) INTO item_count FROM public.items WHERE list_id = list_bought;
  IF item_count <> 1 THEN
    RAISE EXCEPTION 'expected one bought item, got %', item_count;
  END IF;

  -- Failed move must not leave the item checked. Point this row's list at a
  -- target the owner cannot edit by using a one-off settings swap.
  CALL pg_temp.as_super();
  UPDATE public.lists
  SET settings = jsonb_set(
    settings,
    '{onCheck}',
    jsonb_build_array(
      jsonb_build_object(
        'type', 'move_to_list',
        'targetListId', list_other,
        'fieldMap', jsonb_build_object('name', 'name'),
        'deleteSource', true
      )
    )
  )
  WHERE id = list_shop;

  CALL pg_temp.as_user(owner_a);
  BEGIN
    PERFORM public.toggle_item_checked(item_fail, true, NULL, NULL);
    RAISE EXCEPTION 'move to a foreign list should have failed';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'move to a foreign list should have failed' THEN
        RAISE;
      END IF;
      IF SQLERRM NOT LIKE '%cannot edit target list%' THEN
        RAISE EXCEPTION 'expected cannot edit target list, got %', SQLERRM;
      END IF;
  END;

  CALL pg_temp.as_super();
  IF (SELECT is_checked FROM public.items WHERE id = item_fail) THEN
    RAISE EXCEPTION 'failed move left the source item checked';
  END IF;
  IF (SELECT checked_at FROM public.items WHERE id = item_fail) IS NOT NULL THEN
    RAISE EXCEPTION 'failed move left checked_at set';
  END IF;
  IF EXISTS (SELECT 1 FROM public.items WHERE list_id = list_other) THEN
    RAISE EXCEPTION 'failed move inserted a row on the foreign list';
  END IF;

  -- Restore shopping onCheck (set_now + move to bought) for the remaining cases.
  UPDATE public.lists
  SET settings = jsonb_build_object(
    'enableCheck', true,
    'onCheck', jsonb_build_array(
      jsonb_build_object('type', 'set_now', 'fieldId', 'bought_at'),
      jsonb_build_object(
        'type', 'move_to_list',
        'targetListId', list_bought,
        'fieldMap', jsonb_build_object('name', 'name', 'qty', 'qty', 'bought_at', 'bought_at'),
        'deleteSource', true
      )
    ),
    'onUncheck', jsonb_build_array(jsonb_build_object('type', 'restore_snapshot'))
  )
  WHERE id = list_shop;

  -- Check with no onCheck: item stays, is checked, snapshot stored.
  UPDATE public.lists SET settings = '{"enableCheck":true}'::jsonb WHERE id = list_shop;
  CALL pg_temp.as_user(owner_a);
  SELECT * INTO result FROM public.toggle_item_checked(item_plain, true, '2026-09-27', NULL);
  IF result.id IS DISTINCT FROM item_plain OR result.list_id IS DISTINCT FROM list_shop THEN
    RAISE EXCEPTION 'plain check moved or replaced the row';
  END IF;
  IF NOT result.is_checked OR result.check_snapshot->>'name' IS DISTINCT FROM 'No move' THEN
    RAISE EXCEPTION 'plain check did not snapshot: % %', result.is_checked, result.check_snapshot;
  END IF;

  -- Uncheck restores snapshot values.
  CALL pg_temp.as_super();
  UPDATE public.lists
  SET settings = '{"onUncheck":[{"type":"restore_snapshot"}]}'::jsonb
  WHERE id = list_shop;
  CALL pg_temp.as_user(owner_a);
  SELECT * INTO result FROM public.toggle_item_checked(item_uncheck, false, NULL, NULL);
  IF result.is_checked THEN
    RAISE EXCEPTION 'uncheck left the item checked';
  END IF;
  IF result.checked_at IS NOT NULL THEN
    RAISE EXCEPTION 'uncheck left checked_at set';
  END IF;
  IF result.values->>'name' IS DISTINCT FROM 'original' THEN
    RAISE EXCEPTION 'uncheck did not restore snapshot: %', result.values;
  END IF;
  IF result.check_snapshot IS NOT NULL THEN
    RAISE EXCEPTION 'uncheck did not clear snapshot';
  END IF;

  -- deleteSource false: source stays on the shopping list and is what we return.
  CALL pg_temp.as_super();
  UPDATE public.lists
  SET settings = jsonb_build_object(
    'onCheck', jsonb_build_array(
      jsonb_build_object(
        'type', 'move_to_list',
        'targetListId', list_bought,
        'fieldMap', jsonb_build_object('name', 'name'),
        'deleteSource', false
      )
    )
  )
  WHERE id = list_shop;
  CALL pg_temp.as_user(owner_a);
  SELECT * INTO result FROM public.toggle_item_checked(item_copy, true, NULL, NULL);
  IF result.id IS DISTINCT FROM item_copy OR result.list_id IS DISTINCT FROM list_shop THEN
    RAISE EXCEPTION 'copy move should return the source row, got % on %', result.id, result.list_id;
  END IF;
  IF NOT result.is_checked THEN
    RAISE EXCEPTION 'copy move did not check the source';
  END IF;
  CALL pg_temp.as_super();
  SELECT * INTO moved
  FROM public.items
  WHERE list_id = list_bought AND values->>'name' = 'Keep me';
  IF moved.id IS NULL THEN
    RAISE EXCEPTION 'copy move did not insert on the target list';
  END IF;
  IF moved.id = item_copy THEN
    RAISE EXCEPTION 'copy move reused the source id';
  END IF;

  -- Proposer cannot run the RPC.
  CALL pg_temp.as_user(proposer);
  BEGIN
    PERFORM public.toggle_item_checked(item_auto, true, NULL, NULL);
    RAISE EXCEPTION 'proposer toggled an item';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'proposer toggled an item' THEN
        RAISE;
      END IF;
      IF SQLERRM NOT LIKE '%cannot edit source list%' THEN
        RAISE EXCEPTION 'expected cannot edit source list, got %', SQLERRM;
      END IF;
  END;

  -- Restore shopping pack settings, then approve a check proposal: item moves.
  CALL pg_temp.as_super();
  UPDATE public.lists
  SET settings = jsonb_build_object(
    'enableCheck', true,
    'onCheck', jsonb_build_array(
      jsonb_build_object('type', 'set_now', 'fieldId', 'bought_at'),
      jsonb_build_object(
        'type', 'move_to_list',
        'targetListId', list_bought,
        'fieldMap', jsonb_build_object('name', 'name', 'qty', 'qty', 'bought_at', 'bought_at'),
        'deleteSource', true
      )
    ),
    'onUncheck', jsonb_build_array(jsonb_build_object('type', 'restore_snapshot'))
  )
  WHERE id = list_shop;

  CALL pg_temp.as_user(proposer);
  INSERT INTO public.change_proposals (list_id, item_id, user_id, action, payload)
  VALUES (list_shop, item_prop, proposer, 'check', '{}'::jsonb)
  RETURNING id INTO prop_check;

  CALL pg_temp.as_user(owner_a);
  PERFORM public.review_proposal(prop_check, true, NULL);

  CALL pg_temp.as_super();
  IF EXISTS (SELECT 1 FROM public.items WHERE id = item_prop) THEN
    RAISE EXCEPTION 'approved check left the item on the source list';
  END IF;
  SELECT * INTO moved
  FROM public.items
  WHERE list_id = list_bought AND values->>'name' = 'Propose me';
  IF moved.id IS NULL THEN
    RAISE EXCEPTION 'approved check did not move the item';
  END IF;
  IF NOT moved.is_checked THEN
    RAISE EXCEPTION 'approved check did not mark the moved item checked';
  END IF;
  IF moved.check_snapshot->>'name' IS DISTINCT FROM 'Propose me' THEN
    RAISE EXCEPTION 'approved check did not snapshot: %', moved.check_snapshot;
  END IF;
  bought_at := moved.values->>'bought_at';
  IF bought_at IS NULL OR bought_at = '' THEN
    RAISE EXCEPTION 'approved check did not run set_now';
  END IF;
  -- move_item deletes the source row; change_proposals.item_id is ON DELETE
  -- CASCADE, so the proposal row may already be gone. The reviewer notification
  -- is the durable record that approval ran.
  IF NOT EXISTS (
    SELECT 1
    FROM public.notifications n
    WHERE n.user_id = proposer
      AND n.type = 'proposal_reviewed'
      AND (n.payload->>'proposal_id')::uuid = prop_check
      AND (n.payload->>'approved')::boolean
  ) THEN
    RAISE EXCEPTION 'approved check did not notify the proposer';
  END IF;

  -- Uncheck proposal restores snapshot. Re-check the row without onCheck first.
  UPDATE public.items
  SET
    is_checked = true,
    checked_at = now(),
    values = '{"name":"changed"}'::jsonb,
    check_snapshot = '{"name":"original"}'::jsonb
  WHERE id = item_uncheck;

  CALL pg_temp.as_user(proposer);
  INSERT INTO public.change_proposals (list_id, item_id, user_id, action, payload)
  VALUES (list_shop, item_uncheck, proposer, 'uncheck', '{}'::jsonb)
  RETURNING id INTO prop_uncheck;

  CALL pg_temp.as_user(owner_a);
  PERFORM public.review_proposal(prop_uncheck, true, NULL);
  CALL pg_temp.as_super();
  IF (SELECT is_checked FROM public.items WHERE id = item_uncheck) THEN
    RAISE EXCEPTION 'approved uncheck left the item checked';
  END IF;
  IF (SELECT values->>'name' FROM public.items WHERE id = item_uncheck) IS DISTINCT FROM 'original' THEN
    RAISE EXCEPTION 'approved uncheck did not restore snapshot';
  END IF;

  -- Approving a check whose move cannot run rolls back the proposal too.
  UPDATE public.lists
  SET settings = jsonb_build_object(
    'onCheck', jsonb_build_array(
      jsonb_build_object(
        'type', 'move_to_list',
        'targetListId', list_other,
        'fieldMap', jsonb_build_object('name', 'name'),
        'deleteSource', true
      )
    )
  )
  WHERE id = list_shop;

  CALL pg_temp.as_user(proposer);
  INSERT INTO public.change_proposals (list_id, item_id, user_id, action, payload)
  VALUES (list_shop, item_prop_fail, proposer, 'check', '{}'::jsonb)
  RETURNING id INTO prop_fail;

  CALL pg_temp.as_user(owner_a);
  BEGIN
    PERFORM public.review_proposal(prop_fail, true, NULL);
    RAISE EXCEPTION 'approve should fail when the onCheck move is forbidden';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'approve should fail when the onCheck move is forbidden' THEN
        RAISE;
      END IF;
      IF SQLERRM NOT LIKE '%cannot edit target list%' THEN
        RAISE EXCEPTION 'expected cannot edit target list on approve, got %', SQLERRM;
      END IF;
  END;

  CALL pg_temp.as_super();
  IF (SELECT status FROM public.change_proposals WHERE id = prop_fail) IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'failed approve changed proposal status to %',
      (SELECT status FROM public.change_proposals WHERE id = prop_fail);
  END IF;
  IF (SELECT is_checked FROM public.items WHERE id = item_prop_fail) THEN
    RAISE EXCEPTION 'failed approve left the item checked';
  END IF;

  CALL pg_temp.as_super();
END;
$test$;

SELECT 'toggle_item_checked ok' AS result;

ROLLBACK;
