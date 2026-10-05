import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Car, ChevronRight, KeyRound, MapPin, Moon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { PasswordCard } from "@/components/autoescuela/password-card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/_authenticated/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes" },
      { name: "description", content: "Apariencia, seguridad, zonas y vehículo del profesor." },
      { property: "og:title", content: "Ajustes" },
      { property: "og:description", content: "Configuración del profesor de autoescuela." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Ajustes,
});

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 px-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
      <div className="overflow-hidden rounded-2xl border bg-card">{children}</div>
    </section>
  );
}

function Ajustes() {
  const { user } = useCurrentUser();
  const [matricula, setMatricula] = React.useState("");
  React.useEffect(() => {
    if (!user) return;
    void supabase.from("profiles").select("matricula_vehiculo").eq("id", user.id).maybeSingle()
      .then(({ data }) => setMatricula(data?.matricula_vehiculo ?? ""));
  }, [user]);
  const saveMatricula = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ matricula_vehiculo: matricula.trim().toUpperCase() }).eq("id", user.id);
    if (error) toast.error("No se pudo guardar la matrícula"); else toast.success("Matrícula guardada");
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background/95 px-3 py-3 backdrop-blur">
        <Button asChild variant="ghost" size="icon" className="size-12 rounded-2xl" aria-label="Volver">
          <Link to="/panel"><ArrowLeft className="size-6" /></Link>
        </Button>
        <h1 className="text-xl font-bold">Ajustes</h1>
      </header>
      <main className="mx-auto max-w-lg px-4">
        <Group title="Apariencia">
          <div className="flex items-center justify-between gap-3 p-4">
            <span className="flex items-center gap-3 text-base font-medium"><Moon className="size-5 text-muted-foreground" /> Modo claro / oscuro</span>
            <ThemeToggle />
          </div>
        </Group>
        <Group title="Seguridad">
          <Accordion type="single" collapsible className="px-4">
            <AccordionItem value="pwd" className="border-none">
              <AccordionTrigger className="py-4 text-base font-medium">
                <span className="flex items-center gap-3"><KeyRound className="size-5 text-muted-foreground" /> Cambiar contraseña</span>
              </AccordionTrigger>
              <AccordionContent><PasswordCard /></AccordionContent>
            </AccordionItem>
          </Accordion>
        </Group>
        <Group title="Operativa">
          <Link to="/gestion" className="flex items-center justify-between gap-3 p-4 text-base font-medium hover:bg-muted">
            <span className="flex items-center gap-3"><MapPin className="size-5 text-muted-foreground" /> Zonas de prácticas</span>
            <ChevronRight className="size-5 text-muted-foreground" />
          </Link>
        </Group>
        <Group title="Vehículo">
          <div className="space-y-3 p-4">
            <label className="flex items-center gap-3 text-base font-medium"><Car className="size-5 text-muted-foreground" /> Matrícula por defecto</label>
            <div className="flex gap-2">
              <Input value={matricula} onChange={(e) => setMatricula(e.target.value)} placeholder="1234 ABC" className="h-12 rounded-xl text-base uppercase" />
              <Button onClick={saveMatricula} className="h-12 rounded-xl px-5">Guardar</Button>
            </div>
          </div>
        </Group>
      </main>
    </div>
  );
}
