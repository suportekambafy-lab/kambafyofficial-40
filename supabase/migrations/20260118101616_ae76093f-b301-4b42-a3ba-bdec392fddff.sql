-- Create table for account collaborators
CREATE TABLE public.account_collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collaborator_email TEXT NOT NULL,
  collaborator_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  permissions JSONB NOT NULL DEFAULT '{"full_access": true}'::jsonb,
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, collaborator_email)
);

-- Enable RLS
ALTER TABLE public.account_collaborators ENABLE ROW LEVEL SECURITY;

-- Policy: Owner can manage their collaborators
CREATE POLICY "Owner can manage collaborators"
ON public.account_collaborators
FOR ALL
USING (auth.uid() = owner_user_id);

-- Policy: Collaborator can view their access
CREATE POLICY "Collaborator can view their access"
ON public.account_collaborators
FOR SELECT
USING (auth.uid() = collaborator_user_id);

-- Create index for faster lookups
CREATE INDEX idx_account_collaborators_owner ON public.account_collaborators(owner_user_id);
CREATE INDEX idx_account_collaborators_collaborator ON public.account_collaborators(collaborator_user_id);
CREATE INDEX idx_account_collaborators_email ON public.account_collaborators(collaborator_email);

-- Function to check if user is collaborator with access to an account
CREATE OR REPLACE FUNCTION public.is_collaborator_of(p_owner_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.account_collaborators
    WHERE owner_user_id = p_owner_user_id
      AND collaborator_user_id = auth.uid()
      AND status = 'active'
  )
$$;

-- Function to get accounts where user is a collaborator
CREATE OR REPLACE FUNCTION public.get_managed_accounts()
RETURNS TABLE (
  owner_user_id UUID,
  owner_email TEXT,
  owner_name TEXT,
  permissions JSONB,
  accepted_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ac.owner_user_id,
    au.email as owner_email,
    COALESCE(p.full_name, au.email) as owner_name,
    ac.permissions,
    ac.accepted_at
  FROM public.account_collaborators ac
  JOIN auth.users au ON au.id = ac.owner_user_id
  LEFT JOIN public.profiles p ON p.id = ac.owner_user_id
  WHERE ac.collaborator_user_id = auth.uid()
    AND ac.status = 'active'
$$;