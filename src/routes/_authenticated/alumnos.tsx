import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Archive, ArchiveRestore, ArrowLeft, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/autoescuela/store";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/autoescuela/empty-state";
import { StudentDialog } from "@/components/autoescuela/student-dialog";

export const Route = createFileRoute("/_authenticated/alumnos")({
  head: () => ({
    meta: [
      { title: "Gestión de alumnos" },
      { name: "description", content: "Alumnos activos y archivados de la autoescuela." },
      { property: "og:title", content: "Gestión de alumnos" },
      { property: "og:description", content: "Archiva y recupera alumnos en un toque." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AlumnosPage,
});

type Archived = { id: string; name: string; apellidos: string; fecha_archivado: string | null };

function AlumnosPage() {
  const { data, deleteStudent, refresh } = useStore();
  const [archived, setArchived] = React.useState<Archived[]>([]);
  const [addOpen, setAddOpen] = React.useState(false);

  const loadArchived = React.useCallback(async () => {
    const { data: a } = await supabase.from("students").select("id, name, apellidos, fecha_archivado")
      .eq("archivado", true).order("fecha_archivado", { ascending: false });
    setArchived(a ?? []);
  }, []);
  React.useEffect(() => { void loadArchived(); }, [loadArchived]);

  const archive = async (id: string) => {
    try { await deleteStudent(id); toast.success("Alumno archivado"); void loadArchived(); }
    catch { toast.error("No se pudo archivar"); }
  };
  const restore = async (id: string) => {
    setArchived((l) => l.filter((x) => x.id !== id));
    const { error } = await supabase.from("students").update({ archivado: false, fecha_archivado: null }).eq("id", id);
    if (error) { toast.error("No se pudo recuperar"); void loadArchived(); return; }
    toast.success("Alumno recuperado");
    await refresh();
  };

  const row = "flex items-center gap-3 rounded-2xl border bg-card p-3 pl-4 shadow-sm";
  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background/80 px-3 py-3 backdrop-blur-md">
        <Button asChild variant="ghost" size="icon" className="size-12 rounded-2xl" aria-label="Volver">
          <Link to="/panel"><ArrowLeft className="size-6" /></Link>
        </Button>
        <h1 className="flex-1 text-xl font-bold tracking-tight">Gestión de alumnos</h1>
        <Button variant="ghost" size="icon" className="size-12 rounded-2xl" aria-label="Añadir alumno" onClick={() => setAddOpen(true)}>
          <UserPlus className="size-6" />
        </Button>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-4">
        <Tabs defaultValue="activos">
          <TabsList className="grid h-12 w-full grid-cols-2 rounded-2xl">
            <TabsTrigger value="activos" className="rounded-xl text-base">Activos ({data.students.length})</TabsTrigger>
            <TabsTrigger value="archivados" className="rounded-xl text-base">Archivados ({archived.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="activos" className="mt-4 space-y-2">
            {data.students.length === 0 ? (
              <EmptyState icon={Users} text="No hay alumnos activos"
                action={<Button onClick={() => setAddOpen(true)} className="h-12 rounded-2xl">+ Añadir alumno</Button>} />
            ) : data.students.map((s) => (
              <div key={s.id} className={row}>
                <Link to="/alumno/$studentId" params={{ studentId: s.id }} className="min-w-0 flex-1 truncate text-base font-semibold transition-all duration-200 active:scale-95">
                  {s.name} {s.apellidos}
                </Link>
                <Button variant="outline" onClick={() => void archive(s.id)} className="h-11 rounded-xl">
                  <Archive className="size-4" /> Archivar
                </Button>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="archivados" className="mt-4 space-y-2">
            {archived.length === 0 ? (
              <EmptyState icon={Archive} text="No hay alumnos archivados" />
            ) : archived.map((s) => (
              <div key={s.id} className={row}>
                <span className="min-w-0 flex-1 truncate text-base font-semibold text-muted-foreground">{s.name} {s.apellidos}</span>
                <Button variant="outline" onClick={() => void restore(s.id)} className="h-11 rounded-xl">
                  <ArchiveRestore className="size-4" /> Recuperar
                </Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </main>
      <StudentDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
