ALTER TABLE public.students ADD COLUMN IF NOT EXISTS archivado boolean NOT NULL DEFAULT false;
DROP POLICY IF EXISTS "Alumnos de mi autoescuela borrables" ON public.students;
CREATE POLICY "Solo super admin borra alumnos" ON public.students FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));