import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Plus,
  Search,
  Settings,
  Shield,
  Archive,
  UserPlus, Building2, Users } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { NetworkIndicator } from "@/components/autoescuela/network-indicator";
import { SchoolLogo, useSchool } from "@/lib/autoescuela/school-branding";
import { levelClasses } from "@/components/autoescuela/skill-traffic-light";
import { useCurrentUser, useSignOut } from "@/lib/auth";
import { normalize } from "@/lib/autoescuela/normalize";
import { supabase } from "@/integrations/supabase/client";
import { OfficePanel } from "@/components/autoescuela/office-panel";
import { AgendaDiaria } from "@/components/autoescuela/agenda-diaria";
import { PasswordCard } from "@/components/autoescuela/password-card";
import { ReglamentoUpload } from "@/components/autoescuela/reglamento-upload";
import { ScanRosterButton } from "@/components/autoescuela/scan-roster-button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
  const brand = useSchool();
  const [agendaVersion, setAgendaVersion] = React.useState(0);
  const [agendaFecha, setAgendaFecha] = React.useState<string | null>(null);
  const [agendaDay, setAgendaDay] = React.useState(() => new Date());
  const [headerCompact, setHeaderCompact] = React.useState(false);
  const lastScrollTop = React.useRef(0);
  React.useEffect(() => {
    if (!user) return;
    void supabase
      .from("profiles")
      .select("full_name, autoescuela_id")
      .eq("id", user.id)
      .maybeSingle()
      .then(async ({ data: p }) => {
        setTeacherName((p?.full_name ?? "").split(" ")[0] ?? "");
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

  const handleMobileScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (window.matchMedia("(min-width: 768px)").matches) return;
    const nextScrollTop = event.currentTarget.scrollTop;
    const delta = nextScrollTop - lastScrollTop.current;
    if (nextScrollTop < 24) setHeaderCompact(false);
    else if (delta > 6) setHeaderCompact(true);
    else if (delta < -6) setHeaderCompact(false);
    lastScrollTop.current = nextScrollTop;
  };

  const shiftAgendaDay = (amount: number) => {
    setAgendaDay((current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() + amount));
  };

  const agendaDayLabel = (() => {
    const today = new Date();
    const isToday = agendaDay.getFullYear() === today.getFullYear()
      && agendaDay.getMonth() === today.getMonth()
      && agendaDay.getDate() === today.getDate();
    const formatted = agendaDay.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
    return isToday ? `Hoy, ${formatted}` : agendaDay.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "long" }).replace(".", "");
  })();

  const fullName = (s: { name: string; apellidos: string }) =>
    [s.name, s.apellidos].filter(Boolean).join(" ");
  const students = data.students.filter((s) =>
    normalize(fullName(s)).includes(normalize(query)),
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
    <div onScroll={handleMobileScroll} className="min-h-screen w-full max-w-full overflow-x-hidden bg-background pb-32 max-md:h-dvh max-md:overflow-y-auto max-md:pb-56">
      <header className={`sticky top-0 z-50 border-b border-border/60 bg-card/90 px-4 py-4 backdrop-blur-md transition-[padding] duration-200 ${headerCompact ? "max-md:py-1.5" : "max-md:py-2.5"}`}>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 md:contents">
          <div className="flex min-w-0 items-center gap-3">
            <SchoolLogo className={`max-w-44 sm:h-14 md:h-16 md:max-w-64 lg:h-20 lg:max-w-80 xl:h-24 ${headerCompact ? "h-9" : "h-12"}`} />
            <div className="min-w-0">
            <h1 className={`truncate font-bold leading-tight tracking-tight transition-[font-size] duration-200 md:text-2xl ${headerCompact ? "text-base" : "text-lg"}`}>
              {teacherName ? `Hola, ${teacherName}` : "Panel"}
            </h1>
            {!brand.schoolLogo && (brand.schoolName || schoolName) && (
              <p className={`items-center gap-1.5 truncate text-sm font-medium text-primary md:flex ${headerCompact ? "hidden" : "flex"}`}>
                <Building2 className="size-4 shrink-0" /> {brand.schoolName || schoolName}
              </p>
            )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 md:gap-1">
            {isAdmin && (
              <Button asChild variant="ghost" size="icon" className="size-9 rounded-xl md:size-12 md:rounded-2xl">
                <Link to="/admin" aria-label="Administración">
                  <Shield className="size-5 md:size-6" />
                </Link>
              </Button>
            )}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="size-9 rounded-xl md:size-12 md:rounded-2xl" aria-label="Ajustes de perfil">
                  <Settings className="size-5 md:size-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full max-w-sm overflow-y-auto p-5">
                <SheetHeader className="p-0 text-left">
                  <SheetTitle className="text-xl font-bold">Ajustes de Perfil</SheetTitle>
                  <SheetDescription>Tus zonas, datos y seguridad</SheetDescription>
                </SheetHeader>
                <Button asChild className="mt-6 h-16 w-full rounded-2xl text-base font-bold">
                  <Link to="/gestion" aria-label="Mis zonas y habilidades">
                    <Settings className="size-5" /> Gestionar mis zonas y habilidades
                  </Link>
                </Button>
                <div className="mt-4 rounded-3xl border bg-card p-5">
                  <div className="flex items-center gap-4">
                    <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground">
                      {initials(teacherName || "P")}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold">{teacherName || "Profesor"}</p>
                      {user?.email && (
                        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                      )}
                    </div>
                  </div>
                  <dl className="mt-5 space-y-3 text-base">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="size-5" /> Autoescuela
                      </dt>
                      <dd className="truncate font-semibold">{schoolName || "—"}</dd>
                    </div>
                  </dl>
                </div>
                {isAdmin && <ReglamentoUpload />}
                <Accordion type="single" collapsible className="mt-4 rounded-3xl border bg-card px-4">
                  <AccordionItem value="pwd" className="border-none">
                    <AccordionTrigger className="py-4 text-base font-semibold">
                      Opciones Avanzadas (Cambiar Contraseña)
                    </AccordionTrigger>
                    <AccordionContent>
                      <PasswordCard />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </SheetContent>
            </Sheet>
            <NetworkIndicator />
            <span className="[&_button]:size-9 [&_button]:rounded-xl [&_svg]:size-5 md:[&_button]:size-12 md:[&_button]:rounded-2xl md:[&_svg]:size-6"><ThemeToggle /></span>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-xl md:size-12 md:rounded-2xl"
              aria-label="Cerrar sesión"
              onClick={() => void signOut()}
            >
              <LogOut className="size-5 md:size-6" />
            </Button>
          </div>
          </div>
          <div className={`grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-center overflow-hidden rounded-full border bg-background/80 transition-[height,opacity] duration-200 md:hidden ${headerCompact ? "h-8" : "h-10"}`}>
            <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={() => shiftAgendaDay(-1)} aria-label="Día anterior">
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" className="h-8 min-w-0 truncate rounded-full px-1 text-sm font-semibold capitalize" onClick={() => setAgendaDay(new Date())} aria-label="Fecha seleccionada, volver a hoy">
              {agendaDayLabel}
            </Button>
            <Button variant="ghost" size="icon" className="size-8 rounded-full" onClick={() => shiftAgendaDay(1)} aria-label="Día siguiente">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl overflow-x-hidden px-4 py-5">
        <div className="relative">
          <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-[var(--brand-secondary,var(--muted-foreground))]" />
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
          <div className="mt-4 w-full max-w-full min-w-0">
            <AgendaDiaria profesorId={user.id} title="Mi agenda" studentsVersion={agendaVersion} onDayChange={setAgendaFecha} selectedDay={agendaDay} onSelectedDayChange={setAgendaDay} hideDateNavOnMobile />
          </div>
        )}

        <h2 className="mt-6 mb-3 text-base font-bold tracking-wide text-muted-foreground uppercase">
          Alumnos activos ({students.length})
        </h2>

        <ul className="w-full max-w-full space-y-3 max-md:pb-40">
          {students.map((s) => (
            <li key={s.id} className="flex w-full max-w-full min-w-0 items-center gap-2">
              <Link
                to="/alumno/$studentId"
                params={{ studentId: s.id }}
                className="flex min-w-0 flex-1 items-center gap-4 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm transition hover:shadow-md active:scale-[0.99]"
              >
                <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-xl font-bold text-primary">
                  {initials(s.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold">{fullName(s)}</p>
                  <p className="truncate text-sm text-muted-foreground">
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
              {loading ? (
                "Cargando alumnos…"
              ) : (
                <>
                  <Search className="mx-auto mb-2 size-8 opacity-40" />
                  <p>No se encontraron alumnos con ese nombre</p>
                </>
              )}
            </li>
          )}
        </ul>

      </main>

      <div className="fixed right-4 bottom-4 left-4 z-40 max-w-full rounded-3xl border bg-background/95 p-3 shadow-lg md:inset-x-0 md:bottom-0 md:rounded-none md:border-x-0 md:border-b-0 md:p-4 md:shadow-none">
        <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-2 sm:flex-row">
          {user && <ScanRosterButton profesorId={user.id} fecha={agendaFecha} onDone={() => setAgendaVersion((v) => v + 1)} />}
          <Button
            onClick={() => setLessonOpen(true)}
            className="h-18 flex-1 rounded-3xl text-xl font-extrabold shadow-lg"
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
