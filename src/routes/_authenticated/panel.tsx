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
  UserPlus, Building2, Users, Loader2, Camera, CalendarDays, Car } from "lucide-react";
import { ClaseSuelta } from "@/components/autoescuela/clase-suelta";
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
import { CuadranteBuilder } from "@/components/autoescuela/cuadrante-builder";
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
  if (loading)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
        <Loader2 className="size-8 animate-spin" />
        <p className="text-sm font-medium">Cargando…</p>
      </div>
    );
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

  const tile = "flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-3xl border bg-card p-4 text-center text-base font-bold text-foreground shadow-sm transition active:scale-[0.97] hover:shadow-md";
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background pb-10">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto grid w-full max-w-2xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <div className="flex min-w-0 items-center gap-3">
            {brand.schoolLogo && <SchoolLogo className="h-12 max-w-44 md:h-16 md:max-w-64" />}
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold leading-tight text-foreground md:text-2xl">
                {teacherName ? `Hola, ${teacherName}` : "Panel"}
              </h1>
              {!brand.schoolLogo && (brand.schoolName || schoolName) && (
                <p className="flex items-center gap-1.5 truncate text-sm font-medium text-muted-foreground">
                  <Building2 className="size-4 shrink-0" /> {brand.schoolName || schoolName}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-foreground">
            {isAdmin && (
              <Button asChild variant="ghost" size="icon" className="size-11 rounded-2xl">
                <Link to="/admin" aria-label="Administración"><Shield className="size-5" /></Link>
              </Button>
            )}
            <NetworkIndicator />
            <Button variant="ghost" size="icon" className="size-11 rounded-2xl" aria-label="Cerrar sesión" onClick={() => void signOut()}>
              <LogOut className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <Button asChild className="h-24 w-full rounded-3xl text-xl font-extrabold shadow-lg">
          <Link to="/conduccion">🚀 Iniciar Día / Evaluaciones</Link>
        </Button>

        {user && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <ScanRosterButton profesorId={user.id} className={tile}>
              <Camera className="size-10 text-primary" /> Escanear Cuadrante
            </ScanRosterButton>
            <CuadranteBuilder
              profesorId={user.id}
              trigger={<button type="button" className={tile}><CalendarDays className="size-10 text-primary" /> Modificar Agenda</button>}
            />
            <ClaseSuelta
              profesorId={user.id}
              trigger={<button type="button" className={tile}><Car className="size-10 text-primary" /> Clase Suelta</button>}
            />
            <Link to="/ajustes" className={tile}>
              <Settings className="size-10 text-primary" /> Ajustes
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
