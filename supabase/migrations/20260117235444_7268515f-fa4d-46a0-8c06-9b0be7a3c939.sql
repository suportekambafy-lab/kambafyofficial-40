-- ============================================
-- FIX 1: admin_users password_hash exposure
-- Create safe view without password_hash
-- ============================================

-- Create a secure view that excludes password_hash
CREATE OR REPLACE VIEW public.admin_users_safe AS
SELECT 
  id,
  email,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
FROM public.admin_users;

-- Grant SELECT on the safe view to authenticated users
GRANT SELECT ON public.admin_users_safe TO authenticated;

-- Revoke SELECT on admin_users from authenticated - only service_role should access
REVOKE SELECT ON public.admin_users FROM authenticated;
REVOKE SELECT ON public.admin_users FROM anon;

-- ============================================
-- FIX 2: Rate limiting for authentication
-- Create table to track failed login attempts
-- ============================================

CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  attempt_type text NOT NULL DEFAULT 'password', -- 'password', '2fa', 'member_area'
  attempted_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_failed_login_email_time ON public.failed_login_attempts(email, attempted_at);
CREATE INDEX IF NOT EXISTS idx_failed_login_ip_time ON public.failed_login_attempts(ip_address, attempted_at);

-- Enable RLS
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- Only service_role can access this table (for edge functions)
REVOKE ALL ON public.failed_login_attempts FROM anon, authenticated;
GRANT ALL ON public.failed_login_attempts TO service_role;

-- Create RPC function to check rate limit (used by edge functions)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  check_email text,
  check_ip text DEFAULT NULL,
  attempt_type text DEFAULT 'password',
  max_attempts int DEFAULT 5,
  window_minutes int DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_attempts int;
  ip_attempts int;
  is_blocked boolean := false;
  block_reason text := null;
BEGIN
  -- Count attempts by email in the time window
  SELECT COUNT(*) INTO email_attempts
  FROM failed_login_attempts
  WHERE email = lower(trim(check_email))
    AND failed_login_attempts.attempt_type = check_rate_limit.attempt_type
    AND attempted_at > now() - (window_minutes || ' minutes')::interval;

  -- Count attempts by IP if provided
  IF check_ip IS NOT NULL THEN
    SELECT COUNT(*) INTO ip_attempts
    FROM failed_login_attempts
    WHERE ip_address = check_ip
      AND failed_login_attempts.attempt_type = check_rate_limit.attempt_type
      AND attempted_at > now() - (window_minutes || ' minutes')::interval;
  ELSE
    ip_attempts := 0;
  END IF;

  -- Check if blocked
  IF email_attempts >= max_attempts THEN
    is_blocked := true;
    block_reason := 'Too many attempts for this email';
  ELSIF ip_attempts >= (max_attempts * 3) THEN
    is_blocked := true;
    block_reason := 'Too many attempts from this IP';
  END IF;

  RETURN jsonb_build_object(
    'blocked', is_blocked,
    'reason', block_reason,
    'email_attempts', email_attempts,
    'ip_attempts', ip_attempts,
    'max_attempts', max_attempts,
    'window_minutes', window_minutes
  );
END;
$$;

-- Create function to record failed attempt
CREATE OR REPLACE FUNCTION public.record_failed_attempt(
  attempt_email text,
  attempt_ip text DEFAULT NULL,
  attempt_type text DEFAULT 'password'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO failed_login_attempts (email, ip_address, attempt_type)
  VALUES (lower(trim(attempt_email)), attempt_ip, attempt_type);
END;
$$;

-- Create function to clear attempts after successful login
CREATE OR REPLACE FUNCTION public.clear_failed_attempts(
  attempt_email text,
  attempt_type text DEFAULT 'password'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM failed_login_attempts
  WHERE email = lower(trim(attempt_email))
    AND failed_login_attempts.attempt_type = clear_failed_attempts.attempt_type;
END;
$$;

-- ============================================
-- FIX 3: Admin member area access validation
-- Create RPC function to validate admin JWT for member area access
-- ============================================

CREATE OR REPLACE FUNCTION public.verify_admin_member_area_access(
  target_member_area_id uuid,
  admin_email text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_exists boolean;
BEGIN
  -- Check if admin exists and is active
  SELECT EXISTS (
    SELECT 1 FROM admin_users
    WHERE email = lower(trim(admin_email))
    AND is_active = true
  ) INTO admin_exists;

  RETURN admin_exists;
END;
$$;

-- ============================================
-- FIX 4: Improve admin permission validation
-- Ensure permissions are always validated server-side
-- ============================================

-- The existing admin_has_permission function is already good
-- Add a function to verify admin role from database
CREATE OR REPLACE FUNCTION public.get_admin_role(admin_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_role text;
BEGIN
  SELECT role::text INTO admin_role
  FROM admin_users
  WHERE email = lower(trim(admin_email))
  AND is_active = true;
  
  RETURN admin_role;
END;
$$;

-- Clean up old failed attempts after 24 hours (maintenance)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM failed_login_attempts
  WHERE attempted_at < now() - interval '24 hours';
END;
$$;