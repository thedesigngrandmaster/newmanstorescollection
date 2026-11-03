
CREATE POLICY "public read media" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "staff upload media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND public.is_staff_or_admin(auth.uid()));
CREATE POLICY "staff update media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media' AND public.is_staff_or_admin(auth.uid()));
CREATE POLICY "staff delete media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND public.is_staff_or_admin(auth.uid()));
