-- Adicionar política para admins visualizarem reembolsos usando get_current_user_email
DROP POLICY IF EXISTS "Admins manage all refunds" ON refund_requests;

CREATE POLICY "Admins view all refunds"
ON refund_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.email = get_current_user_email()
    AND admin_users.is_active = true
  )
);

CREATE POLICY "Admins update all refunds"
ON refund_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.email = get_current_user_email()
    AND admin_users.is_active = true
  )
);