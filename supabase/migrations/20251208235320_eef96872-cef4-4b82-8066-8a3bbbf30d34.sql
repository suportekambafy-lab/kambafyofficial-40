-- Add timezone column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.profiles.timezone IS 'User preferred timezone (e.g., Africa/Luanda, Europe/Lisbon). NULL means auto-detect by country.';