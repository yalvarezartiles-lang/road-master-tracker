ALTER TABLE public.students ADD COLUMN IF NOT EXISTS fecha_archivado timestamptz;
UPDATE public.students SET fecha_archivado = now() WHERE archivado = true AND fecha_archivado IS NULL;