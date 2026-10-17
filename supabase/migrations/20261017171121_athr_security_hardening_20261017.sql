-- ATHR security hardening migration (source reconciliation copy).
-- This file records the security hardening already applied to the live project.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public FROM authenticated;

CREATE OR REPLACE FUNCTION public.guard_profile_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.role() = 'service_role' OR current_user NOT IN ('anon', 'authenticated') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS DISTINCT FROM 'user' OR NEW.verified IS DISTINCT FROM false OR NEW.premium IS DISTINCT FROM false
       OR NEW.followers IS DISTINCT FROM 0 OR NEW.following IS DISTINCT FROM 0 THEN
      RAISE EXCEPTION 'Protected profile fields may not be set during signup' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF public.is_admin() THEN RETURN NEW; END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.role IS DISTINCT FROM OLD.role OR NEW.verified IS DISTINCT FROM OLD.verified
     OR NEW.premium IS DISTINCT FROM OLD.premium OR NEW.followers IS DISTINCT FROM OLD.followers
     OR NEW.following IS DISTINCT FROM OLD.following OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Protected profile fields require administrator privileges' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER guard_profile_sensitive_fields
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_sensitive_fields();

CREATE OR REPLACE FUNCTION public.guard_merchant_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE base_slug text;
BEGIN
  IF auth.role() = 'service_role' OR current_user NOT IN ('anon', 'authenticated') THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF public.is_admin() THEN RETURN NEW; END IF;
    IF NEW.owner_id IS NULL THEN NEW.owner_id := auth.uid(); END IF;
    IF auth.uid() IS NULL OR NEW.owner_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'A merchant application must belong to the signed-in user' USING ERRCODE = '42501';
    END IF;
    IF NEW.approved IS DISTINCT FROM false OR NEW.verified IS DISTINCT FROM false
       OR NEW.plan IS DISTINCT FROM 'free' OR NEW.rating IS DISTINCT FROM 0
       OR NEW.review_count IS DISTINCT FROM 0 OR NEW.commission_rate IS DISTINCT FROM 0.05
       OR NEW.product_count IS DISTINCT FROM 0 THEN
      RAISE EXCEPTION 'Protected merchant fields cannot be set during application' USING ERRCODE = '42501';
    END IF;
    IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
      base_slug := trim(both '-' from regexp_replace(lower(coalesce(NEW.name, 'store')), '[^a-z0-9]+', '-', 'g'));
      IF base_slug = '' THEN base_slug := 'store'; END IF;
      NEW.slug := base_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
    END IF;
    RETURN NEW;
  END IF;
  IF public.is_admin() THEN RETURN NEW; END IF;
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.approved IS DISTINCT FROM OLD.approved
     OR NEW.verified IS DISTINCT FROM OLD.verified OR NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.rating IS DISTINCT FROM OLD.rating OR NEW.review_count IS DISTINCT FROM OLD.review_count
     OR NEW.affiliate_network IS DISTINCT FROM OLD.affiliate_network
     OR NEW.commission_rate IS DISTINCT FROM OLD.commission_rate OR NEW.product_count IS DISTINCT FROM OLD.product_count
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Protected merchant fields require administrator privileges' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_merchant_sensitive_fields ON public.merchants;
CREATE TRIGGER guard_merchant_sensitive_fields
BEFORE INSERT OR UPDATE ON public.merchants
FOR EACH ROW EXECUTE FUNCTION public.guard_merchant_sensitive_fields();

CREATE OR REPLACE FUNCTION public.toggle_save(look_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE now_saved boolean;
BEGIN
  IF toggle_save.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.saved_looks sl
    WHERE sl.user_id = toggle_save.user_id AND sl.look_id = toggle_save.look_id
  ) THEN
    DELETE FROM public.saved_looks sl
    WHERE sl.user_id = toggle_save.user_id AND sl.look_id = toggle_save.look_id;
    UPDATE public.looks l SET saves = GREATEST(l.saves - 1, 0) WHERE l.id = toggle_save.look_id;
    now_saved := false;
  ELSE
    INSERT INTO public.saved_looks (user_id, look_id)
    VALUES (toggle_save.user_id, toggle_save.look_id);
    UPDATE public.looks l SET saves = l.saves + 1 WHERE l.id = toggle_save.look_id;
    now_saved := true;
  END IF;
  RETURN now_saved;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_like(look_id uuid, liked boolean, user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE changed integer := 0;
BEGIN
  IF set_like.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  IF set_like.liked THEN
    INSERT INTO public.likes AS existing_like (user_id, look_id, liked)
    VALUES (set_like.user_id, set_like.look_id, true)
    ON CONFLICT (user_id, look_id) DO UPDATE SET liked = true
    WHERE existing_like.liked IS DISTINCT FROM true;
    GET DIAGNOSTICS changed = ROW_COUNT;
    IF changed > 0 THEN
      UPDATE public.looks l SET likes = l.likes + 1 WHERE l.id = set_like.look_id;
    END IF;
  ELSE
    DELETE FROM public.likes l
    WHERE l.user_id = set_like.user_id AND l.look_id = set_like.look_id AND l.liked = true;
    GET DIAGNOSTICS changed = ROW_COUNT;
    IF changed > 0 THEN
      UPDATE public.looks l SET likes = GREATEST(l.likes - 1, 0) WHERE l.id = set_like.look_id;
    END IF;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_follow(target_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE now_following boolean;
BEGIN
  IF toggle_follow.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  IF toggle_follow.target_id = toggle_follow.user_id THEN
    RAISE EXCEPTION 'cannot follow yourself';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.follows f
    WHERE f.user_id = toggle_follow.user_id AND f.target_id = toggle_follow.target_id
  ) THEN
    DELETE FROM public.follows f
    WHERE f.user_id = toggle_follow.user_id AND f.target_id = toggle_follow.target_id;
    UPDATE public.profiles p SET followers = GREATEST(p.followers - 1, 0)
    WHERE p.id = toggle_follow.target_id;
    now_following := false;
  ELSE
    INSERT INTO public.follows (user_id, target_id)
    VALUES (toggle_follow.user_id, toggle_follow.target_id);
    UPDATE public.profiles p SET followers = p.followers + 1
    WHERE p.id = toggle_follow.target_id;
    now_following := true;
  END IF;
  RETURN now_following;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_merchant_owner(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.battle_result(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.vote_in_battle(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.toggle_save(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_like(uuid, boolean, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.toggle_follow(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.toggle_look_in_collection(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.similar_looks(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.merchant_stats(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_overview() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_merchant_owner(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.battle_result(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.similar_looks(uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vote_in_battle(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_save(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_like(uuid, boolean, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_follow(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_look_in_collection(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.merchant_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM authenticated;
