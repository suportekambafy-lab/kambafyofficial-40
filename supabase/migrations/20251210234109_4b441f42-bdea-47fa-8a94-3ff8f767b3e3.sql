-- =====================================================
-- FIX: Adicionar políticas para permitir que estudantes vejam módulos e aulas
-- O problema é que sessões virtuais não têm auth.uid() válido
-- =====================================================

-- Política para permitir leitura anônima de módulos (validação de acesso é feita no frontend/RPC)
DROP POLICY IF EXISTS "Public can view published modules" ON modules;
CREATE POLICY "Public can view published modules" 
ON modules FOR SELECT 
USING (status = 'published');

-- Política para permitir leitura anônima de lessons publicadas
DROP POLICY IF EXISTS "Public can view published lessons" ON lessons;
CREATE POLICY "Public can view published lessons" 
ON lessons FOR SELECT 
USING (status = 'published');