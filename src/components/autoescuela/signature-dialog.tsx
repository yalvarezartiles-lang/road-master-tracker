import * as React from "react";
import SignatureCanvasImpl from "react-signature-canvas";
type SignatureCanvas = SignatureCanvasImpl;
const SignatureCanvasC = SignatureCanvasImpl as unknown as React.ComponentType<any>;
import { Eraser, PenLine, Clock } from "lucide-react";
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
import { toast } from "sonner";
import { useStore } from "@/lib/autoescuela/store";

function SigPad({ label, padRef }: { label: string; padRef: React.RefObject<SignatureCanvas | null> }) {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    const t = setTimeout(measure, 250); // tras la animación del modal
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      clearTimeout(t);
      ro.disconnect();
    };
  }, []);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label className="flex items-center gap-2 text-base">
          <PenLine className="size-5" /> {label}
        </Label>
        <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => padRef.current?.clear()}>
          <Eraser className="size-5" /> Limpiar
        </Button>
      </div>
      <div ref={boxRef} className="h-48 overflow-hidden rounded-2xl border-2 border-dashed bg-white">
        {width > 0 && (
          <SignatureCanvasC
            ref={padRef}
            penColor="#0b1b3a"
            canvasProps={{ width, height: 192, className: "touch-none", "aria-label": label }}
          />
        )}
      </div>
    </div>
  );
}

export function SignatureDialog({
  lessonId,
  studentId,
  defaultStart,
  onClose,
}: {
  lessonId: string | null;
  studentId?: string | undefined;
  defaultStart?: string | undefined;
  onClose: () => void;
}) {
  const { data, signLesson } = useStore();
  const student = data.students.find((s) => s.id === studentId);
  const lesson = student?.lessons.find((l) => l.id === lessonId);
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const alumnoRef = React.useRef<SignatureCanvas | null>(null);
  const profRef = React.useRef<SignatureCanvas | null>(null);

  const [duration, setDuration] = React.useState<45 | 90>(45);
  const minus = (hhmm: string, mins: number) => {
    const [h, m] = hhmm.split(":").map(Number);
    const t = (((h ?? 0) * 60 + (m ?? 0) - mins) % 1440 + 1440) % 1440;
    return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  };
  const applyDuration = (d: 45 | 90, endTime = end) => {
    setDuration(d);
    if (endTime) setStart(minus(endTime, d));
  };

  React.useEffect(() => {
    if (lessonId) {
      const now = new Date().toTimeString().slice(0, 5);
      const e = lesson?.horaFin ?? now;
      setEnd(e);
      setDuration(45);
      setStart(lesson?.horaInicio ?? minus(e, 45));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);
  void defaultStart;

  const save = async (pending: boolean) => {
    if (!lessonId) return;
    if (!start || !end) {
      toast.error("Indica hora de inicio y fin");
      return;
    }
    let fa: string | null = null;
    let fp: string | null = null;
    if (!pending) {
      if (!alumnoRef.current || alumnoRef.current.isEmpty() || !profRef.current || profRef.current.isEmpty()) {
        toast.error("Faltan las dos firmas");
        return;
      }
      fa = alumnoRef.current.getCanvas().toDataURL("image/png");
      fp = profRef.current.getCanvas().toDataURL("image/png");
    }
    setSaving(true);
    try {
      await signLesson(lessonId, { horaInicio: start, horaFin: end, firmaAlumno: fa, firmaProfesor: fp });
      toast.success(pending ? "Clase guardada con firma pendiente" : "Clase firmada y cerrada");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!lessonId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[94vh] max-w-2xl overflow-y-auto rounded-3xl p-5">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl">Firma exprés</DialogTitle>
          <DialogDescription className="sr-only">Firmas del alumno y del profesor</DialogDescription>
        </DialogHeader>
        <div className="rounded-2xl bg-muted p-4">
          <p className="text-2xl font-extrabold">
            {student ? `${student.name} ${student.apellidos}` : "—"}
          </p>
          <p className="text-lg text-muted-foreground">DNI: {student?.dni || "—"}</p>
          {lesson && (
            <p className="text-sm text-muted-foreground">
              Clase {lesson.number} · {lesson.matricula || "sin matrícula"}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {([45, 90] as const).map((d) => (
            <Button
              key={d}
              type="button"
              variant={duration === d ? "default" : "outline"}
              onClick={() => applyDuration(d)}
              className="h-14 rounded-full text-lg font-bold"
            >
              {d} min
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-2 flex items-center gap-2 text-base"><Clock className="size-5" /> Hora inicio</Label>
            <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-14 rounded-2xl text-lg" />
          </div>
          <div>
            <Label className="mb-2 flex items-center gap-2 text-base"><Clock className="size-5" /> Hora fin</Label>
            <Input type="time" value={end} onChange={(e) => { setEnd(e.target.value); applyDuration(duration, e.target.value); }} className="h-14 rounded-2xl text-lg" />
          </div>
        </div>
        {lessonId && (
          <div className="space-y-4">
            <SigPad label="Firma Alumno" padRef={alumnoRef} />
            <SigPad label="Firma Profesor" padRef={profRef} />
          </div>
        )}
        <div className="space-y-2">
          <Button disabled={saving} onClick={() => void save(false)} className="h-16 w-full rounded-2xl text-lg font-bold">
            Guardar y Cerrar Clase
          </Button>
          <Button disabled={saving} variant="outline" onClick={() => void save(true)} className="h-14 w-full rounded-2xl text-base">
            Dejar firma pendiente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
