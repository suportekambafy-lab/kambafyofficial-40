-- Add language field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'pt' 
CHECK (language IN ('pt', 'en', 'es'));

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.language IS 'User preferred interface language: pt (Portuguese), en (English), es (Spanish)';