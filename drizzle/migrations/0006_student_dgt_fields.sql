ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS apellidos text NOT NULL DEFAULT ''::text,
  ADD COLUMN IF NOT EXISTS dni text NOT NULL DEFAULT ''::text;