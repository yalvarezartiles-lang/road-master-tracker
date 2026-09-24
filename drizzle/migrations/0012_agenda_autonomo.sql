ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS es_autonomo boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.can_self_schedule()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND (p.autoescuela_id IS NULL OR p.es_autonomo))
$$;

CREATE OR REPLACE FUNCTION public.can_manage_agenda(_autoescuela uuid, _profesor uuid, _student uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _autoescuela = public.my_autoescuela()
    AND ((_profesor = auth.uid() AND public.can_self_schedule()) OR public.has_role(auth.uid(),'admin_oficina'))
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _profesor AND p.autoescuela_id = _autoescuela)
    AND (_student IS NULL OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = _student AND s.autoescuela_id = _autoescuela))
$$;

DROP POLICY IF EXISTS "Agenda editable" ON public.agenda_diaria;
CREATE POLICY "Agenda editable" ON public.agenda_diaria FOR UPDATE TO authenticated
  USING (autoescuela_id = public.my_autoescuela() AND ((profesor_id = auth.uid() AND public.can_self_schedule()) OR public.has_role(auth.uid(),'admin_oficina')))
  WITH CHECK (public.can_manage_agenda(autoescuela_id, profesor_id, student_id));
DROP POLICY IF EXISTS "Agenda borrable" ON public.agenda_diaria;
CREATE POLICY "Agenda borrable" ON public.agenda_diaria FOR DELETE TO authenticated
  USING (autoescuela_id = public.my_autoescuela() AND ((profesor_id = auth.uid() AND public.can_self_schedule()) OR public.has_role(auth.uid(),'admin_oficina')));