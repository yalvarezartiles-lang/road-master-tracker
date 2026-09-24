import * as React from "react";
import { Car, MapPin, Plus, Save, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const [newZone, setNewZone] = React.useState("");
  const [topics, setTopics] = React.useState<string[]>([]);
  const [notes, setNotes] = React.useState("");
  const [board, setBoard] = React.useState<string | null>(null);
  const [boardKey, setBoardKey] = React.useState(0);

  React.useEffect(() => {
    if (open) {
      setSelected(studentId);
      setZone(data.zones[0]?.name ?? "");
      setTopics([]);
      setNotes("");
      setNewZone("");
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
            <div className="grid grid-cols-2 gap-2">
              {data.zones.map((z) => (
                <Chip key={z.id} active={zone === z.name} onClick={() => setZone(z.name)}>
                  {z.name}
                </Chip>
              ))}
              {data.zones.length === 0 && (
                <p className="col-span-2 text-sm text-muted-foreground">Aún no tienes zonas. Añade una abajo.</p>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                value={newZone}
                onChange={(e) => setNewZone(e.target.value)}
                placeholder="Nueva zona"
                className="h-13 rounded-2xl text-base"
              />
              <Button
                type="button"
                variant="secondary"
                className="h-13 rounded-2xl"
                onClick={() => {
                  const z = newZone.trim();
                  if (!z) return;
                  void addZone(z)
                    .then(() => {
                      setZone(z);
                      setNewZone("");
                    })
                    .catch((err: unknown) =>
                      toast.error(
                        err instanceof Error ? err.message : "No se pudo añadir la zona",
                      ),
                    );
                }}
              >
                <Plus className="size-5" />
              </Button>
            </div>
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
