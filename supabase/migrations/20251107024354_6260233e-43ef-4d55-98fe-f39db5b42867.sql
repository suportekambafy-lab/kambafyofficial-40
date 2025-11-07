-- Adicionar política RLS para admins visualizarem saldos de vendedores
CREATE POLICY "Admins can view all balances"
ON customer_balances
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.email = get_current_user_email() 
    AND admin_users.is_active = true
  )
);