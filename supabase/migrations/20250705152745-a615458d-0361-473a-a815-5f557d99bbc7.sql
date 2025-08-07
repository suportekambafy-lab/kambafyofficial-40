
-- Add IBAN and account holder columns to the profiles table
ALTER TABLE public.profiles 
ADD COLUMN iban TEXT,
ADD COLUMN account_holder TEXT;
