-- Admin Users: pagination beyond 1000 rows

CREATE OR REPLACE FUNCTION public.get_profiles_for_admin_paginated(
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  full_name text,
  email text,
  banned boolean,
  is_creator boolean,
  avatar_url text,
  bio text,
  account_holder text,
  ban_reason text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.full_name,
    p.email,
    p.banned,
    p.is_creator,
    p.avatar_url,
    p.bio,
    p.account_holder,
    p.ban_reason,
    p.created_at
  FROM public.profiles p
  WHERE (
    p_search IS NULL
    OR (
      COALESCE(p.full_name, '') ILIKE ('%' || p_search || '%')
      OR COALESCE(p.email, '') ILIKE ('%' || p_search || '%')
    )
  )
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_profiles_for_admin_count(
  p_search text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::bigint
    FROM public.profiles p
    WHERE (
      p_search IS NULL
      OR (
        COALESCE(p.full_name, '') ILIKE ('%' || p_search || '%')
        OR COALESCE(p.email, '') ILIKE ('%' || p_search || '%')
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_profiles_for_admin_paginated(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profiles_for_admin_count(text) TO authenticated;