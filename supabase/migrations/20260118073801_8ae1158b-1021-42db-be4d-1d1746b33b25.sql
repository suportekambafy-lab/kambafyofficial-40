-- CORREÇÃO ADICIONAL: Políticas de products usando 'public' em vez de 'authenticated'

-- Remover policies duplicadas que usam 'public' para operações autenticadas
DROP POLICY IF EXISTS "Owners can view all own products" ON products;
DROP POLICY IF EXISTS "Users can view their own products" ON products;
DROP POLICY IF EXISTS "Users can update own products" ON products;
DROP POLICY IF EXISTS "Users can update their own products" ON products;
DROP POLICY IF EXISTS "Users can delete own products" ON products;
DROP POLICY IF EXISTS "Users can delete their own products" ON products;
DROP POLICY IF EXISTS "Users can insert own products" ON products;
DROP POLICY IF EXISTS "Users can create their own products" ON products;

-- Manter policies públicas para checkout
-- "Active products are publicly viewable" - MANTÉM (checkout precisa)
-- "Public can view active products for checkout" - MANTÉM (checkout precisa)

-- Criar policies corretas para vendedores autenticados
CREATE POLICY "authenticated_users_insert_products" ON products
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "authenticated_users_update_products" ON products
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "authenticated_users_delete_products" ON products
FOR DELETE TO authenticated
USING (user_id = auth.uid());