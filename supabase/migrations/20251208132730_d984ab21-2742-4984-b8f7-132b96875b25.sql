-- Create a helper function to check if user is admin (using email from auth.users)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND au.is_active = true
  )
$$;

-- Add admin READ policies to profiles table
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (is_admin());

-- Add admin READ policies to orders table
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders"
ON orders FOR SELECT
USING (is_admin());

-- Add admin READ policies to products table  
DROP POLICY IF EXISTS "Admins can view all products" ON products;
CREATE POLICY "Admins can view all products"
ON products FOR SELECT
USING (is_admin());

-- Add admin READ policies to identity_verification table
DROP POLICY IF EXISTS "Admins can view all identity verifications" ON identity_verification;
CREATE POLICY "Admins can view all identity verifications"
ON identity_verification FOR SELECT
USING (is_admin());

-- Add admin UPDATE policies to identity_verification
DROP POLICY IF EXISTS "Admins can update identity verifications" ON identity_verification;
CREATE POLICY "Admins can update identity verifications"
ON identity_verification FOR UPDATE
USING (is_admin());

-- Add admin READ policies to withdrawal_requests table
DROP POLICY IF EXISTS "Admins can view all withdrawal requests" ON withdrawal_requests;
CREATE POLICY "Admins can view all withdrawal requests"
ON withdrawal_requests FOR SELECT
USING (is_admin());

-- Add admin UPDATE policies to withdrawal_requests
DROP POLICY IF EXISTS "Admins can update withdrawal requests" ON withdrawal_requests;
CREATE POLICY "Admins can update withdrawal requests"
ON withdrawal_requests FOR UPDATE
USING (is_admin());

-- Add admin READ policies to customer_balances table
DROP POLICY IF EXISTS "Admins can view all balances" ON customer_balances;
CREATE POLICY "Admins can view all balances"
ON customer_balances FOR SELECT
USING (is_admin());

-- Add admin READ policies to balance_transactions table
DROP POLICY IF EXISTS "Admins can view all balance transactions" ON balance_transactions;
CREATE POLICY "Admins can view all balance transactions"
ON balance_transactions FOR SELECT
USING (is_admin());

-- Add admin READ policies to refund_requests table
DROP POLICY IF EXISTS "Admins can view all refund requests" ON refund_requests;
CREATE POLICY "Admins can view all refund requests"
ON refund_requests FOR SELECT
USING (is_admin());

-- Add admin UPDATE policies to refund_requests
DROP POLICY IF EXISTS "Admins can update refund requests" ON refund_requests;
CREATE POLICY "Admins can update refund requests"
ON refund_requests FOR UPDATE
USING (is_admin());

-- Add admin UPDATE policies to profiles (for ban, etc)
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
USING (is_admin());

-- Add admin UPDATE policies to orders
DROP POLICY IF EXISTS "Admins can update all orders" ON orders;
CREATE POLICY "Admins can update all orders"
ON orders FOR UPDATE
USING (is_admin());