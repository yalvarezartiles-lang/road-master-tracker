DROP POLICY IF EXISTS "Zonas insertables por admin" ON public.zones;
CREATE POLICY "Zonas insertables por profesores" ON public.zones FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'profesor'));
CREATE UNIQUE INDEX IF NOT EXISTS zones_name_unique ON public.zones (lower(name));

CREATE TABLE public.lesson_whiteboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL UNIQUE REFERENCES public.lessons(id) ON DELETE CASCADE,
  image text NOT NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_whiteboards TO authenticated;
GRANT ALL ON public.lesson_whiteboards TO service_role;
ALTER TABLE public.lesson_whiteboards ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_lesson(_lesson_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.lessons l JOIN public.students s ON s.id = l.student_id
    WHERE l.id = _lesson_id AND s.created_by = auth.uid())
$$;

CREATE POLICY "Pizarras visibles" ON public.lesson_whiteboards FOR SELECT TO authenticated USING (public.can_access_lesson(lesson_id));
CREATE POLICY "Pizarras insertables" ON public.lesson_whiteboards FOR INSERT TO authenticated WITH CHECK (public.can_access_lesson(lesson_id));
CREATE POLICY "Pizarras editables" ON public.lesson_whiteboards FOR UPDATE TO authenticated USING (public.can_access_lesson(lesson_id)) WITH CHECK (public.can_access_lesson(lesson_id));
CREATE POLICY "Pizarras borrables" ON public.lesson_whiteboards FOR DELETE TO authenticated USING (public.can_access_lesson(lesson_id));