import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronRight,
  LogOut,
  Plus,
  Search,
  Settings,
  Shield,
  Archive,
  UserPlus, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { LessonDialog } from "@/components/autoescuela/lesson-dialog";
import { StudentDialog } from "@/components/autoescuela/student-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { levelClasses } from "@/components/autoescuela/skill-traffic-light";
import { useCurrentUser, useSignOut } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { OfficePanel } from "@/components/autoescuela/office-panel";
import { AgendaDiaria } from "@/components/autoescuela/agenda-diaria";
import { PasswordCard } from "@/components/autoescuela/password-card";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({
    meta: [
      { title: "Panel de alumnos" },
      {
        name: "description",
        content:
          "Registra y evalúa en tiempo real las clases prácticas de tus alumnos desde el móvil.",
      },
      { property: "og:title", content: "Panel de alumnos" },
      {
        property: "og:description",
        content: "Alumnos, zonas, habilidades y clases prácticas.",
      },
    ],
  }),
  component: Dashboard,
});

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function Dashboard() {
  const { isOffice, user, loading } = useCurrentUser();
  if (loading) return <div className="min-h-screen bg-background" />;
  if (isOffice && user) return <OfficePanel userId={user.id} />;
  return <TeacherDashboard />;
}

function TeacherDashboard() {
  const { data, loading, deleteStudent } = useStore();
  const { isAdmin, user } = useCurrentUser();
  const [teacherName, setTeacherName] = React.useState("");
  const [schoolName, setSchoolName] = React.useState("");
  const [seccion, setSeccion] = React.useState("");
  React.useEffect(() => {
    if (!user) return;
    void supabase
      .from("profiles")
      .select("full_name, autoescuela_id, seccion")
      .eq("id", user.id)
      .maybeSingle()
      .then(async ({ data: p }) => {
        setTeacherName((p?.full_name ?? "").split(" ")[0] ?? "");
        setSeccion(p?.seccion ?? "");
        if (!p?.autoescuela_id) return;
        const { data: a } = await supabase
          .from("autoescuelas")
          .select("nombre_comercial")
          .eq("id", p.autoescuela_id)
          .maybeSingle();
        setSchoolName(a?.nombre_comercial ?? "");
      });
  }, [user]);
  const signOut = useSignOut();
  const [query, setQuery] = React.useState("");
  const [lessonOpen, setLessonOpen] = React.useState(false);
  const [studentOpen, setStudentOpen] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const fullName = (s: { name: string; apellidos: string }) =>
    [s.name, s.apellidos].filter(Boolean).join(" ");
  const students = data.students.filter((s) =>
    fullName(s).toLowerCase().includes(query.trim().toLowerCase()),
  );

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteStudent(toDelete.id);
      toast.success("Alumno archivado");
      setToDelete(null);
    } catch {
      toast.error("No se pudo archivar el alumno");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-card/80 backdrop-blur-md px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl leading-tight font-bold tracking-tight">
              {teacherName ? `Hola, ${teacherName}` : "Panel"}
            </h1>
            {schoolName && (
              <p className="flex items-center gap-1.5 truncate text-sm font-medium text-muted-foreground">
                <Building2 className="size-4 shrink-0" /> {schoolName}{seccion ? ` - ${seccion}` : ""}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isAdmin && (
              <Button asChild variant="ghost" size="icon" className="size-12 rounded-2xl">
                <Link to="/admin" aria-label="Administración">
                  <Shield className="size-6" />
                </Link>
              </Button>
            )}
            <Button asChild variant="ghost" size="icon" className="size-12 rounded-2xl">
              <Link to="/gestion" aria-label="Mis zonas y habilidades">
                <Settings className="size-6" />
              </Link>
            </Button>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="size-12 rounded-2xl"
              aria-label="Cerrar sesión"
              onClick={() => void signOut()}
            >
              <LogOut className="size-6" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        <div className="relative">
          <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar alumno…"
            className="h-14 rounded-2xl pl-12 text-base"
          />
        </div>

        <Button
          variant="secondary"
          onClick={() => setStudentOpen(true)}
          className="mt-3 h-14 w-full rounded-2xl text-base font-semibold"
        >
          <UserPlus className="size-5" /> Añadir alumno
        </Button>

        {user && (
          <div className="mt-4">
            <AgendaDiaria profesorId={user.id} title="Mi agenda" />
          </div>
        )}

        <h2 className="mt-6 mb-3 text-base font-bold tracking-wide text-muted-foreground uppercase">
          Alumnos activos ({students.length})
        </h2>

        <ul className="space-y-3">
          {students.map((s) => (
            <li key={s.id} className="flex items-center gap-2">
              <Link
                to="/alumno/$studentId"
                params={{ studentId: s.id }}
                className="flex flex-1 items-center gap-4 rounded-3xl border bg-card shadow-sm hover:shadow-md transition-shadow p-4 transition active:scale-[0.99]"
              >
                <span
                  className="flex size-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white"
                  style={{ backgroundColor: s.avatarColor }}
                >
                  {initials(s.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold">{fullName(s)}</p>
                  <p className="text-sm text-muted-foreground">
                    {s.lessons.length} clases ·{" "}
                    {s.lessons[s.lessons.length - 1]?.zone ?? "Sin clases"}
                  </p>
                  <div className="mt-2 flex gap-1">
                    {data.skills.map((sk) => (
                      <span
                        key={sk.id}
                        title={sk.name}
                        className={`h-2.5 flex-1 rounded-full ${levelClasses[s.skills[sk.id] ?? "rojo"]}`}
                      />
                    ))}
                  </div>
                </div>
                <ChevronRight className="size-6 shrink-0 text-muted-foreground" />
              </Link>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Archivar ${s.name}`}
                onClick={() => setToDelete({ id: s.id, name: s.name })}
                className="size-14 shrink-0 rounded-2xl text-destructive hover:bg-destructive/10"
              >
                <Archive className="size-6" />
              </Button>
            </li>
          ))}
          {students.length === 0 && (
            <li className="rounded-3xl border border-dashed p-8 text-center text-muted-foreground">
              {loading ? "Cargando alumnos…" : "No hay alumnos con ese nombre."}
            </li>
          )}
        </ul>
        <PasswordCard />
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 p-4">
        <div className="mx-auto max-w-2xl">
          <Button
            onClick={() => setLessonOpen(true)}
            className="h-18 w-full rounded-3xl text-xl font-extrabold shadow-lg"
          >
            <Plus className="size-7" /> Nueva clase
          </Button>
        </div>
      </div>

      <LessonDialog open={lessonOpen} onOpenChange={setLessonOpen} />
      <StudentDialog open={studentOpen} onOpenChange={setStudentOpen} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Archivar este alumno?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.name} desaparecerá de las listas, pero sus datos y clases se conservan por normativa legal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-14 rounded-2xl text-base">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              className="h-14 rounded-2xl bg-destructive text-base text-white hover:bg-destructive/90"
            >
              Archivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
