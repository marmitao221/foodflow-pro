
DROP POLICY IF EXISTS "Company logos: public read" ON storage.objects;
-- Public bucket already serves files via public URL without needing a SELECT policy.
-- Restrict listing/select via storage API to authenticated users only.
CREATE POLICY "Company logos: authenticated can list"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'company-logos');
