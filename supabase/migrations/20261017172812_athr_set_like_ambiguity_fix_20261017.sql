-- Fix the ambiguous ON CONFLICT target in set_like (user_id is also an argument name).
CREATE OR REPLACE FUNCTION public.set_like(look_id uuid, liked boolean, user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE changed integer := 0;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR set_like.user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  IF set_like.liked THEN
    INSERT INTO public.likes AS existing_like (user_id, look_id, liked)
    VALUES (set_like.user_id, set_like.look_id, true)
    ON CONFLICT ON CONSTRAINT likes_pkey DO UPDATE SET liked = true
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
