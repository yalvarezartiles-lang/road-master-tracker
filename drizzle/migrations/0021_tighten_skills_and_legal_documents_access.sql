DROP POLICY IF EXISTS "Habilidades visibles" ON public.skills;
CREATE POLICY "Habilidades visibles para usuarios con rol"
ON public.skills
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'admin_oficina'::public.app_role)
  OR public.has_role(auth.uid(), 'profesor'::public.app_role)
);

DROP POLICY IF EXISTS "Autenticados leen documentos legales" ON storage.objects;
CREATE POLICY "Super admin lee documentos legales"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documentos-legales'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);