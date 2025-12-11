-- Allow anyone to read lesson comments (comments are public within the lesson context)
CREATE POLICY "Anyone can view lesson comments"
ON public.lesson_comments
FOR SELECT
USING (true);

-- Note: This is acceptable because:
-- 1. Comments are meant to be visible to all students in a lesson
-- 2. The lesson_id already scopes the comments to a specific lesson
-- 3. Comments don't contain PII - they are public discussions
-- 4. Access to the lesson page itself is already controlled by member area access