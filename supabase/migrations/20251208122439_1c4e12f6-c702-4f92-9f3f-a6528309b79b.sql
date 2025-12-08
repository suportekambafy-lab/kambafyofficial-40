
-- ================================================
-- CORREÇÃO: customer_access e facebook_pixel_settings
-- ================================================

-- =============================================
-- 1. CUSTOMER_ACCESS: Restringir acesso
-- =============================================

-- Remover política pública insegura
DROP POLICY IF EXISTS "System can manage customer access" ON public.customer_access;

-- Criar política segura para service_role apenas (edge functions)
CREATE POLICY "Service role can manage customer access"
ON public.customer_access
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Revogar acesso anónimo
REVOKE ALL ON public.customer_access FROM anon;

-- =============================================
-- 2. FACEBOOK_PIXEL_SETTINGS: Restringir acesso
-- =============================================

-- Remover política pública que expõe pixel IDs
DROP POLICY IF EXISTS "Public can view active pixels for checkout" ON public.facebook_pixel_settings;

-- Criar política segura: apenas dono do produto ou service_role pode ver pixels
-- Para checkout público, usar edge function com service_role
CREATE POLICY "Service role can view pixels for checkout"
ON public.facebook_pixel_settings
FOR SELECT
TO service_role
USING (true);

-- Revogar acesso anónimo
REVOKE ALL ON public.facebook_pixel_settings FROM anon;
