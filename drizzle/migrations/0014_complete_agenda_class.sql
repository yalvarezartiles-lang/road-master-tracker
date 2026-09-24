CREATE OR REPLACE FUNCTION public.complete_agenda_class(_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.agenda_diaria SET estado = 'completada'
  WHERE id = _id AND profesor_id = auth.uid() AND estado <> 'cancelada';
$$;
REVOKE ALL ON FUNCTION public.complete_agenda_class(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_agenda_class(uuid) TO authenticated;