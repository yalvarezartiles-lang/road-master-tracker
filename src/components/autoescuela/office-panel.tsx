import * as React from "react";
import { LogOut, Pencil, UserPlus } from "lucide-react";
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
}

export function OfficePanel({ userId }: { userId: string }) {
  const signOut = useSignOut();
  const { data } = useStore();
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
        supabase.from("profiles").select("id, full_name, apellidos").eq("autoescuela_id", me.autoescuela_id).order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      setSchool(a?.nombre_comercial ?? "");
      const profIds = new Set((roles ?? []).filter((r) => r.role === "profesor").map((r) => r.user_id));
      const list = (profs ?? []).filter((p) => profIds.has(p.id)) as Teacher[];
      setTeachers(list);
      setSelected((cur) => cur || list[0]?.id || "");
    })();
  }, [userId]);

  const current = teachers.find((t) => t.id === selected);
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
            <AgendaDiaria
              key={current.id}
              profesorId={current.id}
              title={`Agenda de ${current.full_name}`}
              officeMode
              studentsVersion={studentsVersion}
            />
          )}
        </section>

        <section className="rounded-3xl border bg-card p-4">
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
                  <p className="truncate font-semibold">{[s.name, s.apellidos].filter(Boolean).join(" ")}</p>
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
              </li>
            ))}
          </ul>
        </section>
      </main>
      <StudentDialog open={studentOpen} onOpenChange={setStudentOpen} student={editing} />
    </div>
  );
}
