import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock,
  MapPin,
  Plus,
  ScanLine,
  Search,
  UserRound,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ui-concepts")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Playground UI — Conceptos de inicio" },
      {
        name: "description",
        content:
          "Comparativa de tres arquitecturas móviles para la pantalla de inicio del profesor.",
      },
      { property: "og:title", content: "Playground UI — Conceptos de inicio" },
      {
        property: "og:description",
        content: "Tres maquetas de alta fidelidad lado a lado.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UiConceptsPage,
});

// ---------- Mock data ----------

const CURRENT_LESSON = {
  student: "Diana C.",
  fullName: "Diana Cabrera",
  start: "16:00",
  end: "16:45",
  zone: "Zona Centro",
  topic: "Glorietas",
  car: "4821 JKL",
};

const UPCOMING = [
  { student: "Marcos L.", time: "17:00", zone: "Autovía" },
  { student: "Lucía P.", time: "18:30", zone: "Zona Examen" },
  { student: "Andrés R.", time: "19:15", zone: "Zona Centro" },
];

// ---------- Frame ----------

function PhoneFrame({
  label,
  caption,
  children,
}: {
  label: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-[375px] h-[812px] shrink-0 border-8 border-zinc-900 rounded-[3rem] shadow-xl overflow-hidden bg-background">
        {/* Notch decorativo */}
        <div className="absolute top-2 left-1/2 z-20 h-6 w-28 -translate-x-1/2 rounded-full bg-zinc-900" />
        {children}
      </div>
      <div className="max-w-[340px] text-center">
        <p className="text-lg font-bold tracking-tight text-foreground">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{caption}</p>
      </div>
    </div>
  );
}

// ---------- Mockup 1: Timeline de Acción ----------

