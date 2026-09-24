DELETE FROM public.skills;
UPDATE public.students SET skills = '{}'::jsonb;
DROP POLICY IF EXISTS "Habilidades propias select" ON public.skills;
DROP POLICY IF EXISTS "Habilidades propias insert" ON public.skills;
DROP POLICY IF EXISTS "Habilidades propias update" ON public.skills;
DROP POLICY IF EXISTS "Habilidades propias delete" ON public.skills;
ALTER TABLE public.skills DROP CONSTRAINT IF EXISTS skills_profesor_id_name_key;
ALTER TABLE public.skills ALTER COLUMN profesor_id DROP NOT NULL;
ALTER TABLE public.skills ADD COLUMN block smallint NOT NULL DEFAULT 1 CHECK (block BETWEEN 1 AND 6);
ALTER TABLE public.skills ADD CONSTRAINT skills_block_name_unique UNIQUE (block, name);
CREATE POLICY "Habilidades visibles" ON public.skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Habilidades insert admin" ON public.skills FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Habilidades update admin" ON public.skills FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Habilidades delete admin" ON public.skills FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.skills (name, block, profesor_id) VALUES
('Ajuste de asiento y espejos',1,NULL),('Cinturón y puertas',1,NULL),('Luces e indicadores',1,NULL),
('Volante',2,NULL),('Pedales',2,NULL),('Marchas',2,NULL),
('Incorporación a la marcha',3,NULL),('Posición en la calzada',3,NULL),('Velocidad adecuada',3,NULL),('Cambios de carril',3,NULL),
('Cruces y prioridades',4,NULL),('Glorietas',4,NULL),('Semáforos y señales',4,NULL),('Observación',4,NULL),
('Estacionamiento en línea',5,NULL),('Estacionamiento en batería',5,NULL),('Marcha atrás',5,NULL),('Cambio de sentido',5,NULL),
('Seguir indicaciones de ruta',6,NULL),('Toma de decisiones',6,NULL),('Conducción eficiente',6,NULL);