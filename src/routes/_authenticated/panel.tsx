import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Car,
  ChevronRight,
  LogOut,
  Plus,
  Search,
  Shield,
  Trash2,
  UserPlus,
} from "lucide-react";
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
import { SKILLS } from "@/lib/autoescuela/types";
import { LessonDialog } from "@/components/autoescuela/lesson-dialog";
import { StudentDialog } from "@/components/autoescuela/student-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { levelClasses } from "@/components/autoescuela/skill-traffic-light";
import { useCurrentUser, useSignOut } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({
    meta: [
      { title: "Panel de alumnos — Autoescuela Adassa" },
      {
        name: "description",
        content:
          "Registra y evalúa en tiempo real las clases prácticas de tus alumnos desde el móvil.",
      },
      { property: "og:title", content: "Panel de alumnos — Autoescuela Adassa" },
      {
        property: "og:description",
        content: "Alumnos, zonas, habilidades y clases de la Autoescuela Adassa.",
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
  const { data, loading, deleteStudent } = useStore();
  const { isAdmin } = useCurrentUser();
  const signOut = useSignOut();
  const [query, setQuery] = React.useState("");
  const [lessonOpen, setLessonOpen] = React.useState(false);
  const [studentOpen, setStudentOpen] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const students = data.students.filter((s) =>
    s.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteStudent(toDelete.id);
      toast.success("Alumno eliminado");
      setToDelete(null);
    } catch {
      toast.error("No se pudo eliminar el alumno");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Car className="size-7" />
            </span>
            <div>
              <h1 className="text-xl leading-tight font-extrabold">Autoescuela Adassa</h1>
              <p className="text-sm text-muted-foreground">Panel del profesor</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <Button asChild variant="ghost" size="icon" className="size-12 rounded-2xl">
                <Link to="/admin" aria-label="Administración">
                  <Shield className="size-6" />
                </Link>
              </Button>
            )}
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

        <h2 className="mt-6 mb-3 text-base font-bold tracking-wide text-muted-foreground uppercase">
          Alumnos activos ({students.length})
        </h2>

        <ul className="space-y-3">
          {students.map((s) => (
            <li key={s.id} className="flex items-center gap-2">
              <Link
                to="/alumno/$studentId"
                params={{ studentId: s.id }}
                className="flex flex-1 items-center gap-4 rounded-3xl border bg-card p-4 transition active:scale-[0.99]"
              >
                <span
                  className="flex size-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white"
                  style={{ backgroundColor: s.avatarColor }}
                >
                  {initials(s.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold">{s.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {s.lessons.length} clases ·{" "}
                    {s.lessons[s.lessons.length - 1]?.zone ?? "Sin clases"}
                  </p>
                  <div className="mt-2 flex gap-1">
                    {SKILLS.map((sk) => (
                      <span
                        key={sk.key}
                        title={sk.label}
                        className={`h-2.5 flex-1 rounded-full ${levelClasses[s.skills[sk.key]]}`}
                      />
                    ))}
                  </div>
                </div>
                <ChevronRight className="size-6 shrink-0 text-muted-foreground" />
              </Link>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Eliminar ${s.name}`}
                onClick={() => setToDelete({ id: s.id, name: s.name })}
                className="size-14 shrink-0 rounded-2xl text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-6" />
              </Button>
            </li>
          ))}
          {students.length === 0 && (
            <li className="rounded-3xl border border-dashed p-8 text-center text-muted-foreground">
              {loading ? "Cargando alumnos…" : "No hay alumnos con ese nombre."}
            </li>
          )}
        </ul>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 p-4 backdrop-blur">
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
              ¿Estás seguro de que deseas eliminar este alumno?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se borrarán también todas las clases de {toDelete?.name}. Esta acción no se
              puede deshacer.
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
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
