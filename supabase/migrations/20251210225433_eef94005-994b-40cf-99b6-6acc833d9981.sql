-- =====================================================
-- FIX: Adicionar permissões GRANT para identity_verification
-- O problema é que a tabela não tem permissões de acesso
-- =====================================================

-- Garantir que authenticated pode operar na tabela
GRANT SELECT, INSERT, UPDATE ON identity_verification TO authenticated;

-- Verificar e garantir que RLS está habilitado (já está, mas por segurança)
ALTER TABLE identity_verification ENABLE ROW LEVEL SECURITY;