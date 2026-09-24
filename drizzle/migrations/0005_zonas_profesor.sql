CREATE TABLE public.zonas_profesor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_zona text NOT NULL CHECK (length(trim(nombre_zona)) > 0),
  profesor_id uuid NOT NULL DEFAULT auth.uid(),
  creado_el timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profesor_id, nombre_zona)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zonas_profesor TO authenticated;
GRANT ALL ON public.zonas_profesor TO service_role;
ALTER TABLE public.zonas_profesor ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Zonas profesor select" ON public.zonas_profesor FOR SELECT TO authenticated USING (auth.uid() = profesor_id);
CREATE POLICY "Zonas profesor insert" ON public.zonas_profesor FOR INSERT TO authenticated WITH CHECK (auth.uid() = profesor_id);
CREATE POLICY "Zonas profesor update" ON public.zonas_profesor FOR UPDATE TO authenticated USING (auth.uid() = profesor_id) WITH CHECK (auth.uid() = profesor_id);
CREATE POLICY "Zonas profesor delete" ON public.zonas_profesor FOR DELETE TO authenticated USING (auth.uid() = profesor_id);
INSERT INTO public.zonas_profesor (nombre_zona, profesor_id, creado_el)
SELECT DISTINCT ON (profesor_id, name) name, profesor_id, created_at FROM public.zones ORDER BY profesor_id, name, created_at
ON CONFLICT DO NOTHING;
COMMENT ON TABLE public.zones IS 'DEPRECATED: replaced by zonas_profesor';