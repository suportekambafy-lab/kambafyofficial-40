-- Fix abandoned_purchases - restrict to only product owners
DROP POLICY IF EXISTS "Users can view abandoned purchases for their products" ON abandoned_purchases;

CREATE POLICY "Product owners can view their abandoned purchases"
ON abandoned_purchases FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM products p
    WHERE p.id = abandoned_purchases.product_id 
    AND p.user_id = auth.uid()
  )
);

-- Fix admin_impersonation_sessions - ensure it's only accessible to super admins
DROP POLICY IF EXISTS "Only super admins can view impersonation sessions" ON admin_impersonation_sessions;

CREATE POLICY "Super admins can view impersonation sessions"
ON admin_impersonation_sessions FOR SELECT
USING (
  is_super_admin(get_current_user_email())
);

-- Make sure there are no public read policies on these tables
-- Verify RLS is enabled
ALTER TABLE abandoned_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_impersonation_sessions ENABLE ROW LEVEL SECURITY;