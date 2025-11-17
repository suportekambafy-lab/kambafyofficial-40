-- ============================================
-- FIX RLS POLICIES FOR PROFILES TABLE
-- ============================================

-- Drop existing duplicate/incomplete UPDATE policies
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile only" ON public.profiles;

-- Create correct UPDATE policy with USING and WITH CHECK for upsert operations
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- ADD ONESIGNAL SYNC LOGS RLS POLICIES
-- ============================================

-- Allow users to insert their own sync logs
CREATE POLICY "Users can insert their own sync logs"
ON public.onesignal_sync_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own sync logs
CREATE POLICY "Users can view their own sync logs"
ON public.onesignal_sync_logs
FOR SELECT
USING (auth.uid() = user_id);

-- ============================================
-- CREATE ADMIN FUNCTION TO GET ONESIGNAL STATS
-- ============================================

CREATE OR REPLACE FUNCTION public.get_onesignal_stats()
RETURNS TABLE(
  total_users BIGINT,
  users_with_player_id BIGINT,
  success_rate NUMERIC,
  recent_syncs_count BIGINT,
  failed_syncs_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.profiles)::BIGINT as total_users,
    (SELECT COUNT(*) FROM public.profiles WHERE onesignal_player_id IS NOT NULL)::BIGINT as users_with_player_id,
    CASE 
      WHEN (SELECT COUNT(*) FROM public.profiles) > 0 
      THEN ROUND(
        (SELECT COUNT(*) FROM public.profiles WHERE onesignal_player_id IS NOT NULL)::NUMERIC / 
        (SELECT COUNT(*) FROM public.profiles)::NUMERIC * 100, 
        2
      )
      ELSE 0
    END as success_rate,
    (SELECT COUNT(*) FROM public.onesignal_sync_logs WHERE created_at > NOW() - INTERVAL '24 hours')::BIGINT as recent_syncs_count,
    (SELECT COUNT(*) FROM public.onesignal_sync_logs WHERE status = 'error' AND created_at > NOW() - INTERVAL '24 hours')::BIGINT as failed_syncs_count;
END;
$$;