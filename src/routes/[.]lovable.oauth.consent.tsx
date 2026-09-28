import * as React from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Check, Loader2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    authorization_id: typeof search.authorization_id === "string" ? search.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Solicitud de autorización no válida");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = `${location.pathname}${location.searchStr}`;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ search }) => {
    const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(search.authorization_id);
    if (error) throw error;
    if (data && "redirect_url" in data) throw redirect({ href: data.redirect_url });
    return data;
  },
  head: () => ({
    meta: [
      { title: "Autorizar integración | AutoPilot Progress" },
      { name: "description", content: "Autoriza de forma segura una integración de agente." },
      { property: "og:title", content: "Autorizar integración | AutoPilot Progress" },
      { property: "og:description", content: "Acceso protegido para integraciones de agentes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConsentPage,
});

function ConsentPage() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = React.useState<"approve" | "deny" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const clientName = details && "client" in details ? details.client.name : "esta integración";

  const decide = async (approve: boolean) => {
    setBusy(approve ? "approve" : "deny");
    setError(null);
    const result = approve
      ? await supabase.auth.oauth.approveAuthorization(authorization_id, { skipBrowserRedirect: true })
      : await supabase.auth.oauth.denyAuthorization(authorization_id, { skipBrowserRedirect: true });
    if (result.error || !result.data?.redirect_url) {
      setError(result.error?.message ?? "No se pudo completar la autorización.");
      setBusy(null);
      return;
    }
    window.location.assign(result.data.redirect_url);
  };

  return (
    <main className="flex min-h-screen w-full max-w-full items-center justify-center overflow-x-hidden bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-lg">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><ShieldCheck className="size-7" /></span>
        <h1 className="mt-5 text-2xl font-extrabold">Autorizar integración</h1>
        <p className="mt-2 break-words text-muted-foreground"><strong className="text-foreground">{clientName}</strong> solicita consultar los alumnos y la agenda que tu cuenta ya puede ver.</p>
        <p className="mt-3 text-sm text-muted-foreground">No obtiene acceso a otras autoescuelas ni puede superar tus permisos.</p>
        {error && <p role="alert" className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button variant="outline" className="h-12" disabled={busy !== null} onClick={() => void decide(false)}>
            {busy === "deny" ? <Loader2 className="animate-spin" /> : <X />} Rechazar
          </Button>
          <Button className="h-12" disabled={busy !== null} onClick={() => void decide(true)}>
            {busy === "approve" ? <Loader2 className="animate-spin" /> : <Check />} Autorizar
          </Button>
        </div>
      </section>
    </main>
  );
}