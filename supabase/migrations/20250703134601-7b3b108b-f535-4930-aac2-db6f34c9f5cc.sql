
-- Tornar o bucket member-videos público
UPDATE storage.buckets SET public = true WHERE id = 'member-videos';
