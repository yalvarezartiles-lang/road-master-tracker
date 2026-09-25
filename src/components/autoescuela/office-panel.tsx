import { Badge } from "@/components/ui/badge";
import * as React from "react";
import { Archive, LogOut, Pencil, Undo2, UserPlus } from "lucide-react";
import { toast } from "sonner";
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
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSignOut } from "@/lib/auth";
import { useStore } from "@/lib/autoescuela/store";
import type { Student } from "@/lib/autoescuela/types";
import { AgendaDiaria } from "./agenda-diaria";
import { StudentDialog } from "./student-dialog";

interface Teacher {
  id: string;
  full_name: string;
  apellidos: string;
  seccion: string;
}

interface Archived {
  id: string;
  name: string;
  apellidos: string;
  dni: string;
  fecha_archivado: string | null;
}

export function OfficePanel({ userId }: { userId: string }) {
  const signOut = useSignOut();
  const { data, deleteStudent: archiveStudent, refresh } = useStore();
  const [toArchive, setToArchive] = React.useState<Student | null>(null);
  const [school, setSchool] = React.useState("");
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [selected, setSelected] = React.useState("");
  const [studentOpen, setStudentOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Student | null>(null);

  React.useEffect(() => {
    void (async () => {
      const { data: me } = await supabase.from("profiles").select("autoescuela_id").eq("id", userId).maybeSingle();
      if (!me?.autoescuela_id) return;
      const [{ data: a }, { data: profs }, { data: roles }] = await Promise.all([
        supabase.from("autoescuelas").select("nombre_comercial").eq("id", me.autoescuela_id).maybeSingle(),
        supabase.from("profiles").select("id, full_name, apellidos, seccion").eq("autoescuela_id", me.autoescuela_id).order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      setSchool(a?.nombre_comercial ?? "");
      const profIds = new Set((roles ?? []).filter((r) => r.role === "profesor").map((r) => r.user_id));
      const list = (profs ?? []).filter((p) => profIds.has(p.id)) as Teacher[];
      setTeachers(list);
      setSelected((cur) => cur || list[0]?.id || "");
    })();
  }, [userId]);

  const [archived, setArchived] = React.useState<Archived[]>([]);
  const loadArchived = React.useCallback(async () => {
    const { data: me } = await supabase.from("profiles").select("autoescuela_id").eq("id", userId).maybeSingle();
    if (!me?.autoescuela_id) return setArchived([]);
    const { data: rows } = await supabase
      .from("students")
      .select("id, name, apellidos, dni, fecha_archivado")
      .eq("archivado", true)
      .eq("autoescuela_id", me.autoescuela_id)
      .order("fecha_archivado", { ascending: false });
    setArchived((rows ?? []) as Archived[]);
  }, [userId]);
  const activeCount = data.students.length;
  React.useEffect(() => {
    void loadArchived();
  }, [loadArchived, activeCount]);

  const restore = async (id: string) => {
    const { error } = await supabase.from("students").update({ archivado: false, fecha_archivado: null }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setArchived((l) => l.filter((x) => x.id !== id));
    await refresh();
    toast.success("Alumno recuperado");
  };

  const current = teachers.find((t) => t.id === selected);
  const [secDraft, setSecDraft] = React.useState<string | null>(null);
  React.useEffect(() => setSecDraft(null), [selected]);
  const saveSec = async () => {
    if (!current) return;
    const value = (secDraft ?? current.seccion).trim();
    if (!value) { toast.error("La sección es obligatoria"); return; }
    const { error } = await supabase.rpc("set_profesor_seccion", { _profesor: current.id, _seccion: value });
    if (error) { toast.error(error.message); return; }
    setTeachers((l) => l.map((t) => (t.id === current.id ? { ...t, seccion: value } : t)));
    toast.success("Sección guardada");
  };
  const students = data.students;
  const studentsVersion = students.map((s) => `${s.id}${s.name}${s.apellidos}`).join("|").length + students.length;

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl leading-tight font-bold">Panel de Gestión</h1>
            {school && <p className="truncate text-sm text-muted-foreground">{school}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="size-12 rounded-2xl" aria-label="Cerrar sesión" onClick={() => void signOut()}>
              <LogOut className="size-6" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-5">
        <section className="space-y-3">
          <label className="block text-sm font-bold tracking-wide text-muted-foreground uppercase" htmlFor="prof">
            Profesor
          </label>
          <select
            id="prof"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="h-14 w-full rounded-2xl border bg-background px-4 text-lg font-semibold"
          >
            {teachers.length === 0 && <option value="">No hay profesores todavía</option>}
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{[t.full_name, t.apellidos].filter(Boolean).join(" ")}</option>
            ))}
          </select>
          {current && (
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <label htmlFor="prof-sec" className="mb-1 block text-sm font-semibold text-muted-foreground">Sección del profesor</label>
                <input
                  id="prof-sec"
                  key={current.id}
                  defaultValue={current.seccion}
                  list="secciones-prof"
                  maxLength={40}
                  placeholder="Sección 1"
                  onChange={(e) => setSecDraft(e.target.value)}
                  className="h-12 w-full rounded-2xl border bg-background px-4 text-base"
                />
                <datalist id="secciones-prof"><option value="Sección 0" /><option value="Sección 1" /><option value="Sección 2" /></datalist>
              </div>
              <Button className="h-12 rounded-2xl px-5 font-bold" onClick={() => void saveSec()}>Guardar</Button>
            </div>
          )}
          {current && (
            <AgendaDiaria
              key={current.id}
              profesorId={current.id}
              title={`Agenda de ${current.full_name}`}
              officeMode
              studentsVersion={studentsVersion}
            />
          )}
        </section>

        <section className="rounded-3xl border bg-card shadow-sm hover:shadow-md transition-shadow p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Alumnos ({students.length})</h2>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setStudentOpen(true);
            }}
            className="mt-3 h-14 w-full rounded-2xl text-base font-bold"
          >
            <UserPlus className="size-6" /> Matricular Nuevo Alumno
          </Button>
          <ul className="mt-3 divide-y">
            {students.length === 0 && <li className="py-4 text-center text-muted-foreground">Aún no hay alumnos.</li>}
            {students.map((s) => (
              <li key={s.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold"><span className="truncate">{[s.name, s.apellidos].filter(Boolean).join(" ")}</span><Badge variant="outline" className="shrink-0 text-xs">{s.seccion || "Sin sección"}</Badge></p>
                  <p className="truncate text-sm text-muted-foreground">DNI: {s.dni || "—"}{s.phone ? ` · ${s.phone}` : ""}</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-12 rounded-xl"
                  aria-label={`Editar ${s.name}`}
                  onClick={() => {
                    setEditing(s);
                    setStudentOpen(true);
                  }}
                >
                  <Pencil className="size-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-12 rounded-xl"
                  aria-label={`Archivar ${s.name}`}
                  onClick={() => setToArchive(s)}
                >
                  <Archive className="size-5" />
                </Button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border bg-card shadow-sm hover:shadow-md transition-shadow p-4">
          <h2 className="text-lg font-bold">Alumnos archivados ({archived.length})</h2>
          <ul className="mt-3 divide-y">
            {archived.length === 0 && <li className="py-4 text-center text-muted-foreground">No hay alumnos archivados.</li>}
            {archived.map((a) => (
              <li key={a.id} className="flex items-center gap-2 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{[a.name, a.apellidos].filter(Boolean).join(" ")}</p>
                  <p className="text-sm font-semibold">
                    <span className="rounded-full bg-warning/20 px-2 py-0.5">
                      {a.fecha_archivado
                        ? `Archivado el ${new Date(a.fecha_archivado).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}`
                        : "Archivado (fecha desconocida)"}
                    </span>
                  </p>
                  <p className="truncate text-sm text-muted-foreground">DNI: {a.dni || "—"}</p>
                </div>
                <Button variant="outline" className="h-12 rounded-xl" onClick={() => void restore(a.id)}>
                  <Undo2 className="size-5" /> Recuperar
                </Button>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <AlertDialog open={!!toArchive} onOpenChange={(o) => !o && setToArchive(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Archivar este alumno?</AlertDialogTitle>
            <AlertDialogDescription>
              {toArchive?.name} desaparecerá de las listas y agendas, pero sus datos se conservan por normativa legal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-14 rounded-2xl text-base">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="h-14 rounded-2xl text-base"
              onClick={async (e) => {
                e.preventDefault();
                if (!toArchive) return;
                try {
                  await archiveStudent(toArchive.id);
                  toast.success("Alumno archivado");
                  setToArchive(null);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "No se pudo archivar");
                }
              }}
            >
              Archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <StudentDialog open={studentOpen} onOpenChange={setStudentOpen} student={editing} />
    </div>
  );
}
