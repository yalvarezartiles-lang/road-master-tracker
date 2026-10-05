import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Archive, ArchiveRestore, Search, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/autoescuela/store";
import { normalize } from "@/lib/autoescuela/normalize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/autoescuela/empty-state";
import { StudentDialog } from "@/components/autoescuela/student-dialog";

type Archived = { id: string; name: string; apellidos: string; fecha_archivado: string | null };

export function StudentManager({ onNavigate }: { onNavigate?: () => void }) {
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

  const [q, setQ] = React.useState("");
  const words = normalize(q).split(/\s+/).filter(Boolean);
  const match = (t: string) => words.every((w) => normalize(t).includes(w));
  const active = data.students.filter((s) => match(`${s.name} ${s.apellidos} ${s.dni}`));
  const arch = archived.filter((s) => match(`${s.name} ${s.apellidos}`));
  const row = "flex items-center gap-3 rounded-2xl border bg-card p-3 pl-4 shadow-sm";
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar alumno…" className="h-14 rounded-2xl pl-12 text-base" />
        </div>
        <Button size="icon" className="size-14 shrink-0 rounded-2xl" aria-label="Añadir alumno" onClick={() => setAddOpen(true)}>
          <UserPlus className="size-6" />
        </Button>
      </div>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        <Tabs defaultValue="activos">
          <TabsList className="grid h-12 w-full grid-cols-2 rounded-2xl">
            <TabsTrigger value="activos" className="rounded-xl text-base">Activos ({active.length})</TabsTrigger>
            <TabsTrigger value="archivados" className="rounded-xl text-base">Archivados ({arch.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="activos" className="mt-4 space-y-2">
            {active.length === 0 ? (
              <EmptyState icon={Users} text="No hay alumnos activos"
                action={<Button onClick={() => setAddOpen(true)} className="h-12 rounded-2xl">+ Añadir alumno</Button>} />
            ) : active.map((s) => (
              <div key={s.id} className={row}>
                <Link to="/alumno/$studentId" params={{ studentId: s.id }} onClick={onNavigate} className="min-w-0 flex-1 truncate text-base font-semibold transition-all duration-200 active:scale-95">
                  {s.name} {s.apellidos}
                </Link>
                <Button variant="outline" onClick={() => void archive(s.id)} className="h-11 rounded-xl">
                  <Archive className="size-4" /> Archivar
                </Button>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="archivados" className="mt-4 space-y-2">
            {arch.length === 0 ? (
              <EmptyState icon={Archive} text="No hay alumnos archivados" />
            ) : arch.map((s) => (
              <div key={s.id} className={row}>
                <span className="min-w-0 flex-1 truncate text-base font-semibold text-muted-foreground">{s.name} {s.apellidos}</span>
                <Button variant="outline" onClick={() => void restore(s.id)} className="h-11 rounded-xl">
                  <ArchiveRestore className="size-4" /> Recuperar
                </Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
      <StudentDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
