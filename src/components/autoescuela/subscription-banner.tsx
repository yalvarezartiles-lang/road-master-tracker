import * as React from "react";
import { Navigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isAccountExpired } from "@/lib/autoescuela/subscription";

/** Días hasta el vencimiento (0 = vence hoy, negativo = caducada). null = sin control (staff o sin fecha). */
async function fetchDaysRemaining(): Promise<number | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const [{ data: p }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("fecha_vencimiento").eq("id", u.user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", u.user.id),
  ]);
  if ((roles ?? []).some((r) => r.role === "admin" || r.role === "admin_oficina")) return null;
  if (!p?.fecha_vencimiento) return null;
  const [y, m, d] = p.fecha_vencimiento.split("-").map(Number);
  const venc = new Date(y!, m! - 1, d!).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((venc - today) / 86400000);
}

/** Envuelve todas las rutas privadas: revalida la suscripción en cada cambio de pantalla. */
export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [days, setDays] = React.useState<number | null>(null);
  const [expired, setExpired] = React.useState(false);
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(({ data }) => data.user ? isAccountExpired(data.user.id) : false)
      .then((x) => { if (active && x) setExpired(true); }).catch(() => {});
    fetchDaysRemaining()
      .then((d) => { if (active) setDays(d); })
      .catch(() => { /* sin conexión: se mantiene el último estado conocido */ })
      .finally(() => { if (active) setChecked(true); });
    return () => { active = false; };
  }, [pathname]);

  if (!checked) return null;
  // Bloqueado: la fecha de vencimiento ya pasó — no se renderiza nada de la app.
  if (expired) return <Navigate to="/bloqueado" replace />;

  const banner = days !== null && days >= 0 && days <= 5 ? (
    <div role="status" className="w-full bg-orange-50 px-4 py-1.5 text-center text-sm font-medium text-orange-800">
      {days === 0
        ? "Tu suscripción finaliza hoy. Contacta con administración para renovarla."
        : `Tu suscripción finaliza en ${days} día${days === 1 ? "" : "s"}. Contacta con administración para renovarla.`}
    </div>
  ) : null;
  return <>{banner}{children}</>;
}
