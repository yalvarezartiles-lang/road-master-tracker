import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Car, MapPin, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useStore } from "@/lib/autoescuela/store";
import type { NamedItem } from "@/lib/autoescuela/types";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/_authenticated/gestion")({
  head: () => ({
    meta: [
      { title: "Mis zonas — Autoescuela Adassa" },
      { name: "description", content: "Crea y elimina tus zonas y habilidades privadas." },
      { property: "og:title", content: "Mis zonas — Autoescuela Adassa" },
      { property: "og:description", content: "Gestión privada de zonas y habilidades del profesor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GestionPage,
});

function Section({
  title,
  icon,
  items,
  placeholder,
  kind,
  onAdd,
  onDelete,
}: {
  title: string;
  icon: React.ReactNode;
  items: NamedItem[];
  placeholder: string;
  kind: string;
  onAdd: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [value, setValue] = React.useState("");
  const [toDelete, setToDelete] = React.useState<NamedItem | null>(null);

  const add = async () => {
    const v = value.trim();
    if (!v) return;
    try {
      await onAdd(v);
      setValue("");
      toast.success(`${kind} añadida`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  };

  return (
    <section className="rounded-3xl border bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
        {icon} {title}
      </h2>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void add()}
          placeholder={placeholder}
          className="h-14 rounded-2xl text-base"
        />
        <Button onClick={() => void add()} className="h-14 rounded-2xl px-4 text-base font-bold">
          <Plus className="size-5" /> Añadir nueva
        </Button>
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((it) => (
          <li
            key={it.id}
            className="flex items-center justify-between rounded-2xl border px-4 py-2 text-base font-semibold"
          >
            {it.name}
            <Button
              variant="ghost"
              size="icon"
              className="size-12 rounded-2xl text-destructive"
              aria-label={`Eliminar ${it.name}`}
              onClick={() => setToDelete(it)}
            >
              <Trash2 className="size-5" />
            </Button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">
            Todavía no has creado ninguna.
          </li>
        )}
      </ul>
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar "{toDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrará permanentemente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12 rounded-2xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="h-12 rounded-2xl bg-destructive text-destructive-foreground"
              onClick={() => {
                if (!toDelete) return;
                onDelete(toDelete.id)
                  .then(() => toast.success(`${kind} eliminada`))
                  .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Error"));
                setToDelete(null);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function VehicleSection() {
  const [value, setValue] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: p } = await supabase.from("profiles").select("matricula_vehiculo").eq("id", u.user.id).maybeSingle();
      setValue(p?.matricula_vehiculo ?? "");
    })();
  }, []);
  const save = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("profiles")
      .update({ matricula_vehiculo: value.trim().toUpperCase() })
      .eq("id", u.user?.id ?? "");
    setSaving(false);
    if (error) toast.error("No se pudo guardar la matrícula");
    else toast.success("Matrícula guardada");
  };
  return (
    <section className="rounded-3xl border bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
        <Car className="size-5" /> Matrícula de mi coche
      </h2>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          placeholder="0000 ABC"
          className="h-14 rounded-2xl text-lg font-bold tracking-wider"
        />
        <Button disabled={saving} onClick={() => void save()} className="h-14 rounded-2xl px-5 text-base font-bold">
          Guardar
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Se añade sola a cada clase y a las fichas PDF.</p>
    </section>
  );
}

function GestionPage() {
  const { data, addZone, deleteZone } = useStore();
  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link
            to="/panel"
            className="flex size-12 items-center justify-center rounded-2xl border"
            aria-label="Volver"
          >
            <ArrowLeft className="size-6" />
          </Link>
          <h1 className="text-lg font-extrabold">Ajustes</h1>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-5">
        <VehicleSection />
        <Section
          title="Zonas"
          icon={<MapPin className="size-5" />}
          items={data.zones}
          placeholder="Nombre de la zona"
          kind="Zona"
          onAdd={addZone}
          onDelete={deleteZone}
        />
      </main>
    </div>
  );
}
