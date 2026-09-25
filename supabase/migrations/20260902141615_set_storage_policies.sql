/*
# Set storage policies for item-images bucket

## Purpose
Allow authenticated users to upload images, and public read access for viewing.
*/

DROP POLICY IF EXISTS "Allow authenticated upload to item-images" ON storage.objects;
CREATE POLICY "Allow authenticated upload to item-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'item-images');

DROP POLICY IF EXISTS "Allow public read from item-images" ON storage.objects;
CREATE POLICY "Allow public read from item-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'item-images');

DROP POLICY IF EXISTS "Allow authenticated update to item-images" ON storage.objects;
CREATE POLICY "Allow authenticated update to item-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'item-images');

DROP POLICY IF EXISTS "Allow authenticated delete from item-images" ON storage.objects;
CREATE POLICY "Allow authenticated delete from item-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'item-images');
