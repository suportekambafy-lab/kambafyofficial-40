-- Fix security issue: Remove public access to lessons table and implement proper access control

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can view lessons from member areas" ON public.lessons;

-- Create secure policy for lesson access
-- Only allow:
-- 1. Lesson creators to view their own lessons
-- 2. Students with valid member area access to view authorized lessons
CREATE POLICY "Secure lesson access for creators and authorized students" 
ON public.lessons 
FOR SELECT 
USING (
  -- Lesson creator can view their own lessons
  (auth.uid() = user_id)
  OR 
  -- Students with valid member area access can view lessons
  (
    status = 'published' 
    AND member_area_id IS NOT NULL
    AND (
      -- Check if user is a registered student for this member area
      EXISTS (
        SELECT 1 
        FROM public.member_area_students mas
        WHERE mas.member_area_id = lessons.member_area_id
        AND mas.student_email = (
          SELECT email FROM auth.users WHERE id = auth.uid()
        )
      )
      OR
      -- Check if user has a valid session for this member area
      EXISTS (
        SELECT 1 
        FROM public.member_area_sessions sess
        WHERE sess.member_area_id = lessons.member_area_id
        AND sess.student_email = (
          SELECT email FROM auth.users WHERE id = auth.uid()
        )
        AND sess.expires_at > now()
      )
    )
  )
);