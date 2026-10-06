import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/bloqueado")({
  head: () => ({
    meta: [
      { title: "Acceso bloqueado" },
      { name: "description", content: "Tu suscripción ha caducado. Contacta con la administración." },
      { property: "og:title", content: "Acceso bloqueado" },
      { property: "og:description", content: "Suscripción caducada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExpiredSubscription,
});

function ExpiredSubscription() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <Lock className="size-28 text-destructive" strokeWidth={1.5} />
      <h1 className="text-3xl font-extrabold tracking-tight">ACCESO BLOQUEADO</h1>
      <p className="max-w-sm text-lg text-muted-foreground">Tu suscripción ha caducado</p>
      <Button variant="outline" className="h-12 rounded-2xl px-6" onClick={async () => {
        await supabase.auth.signOut();
        void navigate({ to: "/auth", search: { next: undefined }, replace: true });
      }}>
        Cerrar sesión
      </Button>
    </div>
  );
}
