-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'profesor');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Usuarios ven perfiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuario actualiza su perfil" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Usuarios ven roles" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

-- Zonas
CREATE TABLE public.zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zones TO authenticated;
GRANT ALL ON public.zones TO service_role;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Zonas visibles" ON public.zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Zonas insertables" ON public.zones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Zonas borrables" ON public.zones FOR DELETE TO authenticated USING (true);

-- Alumnos
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  avatar_color TEXT NOT NULL DEFAULT 'oklch(0.62 0.17 250)',
  skills JSONB NOT NULL DEFAULT '{"volante":"rojo","pedales":"rojo","marchas":"rojo","observacion":"rojo","glorietas":"rojo","estacionamiento":"rojo"}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Alumnos visibles" ON public.students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Alumnos insertables" ON public.students FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Alumnos editables" ON public.students FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Alumnos borrables" ON public.students FOR DELETE TO authenticated USING (true);

-- Clases
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  zone TEXT NOT NULL DEFAULT '',
  topics TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX lessons_student_idx ON public.lessons(student_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clases visibles" ON public.lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Clases insertables" ON public.lessons FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Clases editables" ON public.lessons FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Clases borrables" ON public.lessons FOR DELETE TO authenticated USING (true);

INSERT INTO public.zones (name) VALUES
  ('Vecindario'), ('Cruce de Arinaga'), ('Las Palmas'), ('Zona de Examen');
