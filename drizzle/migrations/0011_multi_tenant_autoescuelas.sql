CREATE TABLE public.autoescuelas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_comercial text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.autoescuelas TO authenticated;
GRANT ALL ON public.autoescuelas TO service_role;
ALTER TABLE public.autoescuelas ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ADD COLUMN autoescuela_id uuid REFERENCES public.autoescuelas(id) ON DELETE SET NULL;
ALTER TABLE public.students ADD COLUMN autoescuela_id uuid REFERENCES public.autoescuelas(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.my_autoescuela()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT autoescuela_id FROM public.profiles WHERE id = auth.uid()
$$;

ALTER TABLE public.students ALTER COLUMN autoescuela_id SET DEFAULT public.my_autoescuela();

-- Backfill: primera autoescuela
WITH a AS (INSERT INTO public.autoescuelas (nombre_comercial) VALUES ('Autoescuela Adaassa') RETURNING id)
UPDATE public.profiles SET autoescuela_id = (SELECT id FROM a);
UPDATE public.students SET autoescuela_id = (SELECT id FROM public.autoescuelas ORDER BY created_at LIMIT 1) WHERE autoescuela_id IS NULL;

CREATE POLICY "Autoescuela propia visible" ON public.autoescuelas FOR SELECT TO authenticated
  USING (id = public.my_autoescuela() OR public.has_role(auth.uid(),'admin'));

-- Profiles
DROP POLICY IF EXISTS "Perfil propio visible" ON public.profiles;
CREATE POLICY "Perfiles de mi autoescuela" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR (autoescuela_id IS NOT NULL AND autoescuela_id = public.my_autoescuela()) OR public.has_role(auth.uid(),'admin'));

-- Roles visibles dentro de la autoescuela
DROP POLICY IF EXISTS "Rol propio visible" ON public.user_roles;
CREATE POLICY "Roles de mi autoescuela" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = user_roles.user_id AND p.autoescuela_id = public.my_autoescuela()));

-- Students
DROP POLICY IF EXISTS "Alumnos insertables por autor" ON public.students;
DROP POLICY IF EXISTS "Alumnos propios borrables" ON public.students;
DROP POLICY IF EXISTS "Alumnos propios editables" ON public.students;
DROP POLICY IF EXISTS "Alumnos propios visibles" ON public.students;
CREATE POLICY "Alumnos de mi autoescuela visibles" ON public.students FOR SELECT TO authenticated USING (autoescuela_id = public.my_autoescuela());
CREATE POLICY "Alumnos de mi autoescuela insertables" ON public.students FOR INSERT TO authenticated WITH CHECK (autoescuela_id = public.my_autoescuela());
CREATE POLICY "Alumnos de mi autoescuela editables" ON public.students FOR UPDATE TO authenticated USING (autoescuela_id = public.my_autoescuela()) WITH CHECK (autoescuela_id = public.my_autoescuela());
CREATE POLICY "Alumnos de mi autoescuela borrables" ON public.students FOR DELETE TO authenticated USING (autoescuela_id = public.my_autoescuela());

-- Lessons (siguen al alumno)
CREATE OR REPLACE FUNCTION public.student_in_my_school(_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.students s WHERE s.id = _student_id AND s.autoescuela_id = public.my_autoescuela())
$$;
DROP POLICY IF EXISTS "Clases insertables por autor" ON public.lessons;
DROP POLICY IF EXISTS "Clases propias borrables" ON public.lessons;
DROP POLICY IF EXISTS "Clases propias editables" ON public.lessons;
DROP POLICY IF EXISTS "Clases propias visibles" ON public.lessons;
CREATE POLICY "Clases de mi autoescuela visibles" ON public.lessons FOR SELECT TO authenticated USING (public.student_in_my_school(student_id));
CREATE POLICY "Clases de mi autoescuela insertables" ON public.lessons FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND public.student_in_my_school(student_id));
CREATE POLICY "Clases de mi autoescuela editables" ON public.lessons FOR UPDATE TO authenticated USING (public.student_in_my_school(student_id)) WITH CHECK (public.student_in_my_school(student_id));
CREATE POLICY "Clases de mi autoescuela borrables" ON public.lessons FOR DELETE TO authenticated USING (public.student_in_my_school(student_id));

CREATE OR REPLACE FUNCTION public.can_access_lesson(_lesson_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.lessons l JOIN public.students s ON s.id = l.student_id
    WHERE l.id = _lesson_id AND s.autoescuela_id = public.my_autoescuela())
$$;

-- Agenda diaria
CREATE TABLE public.agenda_diaria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autoescuela_id uuid NOT NULL DEFAULT public.my_autoescuela() REFERENCES public.autoescuelas(id) ON DELETE CASCADE,
  profesor_id uuid NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  fecha date NOT NULL,
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL,
  estado text NOT NULL DEFAULT 'programada',
  notas text NOT NULL DEFAULT '',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agenda_diaria TO authenticated;
GRANT ALL ON public.agenda_diaria TO service_role;
ALTER TABLE public.agenda_diaria ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_agenda(_autoescuela uuid, _profesor uuid, _student uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _autoescuela = public.my_autoescuela()
    AND (_profesor = auth.uid() OR public.has_role(auth.uid(),'admin_oficina'))
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _profesor AND p.autoescuela_id = _autoescuela)
    AND (_student IS NULL OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = _student AND s.autoescuela_id = _autoescuela))
$$;
CREATE POLICY "Agenda visible" ON public.agenda_diaria FOR SELECT TO authenticated
  USING (autoescuela_id = public.my_autoescuela() AND (profesor_id = auth.uid() OR public.has_role(auth.uid(),'admin_oficina')));
CREATE POLICY "Agenda insertable" ON public.agenda_diaria FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_agenda(autoescuela_id, profesor_id, student_id));
CREATE POLICY "Agenda editable" ON public.agenda_diaria FOR UPDATE TO authenticated
  USING (autoescuela_id = public.my_autoescuela() AND (profesor_id = auth.uid() OR public.has_role(auth.uid(),'admin_oficina')))
  WITH CHECK (public.can_manage_agenda(autoescuela_id, profesor_id, student_id));
CREATE POLICY "Agenda borrable" ON public.agenda_diaria FOR DELETE TO authenticated
  USING (autoescuela_id = public.my_autoescuela() AND (profesor_id = auth.uid() OR public.has_role(auth.uid(),'admin_oficina')));
CREATE INDEX agenda_diaria_prof_fecha ON public.agenda_diaria (profesor_id, fecha);