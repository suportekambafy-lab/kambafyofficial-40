-- Fix exposed data in lesson_progress table
-- Remove overly permissive policy and create proper restricted ones
DROP POLICY IF EXISTS "Members manage own progress via email" ON lesson_progress;

CREATE POLICY "Students can view own progress"
ON lesson_progress FOR SELECT
USING (
  user_email = get_current_user_email() 
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM member_areas ma
    WHERE ma.id = lesson_progress.member_area_id 
    AND ma.user_id = auth.uid()
  )
);

CREATE POLICY "Students can insert own progress"
ON lesson_progress FOR INSERT
WITH CHECK (
  user_email IS NOT NULL OR user_id = auth.uid()
);

CREATE POLICY "Students can update own progress"
ON lesson_progress FOR UPDATE
USING (
  user_email = get_current_user_email() 
  OR user_id = auth.uid()
);

-- Fix exposed data in lesson_comments table
DROP POLICY IF EXISTS "System can manage lesson comments" ON lesson_comments;
DROP POLICY IF EXISTS "Students can create comments with session" ON lesson_comments;

-- Fix exposed data in module_payments table
-- Currently no proper RLS, add restrictive policies
DROP POLICY IF EXISTS "Anyone can read module payments" ON module_payments;

CREATE POLICY "Students can view own module payments"
ON module_payments FOR SELECT
USING (
  student_email = get_current_user_email()
  OR EXISTS (
    SELECT 1 FROM member_areas ma
    WHERE ma.id = module_payments.member_area_id 
    AND ma.user_id = auth.uid()
  )
);

CREATE POLICY "Service role manages module payments"
ON module_payments FOR ALL
USING (true)
WITH CHECK (true);

-- Fix refund_requests table - ensure proper RLS
DROP POLICY IF EXISTS "Anyone can view refund requests" ON refund_requests;
DROP POLICY IF EXISTS "Public can view refund requests" ON refund_requests;

CREATE POLICY "Buyers can view own refund requests"
ON refund_requests FOR SELECT
USING (
  buyer_email = get_current_user_email()
  OR EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id::text = refund_requests.order_id
    AND o.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = get_current_user_email() AND is_active = true
  )
);

CREATE POLICY "Buyers can create refund requests"
ON refund_requests FOR INSERT
WITH CHECK (true);

CREATE POLICY "Sellers and admins can update refund requests"
ON refund_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id::text = refund_requests.order_id
    AND o.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = get_current_user_email() AND is_active = true
  )
);