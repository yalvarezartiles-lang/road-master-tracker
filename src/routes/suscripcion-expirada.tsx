import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/suscripcion-expirada")({
  head: () => ({
    meta: [
      { title: "Suscripción expirada" },
      { name: "description", content: "Tu acceso ha caducado. Contacta con la administración para renovarlo." },
      { property: "og:title", content: "Suscripción expirada" },
      { property: "og:description", content: "Contacta con la administración para renovar tu acceso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Expired,
});

function Expired() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-6 text-center">
      <Lock className="size-16 text-muted-foreground/40" strokeWidth={1.5} />
      <h1 className="text-2xl font-bold tracking-tight">Acceso Bloqueado</h1>
      <p className="max-w-sm text-base text-muted-foreground">Tu suscripción ha caducado. Contacta con la administración.</p>
      <Button variant="outline" className="h-12 rounded-2xl px-6" onClick={async () => { await supabase.auth.signOut(); void navigate({ to: "/auth", search: { next: undefined } }); }}>
        Cerrar sesión
      </Button>
    </div>
  );
}
