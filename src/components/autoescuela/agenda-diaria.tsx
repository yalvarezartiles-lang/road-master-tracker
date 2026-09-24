import * as React from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, CalendarPlus, CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, MessageCircle, Plus, RotateCcw, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [organizerOpen, setOrganizerOpen] = React.useState(false);
  const [completedStudentIds, setCompletedStudentIds] = React.useState<Set<string>>(new Set());
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
    const startOfDay = new Date(`${fecha}T00:00:00`);
    const endOfDay = new Date(`${fecha}T00:00:00`);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const [a, s, l] = await Promise.all([
      supabase
        .from("agenda_diaria")
        .select("id, fecha, hora_inicio, hora_fin, estado, student_id")
        .eq("profesor_id", profesorId)
        .eq("fecha", fecha)
        .order("hora_inicio"),
      supabase.from("students").select("id, name, apellidos, phone").eq("archivado", false).order("name"),
      supabase
        .from("lessons")
        .select("student_id")
        .eq("created_by", profesorId)
        .gte("date", startOfDay.toISOString())
        .lt("date", endOfDay.toISOString()),
    ]);
    if (a.error) toast.error("No se pudo cargar la agenda");
    setSlots((a.data ?? []) as Slot[]);
    setStudents((s.data ?? []) as StudentOpt[]);
    setCompletedStudentIds(new Set((l.data ?? []).map((lesson) => lesson.student_id)));
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
  const studentOf = (id: string | null) => students.find((x) => x.id === id);
  const nameOf = (id: string | null) => {
    const s = studentOf(id);
    return s ? [s.name, s.apellidos].filter(Boolean).join(" ") : "";
  };
  const isCompleted = (s: Slot) =>
    s.estado === "completada" || (!!s.student_id && completedStudentIds.has(s.student_id));

  const dateNav = (
    <div className="flex items-center gap-2">
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
  );

  const editList = (
    <ul className="space-y-2">
      {loading && (
        <li className="flex justify-center p-4"><Loader2 className="size-6 animate-spin" /></li>
      )}
      {!loading && slots.length === 0 && (
        <li className="rounded-2xl border border-dashed p-5 text-center text-muted-foreground">Sin clases este día.</li>
      )}
      {!loading &&
        slots.map((s) => {
          const cancelled = s.estado === "cancelada";
          const completed = isCompleted(s);
          return (
            <li key={s.id} className={`rounded-2xl border bg-card p-3 ${completed ? "bg-success/10 opacity-60" : ""} ${cancelled ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <Input type="time" value={hm(s.hora_inicio)} onChange={(e) => update(s.id, { hora_inicio: e.target.value })} className="h-12 w-28 rounded-xl text-base" aria-label="Hora inicio" />
                <span>–</span>
                <Input type="time" value={hm(s.hora_fin)} onChange={(e) => update(s.id, { hora_fin: e.target.value })} className="h-12 w-28 rounded-xl text-base" aria-label="Hora fin" />
                {cancelled && <span className="rounded-full bg-destructive/15 px-3 py-1 text-xs font-bold text-destructive uppercase">Cancelada</span>}
                {completed && (
                  <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-xs font-bold text-success">
                    <CheckCircle2 className="size-4" /> Realizada
                  </span>
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
  );

  const addForm = (
    <form onSubmit={add} className="space-y-2">
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
  );

  // Office view: unchanged layout
  if (officeMode) {
    return (
      <section className="rounded-3xl border bg-card shadow-sm hover:shadow-md transition-shadow p-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-6 text-primary" />
          <h2 className="flex-1 text-lg font-bold">{title ?? "Agenda diaria"}</h2>
        </div>
        <div className="mt-3">{dateNav}</div>
        <div className="mt-4">{editList}</div>
        {!formOpen ? (
          <Button onClick={() => setFormOpen(true)} className="mt-4 h-14 w-full rounded-2xl text-base font-bold">
            <Plus className="size-6" /> Añadir clase a este profesor
          </Button>
        ) : (
          <div className="mt-4 space-y-2 rounded-2xl bg-muted/40 p-3">
            <p className="text-sm font-semibold text-muted-foreground">Nueva clase</p>
            {addForm}
          </div>
        )}
      </section>
    );
  }

  const openWhatsApp = (e: React.MouseEvent, phone?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!phone) {
      toast.error("El alumno no tiene teléfono registrado");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    window.open(`https://wa.me/34${cleanPhone}`, "_blank", "noopener,noreferrer");
  };

  const cards = slots.filter((s) => s.student_id && s.estado !== "cancelada");

  return (
    <section className="py-2">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-6 text-primary" />
        <h2 className="flex-1 text-lg font-bold">{title ?? "Agenda diaria"}</h2>
        {canEdit && (
          <Button variant="outline" onClick={() => setOrganizerOpen(true)} className="h-12 rounded-2xl font-semibold">
            <CalendarPlus className="size-5" /> Organizar Horario
          </Button>
        )}
      </div>

      <div className="-mx-4 mt-4 flex w-full snap-x snap-mandatory flex-row gap-6 overflow-x-auto scroll-smooth px-4 pb-4 no-scrollbar">
        {loading && (
          <div className="flex w-full justify-center p-6"><Loader2 className="size-6 animate-spin" /></div>
        )}
        {!loading && cards.length === 0 && (
          <div className="w-full rounded-3xl border border-dashed p-8 text-center text-muted-foreground">Sin clases programadas hoy.</div>
        )}
        {!loading &&
          cards.map((s) => {
            const completed = isCompleted(s);
            const st = studentOf(s.student_id);
            return (
              <div
                key={s.id}
                className={`flex min-w-[85%] shrink-0 snap-center flex-col gap-4 rounded-3xl border bg-card p-6 shadow-sm sm:min-w-[300px] ${completed ? "bg-success/10 opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-2xl font-extrabold tabular-nums">
                    <Clock className="size-6 text-primary" /> {hm(s.hora_inicio)}–{hm(s.hora_fin)}
                  </span>
                  {completed && (
                    <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-xs font-bold text-success">
                      <CheckCircle2 className="size-4" /> Realizada
                    </span>
                  )}
                </div>
                <p className="flex items-center gap-2 truncate text-lg font-bold">
                  <UserRound className="size-5 shrink-0 text-muted-foreground" /> {nameOf(s.student_id)}
                </p>
                <div className="mt-auto flex gap-3">
                  <button
                    type="button"
                    onClick={(e) => openWhatsApp(e, st?.phone)}
                    aria-label={`WhatsApp a ${nameOf(s.student_id)}`}
                    className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-success text-success-foreground transition active:scale-95"
                  >
                    <MessageCircle className="size-6" />
                  </button>
                  <Link
                    to="/alumno/$studentId"
                    params={{ studentId: s.student_id! }}
                    search={{ evaluar: true }}
                    className="flex h-14 flex-1 items-center justify-center gap-1 rounded-2xl bg-primary text-base font-bold text-primary-foreground transition active:scale-95"
                  >
                    Evaluar <ChevronRight className="size-5" />
                  </Link>
                </div>
              </div>
            );
          })}
      </div>

      {canEdit && (
        <Dialog
          open={organizerOpen}
          onOpenChange={(o) => {
            setOrganizerOpen(o);
            if (!o) setDay(new Date());
          }}
        >
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl"><CalendarPlus className="size-6 text-primary" /> Organizar Horario</DialogTitle>
              <DialogDescription>Crea huecos y asigna alumnos a tus clases.</DialogDescription>
            </DialogHeader>
            {dateNav}
            <div className="space-y-2 rounded-2xl bg-muted/40 p-4">
              <p className="text-sm font-bold tracking-wide text-muted-foreground uppercase">Crear hueco</p>
              {addForm}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold tracking-wide text-muted-foreground uppercase">Asignar alumnos y organizar</p>
              {editList}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
