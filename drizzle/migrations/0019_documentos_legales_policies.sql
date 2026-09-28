-- Solo el Super Admin gestiona el reglamento; cualquier usuario autenticado puede leerlo.
CREATE POLICY "Autenticados leen documentos legales"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documentos-legales');

CREATE POLICY "Super admin sube documentos legales"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documentos-legales' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Super admin actualiza documentos legales"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documentos-legales' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'documentos-legales' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Super admin borra documentos legales"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documentos-legales' AND public.has_role(auth.uid(), 'admin'));