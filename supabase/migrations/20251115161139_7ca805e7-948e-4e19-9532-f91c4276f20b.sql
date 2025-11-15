-- Remove duplicate records, keeping only the first occurrence for each email/announcement_type
DELETE FROM app_announcement_sent a
WHERE a.id NOT IN (
  SELECT DISTINCT ON (email, announcement_type) id
  FROM app_announcement_sent
  ORDER BY email, announcement_type, created_at ASC
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE app_announcement_sent
ADD CONSTRAINT unique_email_announcement UNIQUE (email, announcement_type);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_app_announcement_sent_email_type 
ON app_announcement_sent(email, announcement_type);