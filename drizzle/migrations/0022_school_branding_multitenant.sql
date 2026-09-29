-- Marca por autoescuela (multi-tenant)
ALTER TABLE public.autoescuelas
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS primary_color text;

-- Solo el super admin puede modificar la marca de una autoescuela
DROP POLICY IF EXISTS "Autoescuela editable por admin" ON public.autoescuelas;
CREATE POLICY "Autoescuela editable por admin"
ON public.autoescuelas
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT, UPDATE ON public.autoescuelas TO authenticated;
GRANT ALL ON public.autoescuelas TO service_role;

-- Logos: lectura para usuarios autenticados, escritura solo super admin
DROP POLICY IF EXISTS "Logos visibles autenticados" ON storage.objects;
CREATE POLICY "Logos visibles autenticados"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'school-logos');

DROP POLICY IF EXISTS "Logos subibles admin" ON storage.objects;
CREATE POLICY "Logos subibles admin"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'school-logos' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Logos actualizables admin" ON storage.objects;
CREATE POLICY "Logos actualizables admin"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'school-logos' AND public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'school-logos' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Logos borrables admin" ON storage.objects;
CREATE POLICY "Logos borrables admin"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'school-logos' AND public.has_role(auth.uid(), 'admin'::app_role));