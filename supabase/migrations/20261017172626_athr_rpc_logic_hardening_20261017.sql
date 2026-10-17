-- ATHR RPC logic hardening: ownership checks, concurrency, and safe search paths.
-- No existing user data is deleted or rewritten.

CREATE OR REPLACE FUNCTION public.toggle_look_in_collection(collection_id uuid, look_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  already_present boolean;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'sign in required' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM public.collections c
    WHERE c.id = toggle_look_in_collection.collection_id
      AND c.owner_id = (SELECT auth.uid()) FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not your collection' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.looks l WHERE l.id = toggle_look_in_collection.look_id) THEN
    RAISE EXCEPTION 'look not found';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = toggle_look_in_collection.collection_id
      AND toggle_look_in_collection.look_id::text = ANY (COALESCE(c.look_ids, ARRAY[]::text[]))
  ) INTO already_present;
  IF already_present THEN
    UPDATE public.collections c
    SET look_ids = array_remove(COALESCE(c.look_ids, ARRAY[]::text[]), toggle_look_in_collection.look_id::text)
    WHERE c.id = toggle_look_in_collection.collection_id AND c.owner_id = (SELECT auth.uid());
    RETURN false;
  END IF;
  UPDATE public.collections c
  SET look_ids = array_append(COALESCE(c.look_ids, ARRAY[]::text[]), toggle_look_in_collection.look_id::text)
  WHERE c.id = toggle_look_in_collection.collection_id AND c.owner_id = (SELECT auth.uid());
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_follow(target_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE now_following boolean;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR toggle_follow.user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  IF toggle_follow.target_id = toggle_follow.user_id THEN RAISE EXCEPTION 'cannot follow yourself'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(toggle_follow.user_id::text), pg_catalog.hashtext(toggle_follow.target_id::text));
  IF EXISTS (SELECT 1 FROM public.follows f WHERE f.user_id = toggle_follow.user_id AND f.target_id = toggle_follow.target_id) THEN
    DELETE FROM public.follows f WHERE f.user_id = toggle_follow.user_id AND f.target_id = toggle_follow.target_id;
    UPDATE public.profiles p SET followers = GREATEST(p.followers - 1, 0) WHERE p.id = toggle_follow.target_id;
    UPDATE public.profiles p SET following = GREATEST(p.following - 1, 0) WHERE p.id = toggle_follow.user_id;
    now_following := false;
  ELSE
    INSERT INTO public.follows (user_id, target_id) VALUES (toggle_follow.user_id, toggle_follow.target_id);
    UPDATE public.profiles p SET followers = p.followers + 1 WHERE p.id = toggle_follow.target_id;
    UPDATE public.profiles p SET following = p.following + 1 WHERE p.id = toggle_follow.user_id;
    now_following := true;
  END IF;
  RETURN now_following;
END;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_save(look_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE now_saved boolean;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR toggle_save.user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(toggle_save.user_id::text), pg_catalog.hashtext(toggle_save.look_id::text));
  IF EXISTS (SELECT 1 FROM public.saved_looks sl WHERE sl.user_id = toggle_save.user_id AND sl.look_id = toggle_save.look_id) THEN
    DELETE FROM public.saved_looks sl WHERE sl.user_id = toggle_save.user_id AND sl.look_id = toggle_save.look_id;
    UPDATE public.looks l SET saves = GREATEST(l.saves - 1, 0) WHERE l.id = toggle_save.look_id;
    now_saved := false;
  ELSE
    INSERT INTO public.saved_looks (user_id, look_id) VALUES (toggle_save.user_id, toggle_save.look_id);
    UPDATE public.looks l SET saves = l.saves + 1 WHERE l.id = toggle_save.look_id;
    now_saved := true;
  END IF;
  RETURN now_saved;
END;
$function$;

CREATE OR REPLACE FUNCTION public.vote_in_battle(battle_id uuid, side text, user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE existing text;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR vote_in_battle.user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'cannot vote for another user' USING ERRCODE = '42501';
  END IF;
  IF vote_in_battle.side IS NULL OR vote_in_battle.side NOT IN ('left', 'right') THEN
    RAISE EXCEPTION 'invalid side';
  END IF;
  PERFORM 1 FROM public.battles b WHERE b.id = vote_in_battle.battle_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'battle not found'; END IF;
  SELECT v.side INTO existing FROM public.votes v
    WHERE v.battle_id = vote_in_battle.battle_id AND v.user_id = vote_in_battle.user_id;
  IF existing IS NULL THEN
    INSERT INTO public.votes (battle_id, user_id, side)
    VALUES (vote_in_battle.battle_id, vote_in_battle.user_id, vote_in_battle.side);
    UPDATE public.battles b
    SET votes_left = b.votes_left + CASE WHEN vote_in_battle.side = 'left' THEN 1 ELSE 0 END,
        votes_right = b.votes_right + CASE WHEN vote_in_battle.side = 'right' THEN 1 ELSE 0 END
    WHERE b.id = vote_in_battle.battle_id;
  ELSIF existing IS DISTINCT FROM vote_in_battle.side THEN
    UPDATE public.votes v SET side = vote_in_battle.side
    WHERE v.battle_id = vote_in_battle.battle_id AND v.user_id = vote_in_battle.user_id;
    UPDATE public.battles b
    SET votes_left = b.votes_left + CASE WHEN vote_in_battle.side = 'left' THEN 1 ELSE 0 END
                                  - CASE WHEN existing = 'left' THEN 1 ELSE 0 END,
        votes_right = b.votes_right + CASE WHEN vote_in_battle.side = 'right' THEN 1 ELSE 0 END
                                    - CASE WHEN existing = 'right' THEN 1 ELSE 0 END
    WHERE b.id = vote_in_battle.battle_id;
  END IF;
  RETURN public.battle_result(vote_in_battle.battle_id);
END;
$function$;

ALTER FUNCTION public.admin_overview() SET search_path = '';
ALTER FUNCTION public.battle_result(uuid) SET search_path = '';
ALTER FUNCTION public.current_role() SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.is_admin() SET search_path = '';
ALTER FUNCTION public.is_merchant_owner(uuid) SET search_path = '';
ALTER FUNCTION public.merchant_stats(uuid) SET search_path = '';
ALTER FUNCTION public.set_like(uuid, boolean, uuid) SET search_path = '';
ALTER FUNCTION public.similar_looks(uuid, integer) SET search_path = '';