function TimelineMock() {
  return (
    <div className="flex h-full flex-col bg-background">
      {/* Cabecera */}
      <div className="px-5 pt-14 pb-3">
        <p className="text-sm text-muted-foreground">Martes, 5 de octubre</p>
        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-foreground">
          Hoy tienes <span className="text-primary">4 clases</span>
        </h1>
      </div>

      {/* Línea de tiempo */}
      <div className="relative flex-1 overflow-y-auto px-5 pb-24">
        {/* Riel vertical */}
        <div className="absolute bottom-24 left-[2.35rem] top-[6.2rem] w-0.5 bg-border" />

        {/* Clase actual expandida */}
        <div className="relative pl-10">
          <div className="absolute left-0 top-5 flex size-8 items-center justify-center rounded-full bg-primary ring-4 ring-background">
            <Car className="size-4 text-primary-foreground" />
          </div>
          <div className="rounded-3xl bg-primary p-5 text-primary-foreground shadow-lg shadow-primary/30">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-primary-foreground/20 px-3 py-1 text-xs font-bold">
                EN CURSO
              </span>
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <Clock className="size-4" /> 16:00 – 16:45
              </span>
            </div>
            <p className="mt-4 text-3xl font-extrabold tracking-tight">
              {CURRENT_LESSON.student}
            </p>
            <p className="mt-1 text-sm opacity-90">{CURRENT_LESSON.fullName}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="flex items-center gap-1.5 rounded-full bg-primary-foreground/20 px-3 py-1.5">
                <MapPin className="size-3.5" /> {CURRENT_LESSON.zone}
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-primary-foreground/20 px-3 py-1.5">
                {CURRENT_LESSON.topic}
              </span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-primary-foreground/15 py-2.5 text-center">
                <CheckCircle2 className="mx-auto size-5" />
                <p className="mt-1 text-[11px] font-bold">Verde</p>
              </div>
              <div className="rounded-2xl bg-primary-foreground/15 py-2.5 text-center">
                <CircleDot className="mx-auto size-5" />
                <p className="mt-1 text-[11px] font-bold">Ámbar</p>
              </div>
              <div className="rounded-2xl bg-primary-foreground/15 py-2.5 text-center">
                <AlertTriangle className="mx-auto size-5" />
                <p className="mt-1 text-[11px] font-bold">Rojo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Clases futuras atenuadas */}
        <div className="mt-6 space-y-4">
          {UPCOMING.map((l) => (
            <div key={l.time} className="relative pl-10">
              <div className="absolute left-[0.375rem] top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-muted-foreground/40 bg-background" />
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 opacity-60">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-foreground">
                    {l.student}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{l.zone}</p>
                </div>
                <span className="shrink-0 text-sm font-bold text-muted-foreground">
                  {l.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAB */}
      <button
        type="button"
        aria-label="Nueva clase"
        className="absolute bottom-7 right-6 z-10 flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/40 active:scale-95 transition-transform"
      >
        <Plus className="size-8" strokeWidth={2.5} />
      </button>
    </div>
  );
}

// ---------- Mockup 2: Tarjetas Enfocadas (Apple Wallet) ----------

function WalletMock() {
  return (
    <div className="flex h-full flex-col bg-muted/40">
      {/* Carrusel superior */}
      <div className="px-5 pt-14 pb-2 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Clase 2 de 4
        </p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <div className="h-1.5 w-6 rounded-full bg-primary" />
          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
        </div>
      </div>

      {/* Tarjetas laterales asomando (sensación de swipe) */}
      <div className="relative flex flex-1 items-center justify-center px-5">
        <div className="absolute left-0 top-1/2 h-56 w-6 -translate-y-1/2 rounded-r-2xl bg-card shadow-sm" />
        <div className="absolute right-0 top-1/2 h-56 w-6 -translate-y-1/2 rounded-l-2xl bg-card shadow-sm" />
        <ChevronLeft className="absolute left-2 top-1/2 z-10 size-5 -translate-y-1/2 text-muted-foreground/50" />
        <ChevronRight className="absolute right-2 top-1/2 z-10 size-5 -translate-y-1/2 text-muted-foreground/50" />

        {/* Tarjeta masiva */}
        <div className="relative z-[5] w-[calc(100%-3.5rem)] rounded-[2rem] bg-card p-7 shadow-xl">
          <div className="flex items-start justify-between">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
              <UserRound className="size-7 text-primary" />
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5">
              <span className="size-2.5 rounded-full bg-success" />
              <span className="text-xs font-bold text-success">Buen nivel</span>
            </div>
          </div>

          <p className="mt-6 text-4xl font-extrabold tracking-tight text-foreground">
            {CURRENT_LESSON.student}
          </p>
          <p className="mt-1 text-base text-muted-foreground">
            {CURRENT_LESSON.fullName}
          </p>

          <div className="my-6 h-px bg-border" />

          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="size-4" /> Horario
              </span>
              <span className="text-sm font-bold text-foreground">
                {CURRENT_LESSON.start} – {CURRENT_LESSON.end}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="size-4" /> Zona
              </span>
              <span className="text-sm font-bold text-foreground">
                {CURRENT_LESSON.zone}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Car className="size-4" /> Vehículo
              </span>
              <span className="text-sm font-bold text-foreground">
                {CURRENT_LESSON.car}
              </span>
            </div>
          </div>

          {/* Semáforo */}
          <div className="mt-6 grid grid-cols-3 gap-2.5">
            <div className="flex items-center justify-center gap-2 rounded-2xl bg-success py-3">
              <CheckCircle2 className="size-5 text-success-foreground" />
              <span className="text-xs font-bold text-success-foreground">9</span>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-2xl bg-warning py-3">
              <CircleDot className="size-5 text-warning-foreground" />
              <span className="text-xs font-bold text-warning-foreground">4</span>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-2xl bg-danger py-3">
              <AlertTriangle className="size-5 text-danger-foreground" />
              <span className="text-xs font-bold text-danger-foreground">1</span>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones fijas abajo */}
      <div className="grid grid-cols-2 gap-3 px-5 pb-8">
        <button
          type="button"
          className="flex h-16 items-center justify-center gap-2 rounded-3xl bg-success text-base font-bold text-success-foreground shadow-md active:scale-[0.98] transition-transform"
        >
          <CheckCircle2 className="size-6" /> Completar
        </button>
        <button
          type="button"
          className="flex h-16 items-center justify-center gap-2 rounded-3xl bg-danger text-base font-bold text-danger-foreground shadow-md active:scale-[0.98] transition-transform"
        >
          <XCircle className="size-6" /> Falta
        </button>
      </div>
    </div>
  );
}

// ---------- Mockup 3: Bento Box (Panel Táctico) ----------

const BENTO_ACTIONS = [
  { icon: ScanLine, label: "Escanear\nCuadrante", primary: true },
  { icon: Plus, label: "Añadir\nManual" },
  { icon: Search, label: "Buscar\nAlumno" },
  { icon: CalendarDays, label: "Ver\nAgenda" },
];

function BentoMock() {
  return (
    <div className="flex h-full flex-col bg-background p-5 pt-14">
      {/* Estado ultra compacto */}
      <div className="flex items-center gap-4 rounded-3xl bg-primary p-5 text-primary-foreground shadow-lg shadow-primary/30">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-foreground/20">
          <Car className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest opacity-80">
            En curso
          </p>
          <p className="mt-0.5 truncate text-xl font-extrabold tracking-tight">
            {CURRENT_LESSON.student} · {CURRENT_LESSON.start}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary-foreground/20 px-3 py-1 text-xs font-bold">
          30 min
        </span>
      </div>

      {/* Saludo */}
      <div className="mt-6 mb-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Panel táctico
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          4 clases hoy · próxima a las 17:00
        </p>
      </div>

      {/* Grid Bento asimétrico */}
      <div className="grid flex-1 grid-cols-2 grid-rows-[1.2fr_1fr_1fr] gap-3.5">
        {BENTO_ACTIONS.map((a, i) => (
          <button
            key={a.label}
            type="button"
            className={cn(
              "flex flex-col items-start justify-between rounded-3xl p-5 text-left shadow-sm active:scale-[0.97] transition-transform",
              i === 0 && "row-span-2 bg-primary text-primary-foreground shadow-lg shadow-primary/30",
              i > 0 && "bg-card border border-border",
            )}
          >
            <span
              className={cn(
                "flex size-12 items-center justify-center rounded-2xl",
                i === 0 ? "bg-primary-foreground/20" : "bg-primary/10",
              )}
            >
              <a.icon
                className={cn("size-6", i === 0 ? "" : "text-primary")}
              />
            </span>
            <span className="whitespace-pre-line text-lg font-extrabold leading-tight tracking-tight">
              {a.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- Page ----------

function UiConceptsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-8 py-6">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Playground temporal
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
              Comparativa de inicios — elige el que mejor fluya al volante
            </h1>
          </div>
          <Link
            to="/panel"
            className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent"
          >
            Volver al panel
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1400px] flex-wrap items-start justify-center gap-10 px-8 py-12">
        <PhoneFrame
          label="1 · Timeline de Acción"
          caption="Una línea de tiempo vertical del día; la clase en curso manda y las futuras quedan atenuadas. FAB siempre al alcance del pulgar."
        >
          <TimelineMock />
        </PhoneFrame>

        <PhoneFrame
          label="2 · Tarjetas Enfocadas"
          caption="Estilo Apple Wallet: una sola clase a la vez, cero distracciones, y Completar / Falta fijados abajo para decidir sin pensar."
        >
          <WalletMock />
        </PhoneFrame>

        <PhoneFrame
          label="3 · Bento Box Táctico"
          caption="Estado compacto arriba y cuatro botones gigantes abajo: todo lo habitual a un toque, pensado para una sola mano."
        >
          <BentoMock />
        </PhoneFrame>
      </main>
    </div>
  );
}
