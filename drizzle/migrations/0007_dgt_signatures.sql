ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS apellidos text NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS dni text NOT NULL DEFAULT '';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS matricula text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS hora_inicio text,
  ADD COLUMN IF NOT EXISTS hora_fin text,
  ADD COLUMN IF NOT EXISTS firma_alumno text,
  ADD COLUMN IF NOT EXISTS firma_profesor text;