DELETE FROM public.zones;
ALTER TABLE public.zones ADD COLUMN profesor_id uuid NOT NULL DEFAULT auth.uid();
ALTER TABLE public.zones ADD CONSTRAINT zones_profesor_name_unique UNIQUE (profesor_id, name);
DROP POLICY IF EXISTS "Zonas borrables por admin" ON public.zones;
DROP POLICY IF EXISTS "Zonas insertables por profesores" ON public.zones;
DROP POLICY IF EXISTS "Zonas visibles" ON public.zones;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zones TO authenticated;
CREATE POLICY "Zonas propias select" ON public.zones FOR SELECT TO authenticated USING (auth.uid() = profesor_id);
CREATE POLICY "Zonas propias insert" ON public.zones FOR INSERT TO authenticated WITH CHECK (auth.uid() = profesor_id);
CREATE POLICY "Zonas propias update" ON public.zones FOR UPDATE TO authenticated USING (auth.uid() = profesor_id) WITH CHECK (auth.uid() = profesor_id);
CREATE POLICY "Zonas propias delete" ON public.zones FOR DELETE TO authenticated USING (auth.uid() = profesor_id);

CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  profesor_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profesor_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skills TO authenticated;
GRANT ALL ON public.skills TO service_role;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Habilidades propias select" ON public.skills FOR SELECT TO authenticated USING (auth.uid() = profesor_id);
CREATE POLICY "Habilidades propias insert" ON public.skills FOR INSERT TO authenticated WITH CHECK (auth.uid() = profesor_id);
CREATE POLICY "Habilidades propias update" ON public.skills FOR UPDATE TO authenticated USING (auth.uid() = profesor_id) WITH CHECK (auth.uid() = profesor_id);
CREATE POLICY "Habilidades propias delete" ON public.skills FOR DELETE TO authenticated USING (auth.uid() = profesor_id);

ALTER TABLE public.students ALTER COLUMN skills SET DEFAULT '{}'::jsonb;