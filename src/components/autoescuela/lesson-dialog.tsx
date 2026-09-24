import * as React from "react";
import { Car, Check, ChevronsUpDown, MapPin, Plus, Save, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/autoescuela/store";
import { DEFAULT_TOPICS, NOTE_PRESETS } from "@/lib/autoescuela/types";
import { SkillSemaphore } from "./skill-semaphore";
import { Whiteboard } from "./whiteboard";

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-13 rounded-2xl border-2 px-4 py-3 text-base font-semibold transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function LessonDialog({
  open,
  onOpenChange,
  studentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId?: string;
}) {
  const { data, addLesson, addZone } = useStore();
  const [selected, setSelected] = React.useState<string | undefined>(studentId);
  const [zone, setZone] = React.useState<string>(data.zones[0]?.name ?? "");
  const [zoneOpen, setZoneOpen] = React.useState(false);
  const [zoneSearch, setZoneSearch] = React.useState("");
  const [creatingZone, setCreatingZone] = React.useState(false);
  const [topics, setTopics] = React.useState<string[]>([]);
  const [notes, setNotes] = React.useState("");
  const [board, setBoard] = React.useState<string | null>(null);
  const [boardKey, setBoardKey] = React.useState(0);

  React.useEffect(() => {
    if (open) {
      setSelected(studentId);
      setZone(data.zones[0]?.name ?? "");
      setZoneSearch("");
      setZoneOpen(false);
      setTopics([]);
      setNotes("");
      setBoard(null);
      setBoardKey((k) => k + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, studentId]);

  const student = data.students.find((s) => s.id === selected);
  const nextNumber = (student?.lessons.length ?? 0) + 1;

  const toggleTopic = (t: string) =>
    setTopics((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const submit = async () => {
    if (!selected) {
      toast.error("Selecciona un alumno");
      return;
    }
    try {
      await addLesson(selected, { date: new Date().toISOString(), zone, topics, notes, whiteboard: board });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
      return;
    }
    toast.success(`Clase ${nextNumber} registrada`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto rounded-3xl p-5">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Car className="size-6 text-primary" /> Registrar clase
          </DialogTitle>
          <DialogDescription className="text-base">
            {student ? `${student.name} · Clase ${nextNumber}` : "Selecciona el alumno"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!studentId && (
            <section>
              <Label className="mb-2 flex items-center gap-2 text-base">
                <User className="size-5" /> Alumno
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {data.students.map((s) => (
                  <Chip
                    key={s.id}
                    active={selected === s.id}
                    onClick={() => setSelected(s.id)}
                  >
                    {s.name}
                  </Chip>
                ))}
              </div>
            </section>
          )}

          <section>
            <Label className="mb-2 flex items-center gap-2 text-base">
              <MapPin className="size-5" /> Zona
            </Label>
            <div className="flex gap-2">
              <Select value={zone} onValueChange={setZone}>
                <SelectTrigger className="h-14 flex-1 rounded-2xl text-base">
                  <SelectValue
                    placeholder={data.zones.length ? "Elige una zona" : "Aún no tienes zonas"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {data.zones.map((z) => (
                    <SelectItem key={z.id} value={z.name} className="py-3 text-base">
                      {z.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="secondary"
                className="h-14 rounded-2xl px-4 text-base"
                onClick={() => setShowNewZone((v) => !v)}
              >
                <Plus className="size-5" /> Nueva zona
              </Button>
            </div>
            {showNewZone && (
              <div className="mt-2 flex gap-2">
                <Input
                  autoFocus
                  value={newZone}
                  onChange={(e) => setNewZone(e.target.value)}
                  placeholder="Nombre de la zona"
                  className="h-14 rounded-2xl text-base"
                />
                <Button
                  type="button"
                  className="h-14 rounded-2xl px-5 text-base"
                  onClick={() => {
                    const z = newZone.trim();
                    if (!z) return;
                    const existing = data.zones.find((x) => x.name.toLowerCase() === z.toLowerCase());
                    void addZone(z)
                      .then(() => {
                        setZone(existing?.name ?? z);
                        setNewZone("");
                        setShowNewZone(false);
                        toast.success("Zona guardada");
                      })
                      .catch((err: unknown) =>
                        toast.error(err instanceof Error ? err.message : "No se pudo añadir la zona"),
                      );
                  }}
                >
                  Guardar
                </Button>
              </div>
            )}
          </section>

          <section>
            <Label className="mb-2 block text-base">Temas trabajados</Label>
            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_TOPICS.map((t) => (
                <Chip key={t} active={topics.includes(t)} onClick={() => toggleTopic(t)}>
                  {t}
                </Chip>
              ))}
            </div>
          </section>

          {student && (
            <section>
              <Label className="mb-2 block text-base">Semáforo de habilidades</Label>
              <SkillSemaphore student={student} modoLectura={false} />
            </section>
          )}

          <section>
            <Label className="mb-2 block text-base">Observaciones</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Notas rápidas de la clase…"
              className="rounded-2xl text-base"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {NOTE_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setNotes(p)}
                  className="rounded-full border bg-muted px-3 py-2 text-sm font-medium text-muted-foreground"
                >
                  {p}
                </button>
              ))}
            </div>
          </section>

          <section>
            <Label className="mb-2 block text-base">Pizarra de explicación</Label>
            <Whiteboard key={boardKey} saved={!!board} onSave={setBoard} />
          </section>

          <Button onClick={() => void submit()} className="h-16 w-full rounded-2xl text-lg font-bold">
            <Save className="size-6" /> Guardar clase {nextNumber}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
