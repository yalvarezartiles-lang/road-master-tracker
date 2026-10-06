import { createFileRoute, isRedirect, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { GlobalCopilot } from "@/components/autoescuela/global-copilot";
import { isAccountExpired } from "@/lib/autoescuela/subscription";
import { SubscriptionGuard } from "@/components/autoescuela/subscription-banner";
import { ErrorBoundary } from "@/components/error-boundary";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { next: undefined } });
    // Hard lock: cuenta caducada → /bloqueado (replace, sin poder volver atrás).
    let expired = false;
    try { expired = await isAccountExpired(data.user.id); } catch { /* sin conexión */ }
    if (expired) throw redirect({ to: "/bloqueado", replace: true });
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
