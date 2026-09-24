import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, MapPin, Phone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/autoescuela/store";
import { SkillSemaphore, SkillProgressBanner } from "@/components/autoescuela/skill-semaphore";
import { LessonDialog } from "@/components/autoescuela/lesson-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/alumno/$studentId")({
  head: () => ({
    meta: [
      { title: "Ficha del alumno — Autoescuela Tracker" },
      {
        name: "description",
        content:
          "Historial de clases, zonas recorridas y evaluación de habilidades del alumno.",
      },
      { property: "og:title", content: "Ficha del alumno — Autoescuela Tracker" },
      {
        property: "og:description",
        content: "Progreso, zonas y habilidades del alumno de autoescuela.",
      },
    ],
  }),
  component: StudentPage,
});

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function StudentPage() {
  const { studentId } = Route.useParams();
  const { data } = useStore();
  const [lessonOpen, setLessonOpen] = React.useState(false);
  const student = data.students.find((s) => s.id === studentId);

  if (!student) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-semibold">Alumno no encontrado</p>
        <Link to="/panel" className="text-primary underline">
          Volver al panel
        </Link>
      </div>
    );
  }

  const visited = new Set(student.lessons.map((l) => l.zone));
  const lessons = [...student.lessons].sort((a, b) => a.number - b.number);

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link
            to="/panel"
            className="flex size-12 items-center justify-center rounded-2xl border"
            aria-label="Volver"
          >
            <ArrowLeft className="size-6" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-4 py-5">
        <SkillProgressBanner student={student} />
        <section className="rounded-3xl border bg-card p-5">
          <h1 className="text-2xl font-extrabold">{student.name}</h1>
          <div className="mt-3 grid gap-2 text-base text-muted-foreground">
            <p className="flex items-center gap-2">
              <Phone className="size-5" /> {student.phone || "Sin teléfono"}
            </p>
            <p className="flex items-center gap-2">
              <CalendarDays className="size-5" /> Inicio:{" "}
              {new Date(student.startDate).toLocaleDateString("es-ES")}
            </p>
          </div>
          <p className="mt-4 inline-flex rounded-2xl bg-primary px-4 py-2 text-lg font-bold text-primary-foreground">
            {student.lessons.length} clases
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">Semáforo de habilidades</h2>
          <SkillSemaphore student={student} modoLectura />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">Zonas</h2>
          <div className="grid grid-cols-2 gap-2">
            {data.zones.map(({ name: z }) => {
              const count = student.lessons.filter((l) => l.zone === z).length;
              return (
                <div
                  key={z}
                  className={cn(
                    "rounded-2xl border-2 p-4",
                    visited.has(z)
                      ? "border-success bg-success/10"
                      : "border-dashed border-border bg-muted/40",
                  )}
                >
                  <p className="flex items-center gap-2 text-base font-semibold">
                    <MapPin className="size-5" /> {z}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {count > 0 ? `Frecuentada · ${count} clases` : "Pendiente"}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">Historial de clases</h2>
          <ol className="space-y-3">
            {lessons.map((l) => (
              <li key={l.id} className="rounded-3xl border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-lg font-bold">Clase {l.number}</p>
                  <p className="text-sm text-muted-foreground">{fmt(l.date)}</p>
                </div>
                <p className="mt-1 flex items-center gap-2 text-base">
                  <MapPin className="size-5 text-primary" /> {l.zone}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {l.topics.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-muted px-3 py-1 text-sm font-medium"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                {l.notes && <p className="mt-3 text-base">{l.notes}</p>}
                {l.whiteboard && (
                  <a href={l.whiteboard} target="_blank" rel="noreferrer" className="mt-3 block">
                    <img
                      src={l.whiteboard}
                      alt={`Pizarra de la clase ${l.number}`}
                      loading="lazy"
                      className="w-full rounded-2xl border bg-white"
                    />
                  </a>
                )}
              </li>
            ))}
            {lessons.length === 0 && (
              <li className="rounded-3xl border border-dashed p-8 text-center text-muted-foreground">
                Todavía no hay clases registradas.
              </li>
            )}
          </ol>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <Button
            onClick={() => setLessonOpen(true)}
            className="h-18 w-full rounded-3xl text-xl font-extrabold shadow-lg"
          >
            <Plus className="size-7" /> Registrar clase
          </Button>
        </div>
      </div>

      <LessonDialog
        open={lessonOpen}
        onOpenChange={setLessonOpen}
        studentId={student.id}
      />
    </div>
  );
}
