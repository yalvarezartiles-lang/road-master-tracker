-- Ownership defaults
ALTER TABLE public.students ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.lessons ALTER COLUMN created_by SET DEFAULT auth.uid();

UPDATE public.students SET created_by = (SELECT user_id FROM public.user_roles WHERE role = 'admin' LIMIT 1) WHERE created_by IS NULL;
UPDATE public.lessons SET created_by = (SELECT user_id FROM public.user_roles WHERE role = 'admin' LIMIT 1) WHERE created_by IS NULL;

-- STUDENTS
DROP POLICY IF EXISTS "Alumnos visibles" ON public.students;
DROP POLICY IF EXISTS "Alumnos editables" ON public.students;
DROP POLICY IF EXISTS "Alumnos borrables" ON public.students;
DROP POLICY IF EXISTS "Alumnos insertables" ON public.students;

CREATE POLICY "Alumnos propios visibles" ON public.students FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Alumnos propios editables" ON public.students FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Alumnos propios borrables" ON public.students FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Alumnos insertables por autor" ON public.students FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- LESSONS (ownership follows the student)
DROP POLICY IF EXISTS "Clases visibles" ON public.lessons;
DROP POLICY IF EXISTS "Clases editables" ON public.lessons;
DROP POLICY IF EXISTS "Clases borrables" ON public.lessons;
DROP POLICY IF EXISTS "Clases insertables" ON public.lessons;

CREATE POLICY "Clases propias visibles" ON public.lessons FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = lessons.student_id AND s.created_by = auth.uid())
  );
CREATE POLICY "Clases propias editables" ON public.lessons FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = lessons.student_id AND s.created_by = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = lessons.student_id AND s.created_by = auth.uid())
  );
CREATE POLICY "Clases propias borrables" ON public.lessons FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = lessons.student_id AND s.created_by = auth.uid())
  );
CREATE POLICY "Clases insertables por autor" ON public.lessons FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = lessons.student_id
        AND (s.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

-- PROFILES: only own profile, admins see all
DROP POLICY IF EXISTS "Usuarios ven perfiles" ON public.profiles;
CREATE POLICY "Perfil propio visible" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- USER ROLES: only own roles, admins see all
DROP POLICY IF EXISTS "Usuarios ven roles" ON public.user_roles;
CREATE POLICY "Rol propio visible" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ZONES: everyone signed in can read; only admins change shared config
DROP POLICY IF EXISTS "Zonas insertables" ON public.zones;
DROP POLICY IF EXISTS "Zonas borrables" ON public.zones;
CREATE POLICY "Zonas insertables por admin" ON public.zones FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Zonas borrables por admin" ON public.zones FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
