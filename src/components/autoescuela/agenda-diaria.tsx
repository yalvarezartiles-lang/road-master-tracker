import * as React from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, MessageCircle, ChevronLeft, ChevronRight as ArrowRight, ChevronRight, Loader2, Plus, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Slot {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  student_id: string | null;
}
interface StudentOpt {
  id: string;
  name: string;
  apellidos: string;
  phone: string;
}

const waLink = (phone: string) => {
  let d = (phone || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9) d = `34${d}`;
  return d.length >= 9 ? `https://wa.me/${d}` : null;
};

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hm = (t: string) => t.slice(0, 5);

export function AgendaDiaria({
  profesorId,
  title,
  officeMode = false,
  studentsVersion = 0,
}: {
  profesorId: string;
  title?: string;
  officeMode?: boolean;
  studentsVersion?: number;
}) {
  const [day, setDay] = React.useState(() => new Date());
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [students, setStudents] = React.useState<StudentOpt[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [start, setStart] = React.useState("09:00");
  const [end, setEnd] = React.useState("09:45");
  const [newStudent, setNewStudent] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const fecha = toISO(day);
  const [canEdit, setCanEdit] = React.useState(officeMode);

  React.useEffect(() => {
    if (officeMode) return setCanEdit(true);
    void supabase
      .from("profiles")
      .select("autoescuela_id, es_autonomo")
      .eq("id", profesorId)
      .maybeSingle()
      .then(({ data }) => setCanEdit(!!data && (!data.autoescuela_id || !!data.es_autonomo)));
  }, [profesorId, officeMode]);

  const load = React.useCallback(async () => {
    setLoading(true);
    const [a, s] = await Promise.all([
      supabase
        .from("agenda_diaria")
        .select("id, fecha, hora_inicio, hora_fin, estado, student_id")
        .eq("profesor_id", profesorId)
        .eq("fecha", fecha)
        .order("hora_inicio"),
      supabase.from("students").select("id, name, apellidos, phone").eq("archivado", false).order("name"),
    ]);
    if (a.error) toast.error("No se pudo cargar la agenda");
    setSlots((a.data ?? []) as Slot[]);
    setStudents((s.data ?? []) as StudentOpt[]);
    setLoading(false);
  }, [profesorId, fecha, studentsVersion]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const update = async (id: string, patch: Partial<Slot>) => {
    setSlots((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from("agenda_diaria").update(patch).eq("id", id);
    if (error) {
      toast.error("No se pudo guardar el cambio");
      void load();
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (end <= start) {
      toast.error("La hora de fin debe ser posterior");
      return;
    }
    const { error } = await supabase.from("agenda_diaria").insert({
      profesor_id: profesorId,
      fecha,
      hora_inicio: start,
      hora_fin: end,
      student_id: newStudent || null,
    });
    if (error) {
      toast.error("No se pudo añadir el hueco");
      return;
    }
    toast.success(officeMode ? "Clase añadida" : "Hueco añadido");
    setNewStudent("");
    setFormOpen(false);
    void load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("agenda_diaria").delete().eq("id", id);
    if (error) {
      toast.error("No se pudo borrar");
      return;
    }
    void load();
  };

  const shift = (n: number) => setDay((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
  const nameOf = (id: string | null) => {
    const s = students.find((x) => x.id === id);
    return s ? [s.name, s.apellidos].filter(Boolean).join(" ") : "";
  };

  return (
    <section className="rounded-3xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-6 text-primary" />
        <h2 className="flex-1 text-lg font-bold">{title ?? "Agenda diaria"}</h2>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button variant="outline" size="icon" className="size-12 rounded-2xl" onClick={() => shift(-1)} aria-label="Día anterior">
          <ChevronLeft className="size-6" />
        </Button>
        <Input
          type="date"
          value={fecha}
          onChange={(e) => e.target.value && setDay(new Date(`${e.target.value}T12:00:00`))}
          className="h-12 flex-1 rounded-2xl text-center text-base"
        />
        <Button variant="outline" size="icon" className="size-12 rounded-2xl" onClick={() => shift(1)} aria-label="Día siguiente">
          <ChevronRight className="size-6" />
        </Button>
      </div>

      {!officeMode && !loading && slots.length > 0 && (
        <SwipeCards slots={slots} fecha={fecha} students={students} />
      )}

      {(officeMode || canEdit || loading || slots.length === 0) && (
      <ul className="mt-4 space-y-2">
        {loading && (
          <li className="flex justify-center p-4"><Loader2 className="size-6 animate-spin" /></li>
        )}
        {!loading && slots.length === 0 && (
          <li className="rounded-2xl border border-dashed p-5 text-center text-muted-foreground">Sin clases este día.</li>
        )}
        {!loading &&
          slots.map((s) => {
            const cancelled = s.estado === "cancelada";
            if (!canEdit && !officeMode) return null;
            if (!canEdit) {
              const inner = (
                <>
                  <span className="text-base font-bold tabular-nums">{hm(s.hora_inicio)}–{hm(s.hora_fin)}</span>
                  <span className="min-w-0 flex-1 truncate text-base">{nameOf(s.student_id) || "Hueco libre"}</span>
                  {cancelled && <span className="rounded-full bg-destructive/15 px-3 py-1 text-xs font-bold text-destructive uppercase">Cancelada</span>}
                </>
              );
              return (
                <li key={s.id}>
                  {s.student_id && !cancelled ? (
                    <Link
                      to="/alumno/$studentId"
                      params={{ studentId: s.student_id }}
                      search={{ evaluar: true }}
                      className="flex min-h-16 items-center gap-3 rounded-2xl border p-3 transition hover:bg-muted active:scale-[0.99]"
                    >
                      {inner}
                      <ArrowRight className="size-6 shrink-0 text-muted-foreground" />
                    </Link>
                  ) : (
                    <div className={`flex min-h-16 items-center gap-3 rounded-2xl border p-3 ${cancelled ? "opacity-60" : ""}`}>{inner}</div>
                  )}
                </li>
              );
            }
            return (
              <li key={s.id} className={`rounded-2xl border p-3 ${cancelled ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <Input type="time" value={hm(s.hora_inicio)} onChange={(e) => update(s.id, { hora_inicio: e.target.value })} className="h-12 w-28 rounded-xl text-base" aria-label="Hora inicio" />
                  <span>–</span>
                  <Input type="time" value={hm(s.hora_fin)} onChange={(e) => update(s.id, { hora_fin: e.target.value })} className="h-12 w-28 rounded-xl text-base" aria-label="Hora fin" />
                  {cancelled && <span className="rounded-full bg-destructive/15 px-3 py-1 text-xs font-bold text-destructive uppercase">Cancelada</span>}
                  {!officeMode && s.student_id && !cancelled && (
                    <Link to="/alumno/$studentId" params={{ studentId: s.student_id }} search={{ evaluar: true }} className="ml-auto flex h-12 items-center gap-1 rounded-xl px-3 font-semibold text-primary hover:bg-muted">
                      Evaluar <ArrowRight className="size-5" />
                    </Link>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <select
                    value={s.student_id ?? ""}
                    onChange={(e) => update(s.id, { student_id: e.target.value || null })}
                    className="h-12 min-w-0 flex-1 rounded-xl border bg-background px-3 text-base"
                    aria-label="Alumno"
                  >
                    <option value="">— Hueco libre —</option>
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>{[st.name, st.apellidos].filter(Boolean).join(" ")}</option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    className="h-12 rounded-xl"
                    onClick={() => update(s.id, { estado: cancelled ? "programada" : "cancelada" })}
                  >
                    {cancelled ? <><RotateCcw className="size-5" /> Reactivar</> : "Cancelar"}
                  </Button>
                  <Button variant="ghost" size="icon" className="size-12 rounded-xl text-destructive" onClick={() => remove(s.id)} aria-label={`Borrar hueco ${nameOf(s.student_id)}`}>
                    <X className="size-5" />
                  </Button>
                </div>
              </li>
            );
          })}
      </ul>
      )}

      {!canEdit ? null : officeMode && !formOpen ? (
        <Button onClick={() => setFormOpen(true)} className="mt-4 h-14 w-full rounded-2xl text-base font-bold">
          <Plus className="size-6" /> Añadir clase a este profesor
        </Button>
      ) : (
      <form onSubmit={add} className="mt-4 space-y-2 rounded-2xl bg-muted/40 p-3">
        <p className="text-sm font-semibold text-muted-foreground">{officeMode ? "Nueva clase" : "Añadir hueco"}</p>
        <select required={officeMode} value={newStudent} onChange={(e) => setNewStudent(e.target.value)} className="h-12 w-full rounded-xl border bg-background px-3 text-base" aria-label="Alumno del nuevo hueco">
          <option value="">{officeMode ? "— Elige alumno —" : "— Hueco libre —"}</option>
          {students.map((st) => (
            <option key={st.id} value={st.id}>{[st.name, st.apellidos].filter(Boolean).join(" ")}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-12 flex-1 rounded-xl text-base" aria-label="Nueva hora inicio" />
          <span>–</span>
          <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="h-12 flex-1 rounded-xl text-base" aria-label="Nueva hora fin" />
        </div>
        <div className="flex gap-2">
          {officeMode && (
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)} className="h-12 flex-1 rounded-xl text-base">Cancelar</Button>
          )}
          <Button type="submit" className="h-12 flex-1 rounded-xl text-base font-semibold">
            <Plus className="size-5" /> {officeMode ? "Guardar clase" : "Añadir"}
          </Button>
        </div>
      </form>
      )}
    </section>
  );
}

function SwipeCards({ slots, fecha, students }: { slots: Slot[]; fecha: string; students: StudentOpt[] }) {
  const scroller = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState(0);
  const initial = React.useMemo(() => {
    const now = new Date();
    if (fecha !== toISO(now)) return 0;
    const t = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const i = slots.findIndex((s) => s.estado !== "cancelada" && hm(s.hora_fin) > t);
    return i < 0 ? slots.length - 1 : i;
  }, [slots, fecha]);

  React.useEffect(() => {
    const el = scroller.current?.children[initial] as HTMLElement | undefined;
    if (el && scroller.current) scroller.current.scrollTo({ left: el.offsetLeft - (scroller.current.clientWidth - el.clientWidth) / 2 });
    setActive(initial);
  }, [initial]);

  const onScroll = () => {
    const box = scroller.current;
    if (!box) return;
    const center = box.scrollLeft + box.clientWidth / 2;
    let best = 0, dist = Infinity;
    Array.from(box.children).forEach((c, i) => {
      const el = c as HTMLElement;
      const d = Math.abs(el.offsetLeft + el.clientWidth / 2 - center);
      if (d < dist) { dist = d; best = i; }
    });
    setActive(best);
  };

  return (
    <div className="mt-4">
      <div
        ref={scroller}
        onScroll={onScroll}
        className="no-scrollbar flex w-full snap-x snap-mandatory scroll-smooth gap-4 overflow-x-auto px-4 pb-2"
      >
        {slots.map((s, i) => {
          const st = students.find((x) => x.id === s.student_id);
          const name = st ? [st.name, st.apellidos].filter(Boolean).join(" ") : "Hueco libre";
          const cancelled = s.estado === "cancelada";
          const wa = st ? waLink(st.phone) : null;
          const isActive = i === active;
          const body = (
            <>
              <p className="text-3xl font-extrabold tabular-nums">{hm(s.hora_inicio)}<span className="text-muted-foreground">–{hm(s.hora_fin)}</span></p>
              <p className="mt-2 line-clamp-2 text-xl font-bold">{name}</p>
              {cancelled && <span className="mt-2 inline-flex rounded-full bg-destructive/15 px-3 py-1 text-xs font-bold text-destructive uppercase">Cancelada</span>}
              {s.student_id && !cancelled && <p className="mt-3 flex items-center gap-1 text-sm font-semibold text-primary">Evaluar <ArrowRight className="size-4" /></p>}
            </>
          );
          return (
            <div
              key={s.id}
              className={`relative min-w-[85%] shrink-0 snap-center rounded-3xl border bg-background p-5 transition-all duration-300 sm:min-w-[300px] ${isActive ? "scale-100 border-primary shadow-lg" : "scale-90 opacity-60"} ${cancelled ? "opacity-50" : ""}`}
            >
              {s.student_id && !cancelled ? (
                <Link to="/alumno/$studentId" params={{ studentId: s.student_id }} search={{ evaluar: true }} className="block pr-14">
                  {body}
                </Link>
              ) : (
                <div className="pr-14">{body}</div>
              )}
              {st && (wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`WhatsApp a ${name}`}
                  className="absolute top-4 right-4 flex size-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow active:scale-95"
                >
                  <MessageCircle className="size-6" />
                </a>
              ) : (
                <span aria-label="Sin teléfono" className="absolute top-4 right-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground opacity-50">
                  <MessageCircle className="size-6" />
                </span>
              ))}
            </div>
          );
        })}
      </div>
      {slots.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5" aria-label="Desliza para ver más clases">
          {slots.map((s, i) => (
            <span key={s.id} className={`h-2 rounded-full transition-all ${i === active ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"}`} />
          ))}
          <span className="ml-2 text-xs text-muted-foreground">Desliza ↔</span>
        </div>
      )}
    </div>
  );
}
