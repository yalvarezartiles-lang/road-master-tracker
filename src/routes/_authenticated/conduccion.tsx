import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { EmptyState } from "@/components/autoescuela/empty-state";
import { CalendarX, Check, Loader2, MapPin, NotebookPen, UserX, X } from "lucide-react";
import { toast } from "sonner";
import { safeAgendaWrite } from "@/lib/autoescuela/offline-queue";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { useStore } from "@/lib/autoescuela/store";
import { levelClasses } from "@/components/autoescuela/skill-traffic-light";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";

export const Route = createFileRoute("/_authenticated/conduccion")({
  head: () => ({
    meta: [
      { title: "Modo Conducción" },
      { name: "description", content: "Tarjetas de las clases del día para usar desde el coche." },
      { property: "og:title", content: "Modo Conducción" },
      { property: "og:description", content: "Completa o marca faltas de tus clases en un toque." },
    ],
  }),
  component: DrivingMode,
});

interface Slot {
  id: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  student_id: string;
  notas: string;
}
interface Prev { zona: string; notas: string }

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hm = (t: string) => t.slice(0, 5);
const vibrate = (p: number | number[]) => {
  try { navigator.vibrate?.(p); } catch { /* sin soporte */ }
};
function parseNotas(raw: string): Prev | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    if (j && typeof j === "object") return { zona: String(j.zona ?? ""), notas: String(j.notas ?? "") };
  } catch { /* texto plano */ }
  return { zona: "", notas: raw };
}

