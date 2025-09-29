-- Remove foreign key constraint from lesson_comments table
ALTER TABLE public.lesson_comments DROP CONSTRAINT IF EXISTS lesson_comments_user_id_fkey;

-- Make user_id nullable since we'll use email/name for member area students
ALTER TABLE public.lesson_comments ALTER COLUMN user_id DROP NOT NULL;