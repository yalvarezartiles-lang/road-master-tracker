import * as React from "react";
import { CalendarPlus, Plus, Trash2, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { normalize } from "@/lib/autoescuela/normalize";
import { cn } from "@/lib/utils";

type StudentOpt = { id: string; name: string; apellidos: string };
type Franja = { key: string; studentId: string; start: string; duration: 45 | 90 | null };

const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function addMinutes(time: string, mins: number) {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min((h ?? 0) * 60 + (m ?? 0) + mins, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const newKey = () => Math.random().toString(36).slice(2);

function StudentPicker({
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
}: {
  profesorId: string;
  onSaved?: (day: Date) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [fecha, setFecha] = React.useState(() => toISODate(new Date()));
  const [students, setStudents] = React.useState<StudentOpt[]>([]);
  const [franjas, setFranjas] = React.useState<Franja[]>([]);
  const [saving, setSaving] = React.useState(false);

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
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="size-9 rounded-xl md:size-12 md:rounded-2xl" aria-label="Constructor de Cuadrantes">
          <CalendarPlus className="size-5 md:size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full max-w-md flex-col gap-0 p-0">
        <SheetHeader className="border-b p-5 text-left">
          <SheetTitle className="text-xl font-bold">Constructor de Cuadrantes</SheetTitle>
          <SheetDescription>Planifica tus clases del día en segundos</SheetDescription>
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="mt-3 h-12 text-base" />
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto bg-muted/40 p-4">
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
