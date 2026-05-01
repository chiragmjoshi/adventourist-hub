-- Create public bucket for itinerary images
INSERT INTO storage.buckets (id, name, public)
VALUES ('itinerary-images', 'itinerary-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Public can view itinerary-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'itinerary-images');

-- Authenticated write
CREATE POLICY "Authenticated can upload itinerary-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'itinerary-images');

CREATE POLICY "Authenticated can update itinerary-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'itinerary-images');

CREATE POLICY "Authenticated can delete itinerary-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'itinerary-images');
