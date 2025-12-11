-- Allow students to read their own notifications
CREATE POLICY "Students can view their own notifications"
ON public.member_area_notifications
FOR SELECT
USING (student_email IS NOT NULL);

-- Allow students to update their own notifications (mark as read)
CREATE POLICY "Students can update their own notifications"
ON public.member_area_notifications
FOR UPDATE
USING (student_email IS NOT NULL);

-- Allow students to delete their own notifications
CREATE POLICY "Students can delete their own notifications"
ON public.member_area_notifications
FOR DELETE
USING (student_email IS NOT NULL);