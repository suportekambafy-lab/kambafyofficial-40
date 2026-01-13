-- Corrigir RPC function com colunas corretas
DROP FUNCTION IF EXISTS get_referral_applications_for_admin(text);

CREATE OR REPLACE FUNCTION get_referral_applications_for_admin(status_filter text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_email text,
  user_name text,
  instagram_url text,
  youtube_url text,
  tiktok_url text,
  facebook_url text,
  other_social_url text,
  audience_size text,
  motivation text,
  preferred_reward_option text,
  status text,
  referral_code text,
  approved_by text,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF status_filter IS NULL OR status_filter = 'all' THEN
    RETURN QUERY
    SELECT 
      rpa.id, rpa.user_id, rpa.user_email, rpa.user_name,
      rpa.instagram_url, rpa.youtube_url, rpa.tiktok_url, 
      rpa.facebook_url, rpa.other_social_url, rpa.audience_size,
      rpa.motivation, rpa.preferred_reward_option, rpa.status,
      rpa.referral_code, rpa.approved_by, rpa.approved_at,
      rpa.rejection_reason, rpa.created_at, rpa.updated_at
    FROM referral_program_applications rpa
    ORDER BY rpa.created_at DESC;
  ELSE
    RETURN QUERY
    SELECT 
      rpa.id, rpa.user_id, rpa.user_email, rpa.user_name,
      rpa.instagram_url, rpa.youtube_url, rpa.tiktok_url, 
      rpa.facebook_url, rpa.other_social_url, rpa.audience_size,
      rpa.motivation, rpa.preferred_reward_option, rpa.status,
      rpa.referral_code, rpa.approved_by, rpa.approved_at,
      rpa.rejection_reason, rpa.created_at, rpa.updated_at
    FROM referral_program_applications rpa
    WHERE rpa.status = status_filter
    ORDER BY rpa.created_at DESC;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_referral_applications_for_admin TO anon, authenticated;