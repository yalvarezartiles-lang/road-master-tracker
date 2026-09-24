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
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useStore } from "@/lib/autoescuela/store";
import { deliverTicket } from "@/lib/autoescuela/progress-ticket";

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
        <Button type="button" variant="outline" className="h-12 min-w-12 rounded-xl" onClick={() => padRef.current?.clear()}>
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
  autoAdvance = false,
}: {
  autoAdvance?: boolean;
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

  const [agendaId, setAgendaId] = React.useState<string | null>(null);
  const [schoolName, setSchoolName] = React.useState("");
  React.useEffect(() => {
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: p } = await supabase.from("profiles").select("autoescuela_id").eq("id", u.user.id).maybeSingle();
      if (!p?.autoescuela_id) return;
      const { data: a } = await supabase.from("autoescuelas").select("nombre_comercial").eq("id", p.autoescuela_id).maybeSingle();
      setSchoolName(a?.nombre_comercial ?? "");
    })();
  }, []);
  const navigate = useNavigate();
  const minus = (hhmm: string, mins: number) => {
    const [h, m] = hhmm.split(":").map(Number);
    const t = (((h ?? 0) * 60 + (m ?? 0) - mins) % 1440 + 1440) % 1440;
    return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  };
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  React.useEffect(() => {
    if (!lessonId) return;
    const now = new Date().toTimeString().slice(0, 5);
    const e = lesson?.horaFin ?? now;
    setEnd(e);
    setStart(lesson?.horaInicio ?? minus(e, 45));
    setAgendaId(null);
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || !studentId) return;
      const { data: rows } = await supabase
        .from("agenda_diaria")
        .select("id, hora_inicio, hora_fin")
        .eq("profesor_id", u.user.id)
        .eq("fecha", today())
        .eq("student_id", studentId)
        .neq("estado", "cancelada")
        .order("hora_inicio");
      const row = rows?.[0];
      if (row) {
        setAgendaId(row.id);
        if (!lesson?.horaInicio) {
          setStart(String(row.hora_inicio).slice(0, 5));
          setEnd(String(row.hora_fin).slice(0, 5));
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);
  void defaultStart;

  const goNext = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return navigate({ to: "/panel" });
    const { data: rows } = await supabase
      .from("agenda_diaria")
      .select("student_id, hora_inicio, estado")
      .eq("profesor_id", u.user.id)
      .eq("fecha", today())
      .not("student_id", "is", null)
      .order("hora_inicio");
    const { data: done } = await supabase
      .from("lessons")
      .select("student_id")
      .gte("date", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());
    const doneIds = new Set((done ?? []).map((d) => d.student_id));
    const next = (rows ?? []).find(
      (r) => r.student_id !== studentId && r.estado !== "cancelada" && r.estado !== "completada" && !doneIds.has(r.student_id),
    );
    if (next?.student_id) {
      toast.info("Siguiente alumno");
      navigate({ to: "/alumno/$studentId", params: { studentId: next.student_id }, search: { evaluar: true } });
    } else {
      toast.success("No quedan más clases hoy");
      navigate({ to: "/panel" });
    }
  };

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
    // Ticket de progreso efímero: se inicia ya para conservar el gesto del usuario.
    const ticket =
      !pending && student
        ? deliverTicket({
            school: schoolName,
            student: `${student.name} ${student.apellidos}`.trim(),
            greens: data.skills.filter((k) => student.skills[k.id] === "verde").map((k) => k.name),
          }).catch(() => null)
        : null;
    try {
      await signLesson(lessonId, { horaInicio: start, horaFin: end, firmaAlumno: fa, firmaProfesor: fp });
      if (agendaId) await supabase.rpc("complete_agenda_class", { _id: agendaId });
      toast.success(pending ? "Clase guardada con firma pendiente" : "Clase firmada y cerrada");
      onClose();
      if (ticket && student) {
        const res = await ticket;
        if (res === "downloaded") toast.info("Imagen descargada en tu dispositivo");
        const clean = (student.phone ?? "").replace(/\D/g, "");
        if (clean) {
          const phone = clean.length > 9 && clean.startsWith("34") ? clean : `34${clean}`;
          setWaPhone(phone);
          return; // el avance se hace al cerrar el aviso
        }
        if (res === "copied") toast.success("Imagen copiada al portapapeles");
      }
      if (autoAdvance) void goNext();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const closeWa = () => {
    setWaPhone(null);
    if (autoAdvance) void goNext();
  };

  return (
    <>
    <AlertDialog open={!!waPhone} onOpenChange={(o) => !o && closeWa()}>
      <AlertDialogContent className="rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>¡Ticket copiado al portapapeles!</AlertDialogTitle>
          <AlertDialogDescription>
            La imagen con los progresos ya está copiada. ¿Quieres abrir el chat del alumno para pegarla y enviársela?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-12 rounded-2xl">Cerrar</AlertDialogCancel>
          <AlertDialogAction
            className="h-12 rounded-2xl"
            onClick={() => {
              const textoWa = "🚗 ¡Gran trabajo hoy! Has sumado nuevos verdes en tu perfil. Pega la imagen aquí para ver tu progreso. ✅";
              window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(textoWa)}`, "_blank", "noopener,noreferrer");
            }}
          >
            Abrir WhatsApp
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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
        <p className="flex items-center gap-2 rounded-2xl border px-4 py-3 text-base font-semibold">
          <Clock className="size-5 text-primary" /> {start || "--:--"} – {end || "--:--"}
          <span className="ml-auto text-sm font-normal text-muted-foreground">automático</span>
        </p>
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
    </>
  );
}
