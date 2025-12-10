-- =====================================================
-- FIX: Remover políticas que expõem TODOS os perfis
-- =====================================================

-- Remover as políticas permissivas que usam "true"
DROP POLICY IF EXISTS "Authenticated users can view public profile info" ON public.profiles;
DROP POLICY IF EXISTS "Public profile data for authenticated users" ON public.profiles;

-- Remover políticas duplicadas de SELECT para evitar conflitos
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Manter apenas a política restritiva: usuários veem apenas seu próprio perfil
-- A política "Users can view their own profile" já existe com (auth.uid() = user_id)

-- Manter política de admin que já existe
-- "Admins can view all profiles" com is_active_admin_by_auth_id()

-- =====================================================
-- Criar função segura para acessar dados públicos de vendedores
-- (necessário para checkout onde compradores veem info do vendedor)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_seller_basic_info(p_user_id uuid)
RETURNS TABLE(full_name text, avatar_url text, business_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Apenas retorna dados públicos mínimos do vendedor
  -- Não expõe email, telefone, IBAN, ou outros dados sensíveis
  RETURN QUERY
  SELECT 
    pr.full_name,
    pr.avatar_url,
    pr.business_name
  FROM profiles pr
  WHERE pr.user_id = p_user_id
  LIMIT 1;
END;
$$;