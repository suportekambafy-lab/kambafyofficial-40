-- Add parent_comment_id column to support replies
ALTER TABLE public.lesson_comments 
ADD COLUMN parent_comment_id uuid REFERENCES public.lesson_comments(id) ON DELETE CASCADE;

-- Add user metadata columns to store email and name directly
ALTER TABLE public.lesson_comments
ADD COLUMN user_email text,
ADD COLUMN user_name text;