import { createFileRoute, isRedirect, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { GlobalCopilot } from "@/components/autoescuela/global-copilot";
import { SubscriptionGuard } from "@/components/autoescuela/subscription-banner";
import { ErrorBoundary } from "@/components/error-boundary";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { next: undefined } });
    // Suscripción: bloqueo inmediato al día siguiente del vencimiento (sin borrar la cuenta).
    try {
      const [{ data: p }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("fecha_vencimiento").eq("id", data.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", data.user.id),
      ]);
      const isStaff = (roles ?? []).some((r) => r.role === "admin" || r.role === "admin_oficina");
      if (!isStaff && p?.fecha_vencimiento) {
        const limite = new Date(`${p.fecha_vencimiento}T23:59:59`).getTime();
        if (Date.now() > limite) throw redirect({ to: "/suscripcion-expirada" });
      }
    } catch (e) {
      if (isRedirect(e)) throw e; // sin conexión: no bloqueamos
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <ErrorBoundary>
      <SubscriptionGuard>
      <Outlet />
      {/* El copiloto usa APIs de voz que no existen en todos los móviles: si falla, no tumba la app. */}
      <ErrorBoundary silent>
        <GlobalCopilot />
      </ErrorBoundary>
      </SubscriptionGuard>
    </ErrorBoundary>
  );
}
