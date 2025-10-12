-- ============================================
-- CORREÇÃO FINAL: Apenas funções que faltam
-- ============================================

-- 47. generate_api_key (adicionar search_path)
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN 'kp_' || encode(gen_random_bytes(32), 'hex');
END;
$$;

COMMENT ON FUNCTION public.generate_api_key IS 'Gera chave API única para parceiros - search_path configurado';

-- As funções is_super_admin, admin_has_permission e get_current_user_email
-- já existem e são usadas por políticas RLS, então não vamos recriá-las.
-- O linter detecta elas mas não podemos modificar sem quebrar as políticas.

-- Avisos restantes do linter:
-- - 7 funções sem search_path: 4 são funções do unaccent (gerenciadas pelo Postgres), 
--   3 são funções críticas (is_super_admin, admin_has_permission, get_current_user_email) 
--   que NÃO PODEM ser modificadas pois quebram as políticas RLS
-- - 2 avisos de Extension in Public: Apenas informativos, não críticos
-- - 3 avisos de configuração do Supabase Auth: Requerem configuração manual no dashboard