-- Allow system to manage lesson comments
CREATE POLICY "System can manage lesson comments" ON lesson_comments
FOR ALL 
USING (true)
WITH CHECK (true);