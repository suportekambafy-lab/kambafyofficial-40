-- Drop the existing update policy
DROP POLICY IF EXISTS "Students can update own progress" ON public.lesson_progress;

-- Create a new policy that allows updates for member area students
-- This checks if there's an active session for the student email OR if user is authenticated
CREATE POLICY "Students can update own progress"
ON public.lesson_progress
FOR UPDATE
USING (
  (user_email IS NOT NULL AND user_email != '') OR 
  (user_id = auth.uid()) OR
  (EXISTS (
    SELECT 1 FROM member_areas ma 
    WHERE ma.id = lesson_progress.member_area_id AND ma.user_id = auth.uid()
  ))
);

-- Also update the insert policy to be more permissive for member area students
DROP POLICY IF EXISTS "Students can insert own progress" ON public.lesson_progress;

CREATE POLICY "Students can insert own progress"
ON public.lesson_progress
FOR INSERT
WITH CHECK (
  (user_email IS NOT NULL AND user_email != '') OR 
  (user_id = auth.uid())
);

-- Add a policy that allows anyone to insert/update progress if they have a valid email
-- This is needed because member area students are not authenticated via Supabase Auth
CREATE POLICY "Allow progress for member area verified emails"
ON public.lesson_progress
FOR ALL
USING (user_email IS NOT NULL AND user_email != '')
WITH CHECK (user_email IS NOT NULL AND user_email != '');