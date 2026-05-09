
INSERT INTO storage.buckets (id, name, public)
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view stories files" ON storage.objects;
CREATE POLICY "Public can view stories files"
ON storage.objects FOR SELECT
USING (bucket_id = 'stories');

DROP POLICY IF EXISTS "Authenticated can upload stories files" ON storage.objects;
CREATE POLICY "Authenticated can upload stories files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'stories');

DROP POLICY IF EXISTS "Authenticated can update stories files" ON storage.objects;
CREATE POLICY "Authenticated can update stories files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'stories');

DROP POLICY IF EXISTS "Authenticated can delete stories files" ON storage.objects;
CREATE POLICY "Authenticated can delete stories files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'stories');
