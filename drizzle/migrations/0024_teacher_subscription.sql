ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fecha_vencimiento date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS estado_pago boolean NOT NULL DEFAULT false;

-- Solo el Super Admin (o el servidor con service role) puede cambiar la suscripción.
CREATE OR REPLACE FUNCTION public.protect_subscription_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.fecha_vencimiento IS DISTINCT FROM OLD.fecha_vencimiento OR NEW.estado_pago IS DISTINCT FROM OLD.estado_pago)
     AND auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'No autorizado para cambiar la suscripción';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER profiles_protect_subscription
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_subscription_fields();