function DrivingMode() {
  const { user } = useCurrentUser();
  const { data } = useStore();
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [history, setHistory] = React.useState<Record<string, Prev>>({});
  const [loading, setLoading] = React.useState(true);
  const [api, setApi] = React.useState<CarouselApi>();
  const [index, setIndex] = React.useState(0);
  const [drawer, setDrawer] = React.useState(false);
  const [zona, setZona] = React.useState("");
  const [notas, setNotas] = React.useState("");

  React.useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data: a } = await supabase
        .from("agenda_diaria")
        .select("id, hora_inicio, hora_fin, estado, student_id, notas")
        .eq("profesor_id", user.id)
        .eq("fecha", toISO(new Date()))
        .neq("estado", "cancelada")
        .not("student_id", "is", null)
        .order("hora_inicio");
      const list = (a ?? []) as Slot[];
      setSlots(list);
      const ids = [...new Set(list.map((s) => s.student_id))];
      if (ids.length) {
        const today = toISO(new Date());
        const startToday = new Date(`${today}T00:00:00`).toISOString();
        const [{ data: les }, { data: past }] = await Promise.all([
          supabase.from("lessons").select("student_id, zone, notes, notas_profesor, date")
            .in("student_id", ids).lt("date", startToday).order("date", { ascending: false }),
          supabase.from("agenda_diaria").select("student_id, notas, fecha")
            .in("student_id", ids).eq("estado", "completada").lt("fecha", today)
            .order("fecha", { ascending: false }).order("hora_inicio", { ascending: false }),
        ]);
        const h: Record<string, Prev & { at: string }> = {};
        for (const l of les ?? []) {
          if (h[l.student_id]) continue;
          h[l.student_id] = { zona: l.zone ?? "", notas: (l.notas_profesor || l.notes || "").trim(), at: l.date.slice(0, 10) };
        }
        for (const p of past ?? []) {
          if (!p.student_id) continue;
          const v = parseNotas(p.notas);
          if (!v || (!v.zona && !v.notas)) continue;
          const cur = h[p.student_id];
          if (!cur || p.fecha > cur.at) h[p.student_id] = { ...v, at: p.fecha };
          else if (cur && (!cur.zona || !cur.notas)) h[p.student_id] = { zona: cur.zona || v.zona, notas: cur.notas || v.notas, at: cur.at };
        }
        setHistory(h);
      }
      setLoading(false);
    })();
  }, [user]);

  React.useEffect(() => {
    if (!api) return;
    const on = () => setIndex(api.selectedScrollSnap());
    on();
    api.on("select", on);
    return () => { api.off("select", on); };
  }, [api]);

  const prevFor = (studentId: string): Prev | null => history[studentId] ?? null;

  const apply = async (slot: Slot, estado: string, notasRaw: string, at: number) => {
    const before = { estado: slot.estado, notas: slot.notas };
    setSlots((l) => l.map((x) => (x.id === slot.id ? { ...x, estado, notas: notasRaw } : x)));
    api?.scrollTo(Math.min(at + 1, slots.length - 1));
    const result = await safeAgendaWrite({ op: "update", id: slot.id, values: { estado, notas: notasRaw } });
    if (result === "queued") return;
    if (result === "error") {
      setSlots((l) => l.map((x) => (x.id === slot.id ? { ...x, ...before } : x)));
      toast.error("No se pudo guardar");
      return;
    }
    toast("Clase actualizada", {
      duration: 4000,
      action: {
        label: "↩️ Deshacer",
        onClick: async () => {
          setSlots((l) => l.map((x) => (x.id === slot.id ? { ...x, ...before } : x)));
          api?.scrollTo(at);
          await safeAgendaWrite({ op: "update", id: slot.id, values: before });
        },
      },
    });
  };

  const current = slots[index];
  const markFalta = () => {
    if (!current) return;
    vibrate([100, 100, 100]);
    void apply(current, "falta", current.notas, index);
  };
  const openComplete = () => {
    if (!current) return;
    vibrate(100);
    setZona(""); setNotas(""); setDrawer(true);
  };
  const saveComplete = () => {
    if (!current) return;
    vibrate(100);
    setDrawer(false);
    void apply(current, "completada", JSON.stringify({ zona: zona.trim(), notas: notas.trim() }), index);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-2">
        <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Modo Conducción</p>
        <Button asChild variant="ghost" size="icon" className="size-12 rounded-full" aria-label="Salir">
          <Link to="/panel"><X className="size-6" /></Link>
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 items-center overflow-y-auto py-8">
        {loading ? (
          <Loader2 className="mx-auto size-8 animate-spin text-muted-foreground" />
        ) : slots.length === 0 ? (
          <div className="mx-auto w-full max-w-sm px-6">
            <EmptyState icon={CalendarX} text="No hay clases hoy"
              action={<Button asChild className="h-12 rounded-2xl"><Link to="/panel">+ Añadir Clase</Link></Button>} />
          </div>
        ) : (
          <Carousel setApi={setApi} opts={{ align: "center" }} className="w-full">
            <CarouselContent className="-ml-3 py-8">
              {slots.map((s, i) => {
                const st = data.students.find((x) => x.id === s.student_id);
                const name = st ? [st.name, st.apellidos].filter(Boolean).join(" ") : "Alumno";
                const prev = prevFor(s.student_id);
                const done = s.estado === "completada" || s.estado === "falta";
                return (
                  <CarouselItem key={s.id} className="basis-[88%] pl-3 sm:basis-[420px]">
                    <article className={`mx-auto max-w-md rounded-[2rem] border border-border bg-gradient-to-br from-card to-muted/40 p-6 shadow-[0_24px_48px_-16px_rgb(0_0_0/0.25)] ring-1 ring-foreground/5 transition-opacity ${done ? "opacity-60" : ""}`}>
                      <div className="flex items-center justify-between text-xs font-bold tracking-widest text-muted-foreground uppercase">
                        <span>Clase {i + 1} de {slots.length}</span>
                        <span>{hm(s.hora_inicio)} – {hm(s.hora_fin)}</span>
                      </div>
                      <div className="mt-6 flex flex-col items-center text-center">
                        <span className="flex size-20 items-center justify-center rounded-full bg-primary/12 text-2xl font-bold text-primary">
                          {name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                        </span>
                        <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-balance">{name}</h2>
                        {s.estado === "completada" && <p className="mt-1 text-sm font-semibold text-success">Completada</p>}
                        {s.estado === "falta" && <p className="mt-1 text-sm font-semibold text-danger">Falta</p>}
                        {st && data.skills.length > 0 && (
                          <div className="mt-4 flex w-full gap-1">
                            {data.skills.map((sk) => (
                              <span key={sk.id} className={`h-2 flex-1 rounded-full ${levelClasses[st.skills[sk.id] ?? "rojo"]}`} />
                            ))}
                          </div>
                        )}
                      </div>
                      <hr className="my-5 border-border/60" />
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground uppercase">Última zona</p>
                            <p className={prev?.zona ? "font-medium" : "text-muted-foreground/60"}>{prev?.zona || "Sin datos previos"}</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <NotebookPen className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-muted-foreground uppercase">Notas anteriores</p>
                            <p className={`line-clamp-3 ${prev?.notas ? "" : "text-muted-foreground/60"}`}>{prev?.notas || "Sin datos previos"}</p>
                          </div>
                        </div>
                      </div>
                      <hr className="my-5 border-border/60" />
                      <Button asChild variant="outline" className="h-14 w-full rounded-2xl text-base font-bold">
                        <Link to="/alumno/$studentId" params={{ studentId: s.student_id }}>📝 Evaluar Alumno</Link>
                      </Button>
                    </article>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>
        )}
      </div>

      {slots.length > 0 && (
        <div className="grid grid-cols-2 gap-3 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <Button onClick={markFalta} className="h-20 rounded-3xl bg-danger text-xl font-extrabold text-danger-foreground hover:bg-danger/90">
            <UserX className="size-7" /> Falta
          </Button>
          <Button onClick={openComplete} className="h-20 rounded-3xl bg-success text-xl font-extrabold text-success-foreground hover:bg-success/90">
            <Check className="size-7" /> Completar
          </Button>
        </div>
      )}

      <Drawer open={drawer} onOpenChange={setDrawer}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-md space-y-4 p-5">
            <DrawerHeader className="p-0 text-left">
              <DrawerTitle className="text-xl">Completar clase</DrawerTitle>
              <DrawerDescription>Zona y notas de hoy</DrawerDescription>
            </DrawerHeader>
            <Input value={zona} onChange={(e) => setZona(e.target.value)} placeholder="Zona actual" className="h-14 rounded-2xl text-base" />
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas" rows={4} className="rounded-2xl text-base" />
            <Button onClick={saveComplete} className="h-16 w-full rounded-2xl text-lg font-bold">Guardar</Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
