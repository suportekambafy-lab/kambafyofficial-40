
-- Add missing columns to webhook_settings table
ALTER TABLE public.webhook_settings 
ADD COLUMN IF NOT EXISTS headers jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS timeout integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS retries integer DEFAULT 3;
