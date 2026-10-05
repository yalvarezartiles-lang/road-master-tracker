import * as React from "react";
import { supabase } from "@/integrations/supabase/client";

/** Franja superior: aviso 5 días antes del vencimiento y cuenta atrás de los 2 días de cortesía. */
export function SubscriptionBanner() {
  const [days, setDays] = React.useState<number | null>(null);
  React.useEffect(() => {
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [{ data: p }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("fecha_vencimiento").eq("id", u.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      ]);
      if ((roles ?? []).some((r) => r.role === "admin" || r.role === "admin_oficina")) return;
      if (!p?.fecha_vencimiento) return;
      const [y, m, d] = p.fecha_vencimiento.split("-").map(Number);
      const venc = new Date(y!, m! - 1, d!).getTime();
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      setDays(Math.round((venc - today) / 86400000));
    })().catch(() => {});
  }, []);
  if (days === null || days > 5 || days < -2) return null;
  const expired = days < 0;
  const n = expired ? 2 + days : days;
  return (
    <div role="status" className={`w-full px-4 py-1.5 text-center text-sm font-medium ${expired ? "bg-red-50 text-red-800" : "bg-orange-50 text-orange-800"}`}>
      {expired
        ? `Suscripción caducada. Tienes ${n} día${n === 1 ? "" : "s"} de cortesía antes del bloqueo.`
        : days === 0
          ? "Tu suscripción finaliza hoy. Contacta con administración para renovarla."
          : `Tu suscripción finaliza en ${days} día${days === 1 ? "" : "s"}. Contacta con administración para renovarla.`}
    </div>
  );
}
