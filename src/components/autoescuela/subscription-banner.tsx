import * as React from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

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

function LockScreen() {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-background px-6 text-center">
      <Lock className="size-16 text-muted-foreground/50" strokeWidth={1.5} />
      <h1 className="text-2xl font-bold tracking-tight">Acceso Bloqueado</h1>
      <p className="max-w-sm text-base text-muted-foreground">
        Tu suscripción ha expirado y el periodo de cortesía ha terminado. Contacta con la administración para restaurar tu acceso.
      </p>
      <Button variant="outline" className="h-12 rounded-2xl px-6" onClick={async () => {
        await supabase.auth.signOut();
        void navigate({ to: "/auth", search: { next: undefined }, replace: true });
      }}>
        Cerrar sesión
      </Button>
    </div>
  );
}

/** Envuelve todas las rutas privadas: revalida la suscripción en cada cambio de pantalla. */
export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [days, setDays] = React.useState<number | null>(null);
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    fetchDaysRemaining()
      .then((d) => { if (active) setDays(d); })
      .catch(() => { /* sin conexión: se mantiene el último estado conocido */ })
      .finally(() => { if (active) setChecked(true); });
    return () => { active = false; };
  }, [pathname]);

  if (!checked) return null;
  // ESTADO 3: bloqueo total — no se renderiza la app.
  if (days !== null && days < -2) return <LockScreen />;

  let banner: React.ReactNode = null;
  if (days !== null && days <= 0) {
    const x = 2 + days;
    banner = (
      <div role="alert" className="sticky top-0 z-[60] w-full bg-red-50 px-4 py-1.5 text-center text-sm font-medium text-red-800">
        Suscripción caducada. Te quedan {x} días de cortesía para usar la cuenta antes del bloqueo total.
      </div>
    );
  } else if (days !== null && days <= 5) {
    banner = (
      <div role="status" className="w-full bg-orange-50 px-4 py-1.5 text-center text-sm font-medium text-orange-800">
        Tu suscripción finaliza en {days} día{days === 1 ? "" : "s"}. Contacta con administración para renovarla.
      </div>
    );
  }
  return <>{banner}{children}</>;
}
