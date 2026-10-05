import * as React from "react";
import { CalendarPlus, Plus, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog as Sheet, DialogContent as SheetContent, DialogDescription as SheetDescription, DialogHeader as SheetHeader, DialogTitle as SheetTitle, DialogTrigger as SheetTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { normalize } from "@/lib/autoescuela/normalize";
import { cn } from "@/lib/utils";

type StudentOpt = { id: string; name: string; apellidos: string };
type Franja = { key: string; studentId: string; start: string; duration: 45 | 90 | null };

const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function addMinutes(time: string, mins: number) {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min((h ?? 0) * 60 + (m ?? 0) + mins, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const fromISO = (f: string) => { const [y, m, d] = f.split("-").map(Number); return new Date(y!, m! - 1, d!); };
const newKey = () => Math.random().toString(36).slice(2);

export function StudentPicker({
  students,
  value,
  onChange,
}: {
  students: StudentOpt[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const selected = students.find((s) => s.id === value);
  const filtered = React.useMemo(() => {
    const n = normalize(q);
    return n ? students.filter((s) => normalize(`${s.name} ${s.apellidos}`).includes(n)) : students;
  }, [q, students]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-12 w-full items-center justify-between rounded-xl border border-input bg-background px-3 text-left text-base"
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? `${selected.name} ${selected.apellidos}`.trim() : "Elegir alumno"}
          </span>
          <Search className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-2" align="start">
        <Input autoFocus placeholder="Buscar alumno…" value={q} onChange={(e) => setQ(e.target.value)} className="h-11" />
        <div className="mt-2 max-h-60 overflow-y-auto">
          {filtered.length === 0 && <p className="p-3 text-sm text-muted-foreground">Sin resultados</p>}
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onChange(s.id);
                setOpen(false);
                setQ("");
              }}
              className={cn(
                "block w-full truncate rounded-lg px-3 py-3 text-left text-base hover:bg-muted",
                s.id === value && "bg-muted font-semibold",
              )}
            >
              {s.name} {s.apellidos}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CuadranteBuilder({
  profesorId,
  onSaved,
  trigger,
}: {
  profesorId: string;
  onSaved?: (day: Date) => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [fecha, setFecha] = React.useState(() => toISODate(new Date()));
  const [students, setStudents] = React.useState<StudentOpt[]>([]);
  const [franjas, setFranjas] = React.useState<Franja[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [existing, setExisting] = React.useState<{ id: string; hora_inicio: string; hora_fin: string; student_id: string | null; estado: string }[]>([]);

  const loadExisting = React.useCallback(async () => {
    const { data } = await supabase
      .from("agenda_diaria")
      .select("id, hora_inicio, hora_fin, student_id, estado")
      .eq("profesor_id", profesorId)
      .eq("fecha", fecha)
      .order("hora_inicio");
    setExisting(data ?? []);
  }, [profesorId, fecha]);
  React.useEffect(() => { if (open) void loadExisting(); }, [open, loadExisting]);

  const removeOne = async (id: string) => {
    setExisting((l) => l.filter((x) => x.id !== id));
    const { error } = await supabase.from("agenda_diaria").delete().eq("id", id);
    if (error) { toast.error("No se pudo eliminar"); void loadExisting(); } else onSaved?.(fromISO(fecha));
  };
  const clearDay = async () => {
    if (!existing.length) return;
    const ids = existing.map((x) => x.id);
    setExisting([]);
    const { error } = await supabase.from("agenda_diaria").delete().in("id", ids);
    if (error) { toast.error("No se pudo vaciar el día"); void loadExisting(); }
    else { toast.success("Día vaciado"); onSaved?.(fromISO(fecha)); }
  };
  const nameOf = (id: string | null) => {
    const s = students.find((x) => x.id === id);
    return s ? `${s.name} ${s.apellidos}`.trim() : "Hueco libre";
  };

  React.useEffect(() => {
    if (!open) return;
    void supabase
      .from("students")
      .select("id, name, apellidos")
      .eq("archivado", false)
      .order("name")
      .then(({ data }) => setStudents((data ?? []) as StudentOpt[]));
  }, [open]);

  const addFranja = () =>
    setFranjas((f) => {
      const last = f[f.length - 1];
      const start = last?.duration ? addMinutes(last.start, last.duration) : last?.start ?? "08:00";
      return [...f, { key: newKey(), studentId: "", start, duration: null }];
    });
  const update = (key: string, patch: Partial<Franja>) =>
    setFranjas((f) => f.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const save = async (): Promise<void> => {
    if (!franjas.length) { toast.error("Añade al menos una franja"); return; }
    if (franjas.some((f) => !f.studentId || !f.start || !f.duration))
      { toast.error("Completa alumno, hora y duración en cada franja"); return; }
    setSaving(true);
    const { error } = await supabase.from("agenda_diaria").insert(
      franjas.map((f) => ({
        profesor_id: profesorId,
        fecha,
        hora_inicio: f.start,
        hora_fin: addMinutes(f.start, f.duration!),
        student_id: f.studentId,
      })),
    );
    setSaving(false);
    if (error) { toast.error("No se pudo guardar el cuadrante"); return; }
    toast.success(`Cuadrante guardado (${franjas.length} clase${franjas.length > 1 ? "s" : ""})`);
    const [y, m, d] = fecha.split("-").map(Number);
    onSaved?.(new Date(y!, m! - 1, d!));
    setFranjas([]);
    void loadExisting();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
        <Button variant="ghost" size="icon" className="size-9 rounded-xl md:size-12 md:rounded-2xl" aria-label="Constructor de Cuadrantes">
          <CalendarPlus className="size-5 md:size-6" />
        </Button>
        )}
      </SheetTrigger>
      <SheetContent className="flex max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-3xl">
        <SheetHeader className="border-b p-5 text-left">
          <SheetTitle className="text-xl font-bold">Constructor de Cuadrantes</SheetTitle>
          <SheetDescription>Planifica tus clases del día en segundos</SheetDescription>
          <div className="mt-3 flex gap-2">
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="h-12 flex-1 text-base" />
            <Button variant="destructive" onClick={() => void clearDay()} disabled={!existing.length} className="h-12 shrink-0 rounded-xl px-4 font-bold">
              🗑️ Vaciar Día
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto bg-muted/40 p-4">
          <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Clases del día ({existing.length})</p>
          {existing.length === 0 && <p className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">No hay clases este día</p>}
          {existing.map((x) => (
            <div key={x.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm">
              <span className="w-28 shrink-0 text-base font-bold tabular-nums">{x.hora_inicio.slice(0, 5)} - {x.hora_fin.slice(0, 5)}</span>
              <span className="min-w-0 flex-1 truncate text-base">{nameOf(x.student_id)}</span>
              <button type="button" onClick={() => void removeOne(x.id)} aria-label="Eliminar clase"
                className="grid size-11 shrink-0 place-items-center rounded-xl text-destructive hover:bg-destructive/10">
                <Trash2 className="size-5" />
              </button>
            </div>
          ))}
          {franjas.length > 0 && <p className="pt-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Nuevas franjas</p>}
          {franjas.map((f, i) => (
            <div key={f.key} className="space-y-3 rounded-2xl border border-zinc-100 bg-white p-4 text-zinc-900 dark:border-border dark:bg-card dark:text-card-foreground shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-500">Clase {i + 1}</span>
                <button
                  type="button"
                  onClick={() => setFranjas((x) => x.filter((y) => y.key !== f.key))}
                  className="grid size-10 place-items-center rounded-xl text-zinc-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Eliminar franja"
                >
                  <Trash2 className="size-5" />
                </button>
              </div>
              <StudentPicker students={students} value={f.studentId} onChange={(id) => update(f.key, { studentId: id })} />
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={f.start}
                  onChange={(e) => update(f.key, { start: e.target.value })}
                  className="h-12 w-28 shrink-0 text-base"
                />
                {([45, 90] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => update(f.key, { duration: d })}
                    className={cn(
                      "h-12 flex-1 rounded-full border px-3 text-base font-bold transition-colors",
                      f.duration === d
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-zinc-200 bg-white text-zinc-700 active:bg-zinc-100 dark:border-border dark:bg-card dark:text-card-foreground",
                    )}
                  >
                    +{d} min
                  </button>
                ))}
              </div>
              <p className="text-center text-lg font-bold tabular-nums">
                {f.start && f.duration ? `${f.start} - ${addMinutes(f.start, f.duration)}` : <span className="text-sm font-normal text-zinc-400">Elige la duración</span>}
              </p>
            </div>
          ))}
          <Button variant="outline" onClick={addFranja} className="h-14 w-full rounded-2xl border-dashed text-base font-bold">
            <Plus className="size-5" /> Añadir franja
          </Button>
        </div>

        <div className="border-t p-4">
          <Button onClick={save} disabled={saving} className="h-14 w-full rounded-2xl text-base font-bold">
            {saving && <Loader2 className="size-5 animate-spin" />} Guardar Cuadrante
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
