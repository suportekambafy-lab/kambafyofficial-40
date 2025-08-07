-- Add foreign key constraint to identity_verification table
-- This will allow joins with the profiles table

-- Add foreign key constraint
ALTER TABLE public.identity_verification 
ADD CONSTRAINT identity_verification_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;