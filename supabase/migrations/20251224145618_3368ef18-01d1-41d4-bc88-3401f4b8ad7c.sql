-- Função RPC para admins buscarem todos os usuários (bypassa RLS)
CREATE OR REPLACE FUNCTION get_all_profiles_for_admin()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  full_name TEXT,
  email TEXT,
  banned BOOLEAN,
  is_creator BOOLEAN,
  avatar_url TEXT,
  bio TEXT,
  account_holder TEXT,
  ban_reason TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  FROM profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- Dar permissão para usuários anônimos e autenticados chamarem a função
GRANT EXECUTE ON FUNCTION get_all_profiles_for_admin() TO anon, authenticated;