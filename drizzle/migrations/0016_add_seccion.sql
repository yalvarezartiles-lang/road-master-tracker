ALTER TABLE public.students ADD COLUMN IF NOT EXISTS seccion text NOT NULL DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seccion text NOT NULL DEFAULT '';
CREATE OR REPLACE FUNCTION public.set_profesor_seccion(_profesor uuid, _seccion text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR (public.has_role(auth.uid(),'admin_oficina')
     AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=_profesor AND p.autoescuela_id = public.my_autoescuela()))) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  UPDATE public.profiles SET seccion = left(trim(_seccion),40) WHERE id = _profesor;
END $$;
REVOKE ALL ON FUNCTION public.set_profesor_seccion(uuid,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_profesor_seccion(uuid,text) TO authenticated;