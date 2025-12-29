-- Fix PGRST203 ambiguity: PostgREST can't choose between overloaded functions
-- Keep the 3-arg version (with p_admin_email) exposed to authenticated,
-- and hide the 2-arg version from PostgREST roles.

REVOKE EXECUTE ON FUNCTION public.admin_process_transfer_request(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_process_transfer_request(uuid, text) FROM authenticated;

-- Ensure authenticated can execute the canonical function
GRANT EXECUTE ON FUNCTION public.admin_process_transfer_request(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.admin_process_transfer_request(uuid, text) IS
  'LEGACY overload (hidden from anon/authenticated to avoid PostgREST ambiguity)';
