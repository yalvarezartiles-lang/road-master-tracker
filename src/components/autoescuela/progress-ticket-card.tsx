// ============= Full file contents =============

import * as React from "react";
import { Check, Clock, User } from "lucide-react";
import { useStore } from "@/lib/autoescuela/store";
import { toDbLevel } from "@/lib/autoescuela/types";

/** Frases motivacionales: se elige una al azar en cada evaluación. */
const MOTIVATIONAL_PHRASES = [
  "Cada kilómetro te acerca a tu carnet. ¡Sigue así!",
  "La seguridad al volante se construye clase a clase.",
  "Hoy has conducido mejor que ayer. ¡Enhorabuena!",
  "La confianza llega con la práctica. ¡Vas por buen camino!",
  "Paciencia, atención y constancia: la fórmula del aprobado.",
  "Gran clase. El examen está cada vez más cerca.",
  "Conducir bien es cuestión de actitud. ¡Y tú la tienes!",
  "Un paso más hacia la libertad sobre ruedas.",
];

const MILESTONES = [
  { label: "Control de embrague", threshold: 1 },
  { label: "Circulación urbana", threshold: 25 },
  { label: "Vías rápidas", threshold: 50 },
  { label: "Conducción nocturna", threshold: 75 },
];

const PROGRESS_MARKS = [0, 25, 50, 75, 100];

/** Bloque interior "cristal ahumado": mismo estilo para los cuatro paneles. */
const PANEL =
  "mb-4 rounded-2xl border border-zinc-700/50 bg-zinc-800/30 p-5 backdrop-blur-md";
const LABEL = "mb-1 text-[10px] uppercase tracking-[0.2em] text-zinc-400";
const VALUE = "text-lg font-semibold text-zinc-50";

/**
 * Ticket de Progreso (FinalPracticeCard): SIEMPRE montado en el DOM, fuera de la
 * vista, para que html-to-image pueda capturarlo. 100% efímero, sin imágenes.
 */
export const ProgressTicketCard = React.forwardRef<
  HTMLDivElement,
  { school: string; studentName: string; studentId?: string | undefined; greens: string[] }
>(function ProgressTicketCard({ school, studentName, studentId, greens }, ref) {
  const { data } = useStore();
  const student = data.students.find((s) => s.id === studentId);

  const total = data.skills.length;
  const points = student
    ? data.skills.reduce((acc, k) => acc + toDbLevel(student.skills[k.id] ?? "rojo"), 0)
    : 0;
  const pct = total ? Math.round((points / (total * 2)) * 100) : 0;

  // Nueva frase cada vez que cambia la evaluación (verdes / progreso).
  const phrase = React.useMemo(
    () => MOTIVATIONAL_PHRASES[Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length)]!,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [greens.join("|"), pct, studentId],
  );

  const now = new Date();
  const lastLesson = student?.lessons[student.lessons.length - 1];
  const hora = lastLesson?.horaInicio?.slice(0, 5)
    ?? now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const lessonDate = lastLesson?.date ? new Date(lastLesson.date) : now;
  const fecha = lessonDate.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[-50] isolate mx-auto w-full max-w-md overflow-hidden rounded-[2.5rem] border border-zinc-800 bg-gradient-to-b from-zinc-900 to-black p-8 font-sans opacity-0 shadow-2xl"
    >
      <h2 className="mb-8 text-center text-2xl font-bold tracking-widest text-zinc-100">
        {school || "Autoescuela"}
      </h2>

      {/* Progreso */}
      <div className={PANEL}>
        <div className={LABEL}>Progreso</div>
        <div className={VALUE}>{pct}%</div>
        <div className="mt-3 mb-2 flex justify-between text-[10px] font-medium text-zinc-400">
          {PROGRESS_MARKS.map((mark) => (
            <span key={mark} className={pct >= mark ? "text-zinc-200" : undefined}>{mark}%</span>
          ))}
        </div>
        <div className="h-2.5 w-full rounded-full bg-zinc-800">
          <div
            className="h-full min-w-[2px] rounded-full bg-zinc-200"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-400">
          {MILESTONES.map(({ label, threshold }) => {
            const reached = pct >= threshold;
            return (
              <div key={label} className="flex items-center gap-2">
                <Check
                  className={`size-3.5 shrink-0 ${reached ? "text-zinc-300" : "text-zinc-700"}`}
                  strokeWidth={3}
                />
                <span className={reached ? "text-zinc-300" : undefined}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alumno */}
      <div className={PANEL}>
        <div className="flex items-center gap-4">
          <User className="size-5 shrink-0 text-zinc-300" aria-hidden />
          <div className="min-w-0">
            <div className={LABEL}>Nombre del alumno/a</div>
            <div className={`${VALUE} break-words`}>{studentName || "—"}</div>
          </div>
        </div>
      </div>

      {/* Horario */}
      <div className={PANEL}>
        <div className="flex items-center gap-4">
          <Clock className="size-5 shrink-0 text-zinc-300" aria-hidden />
          <div className="min-w-0">
            <div className={LABEL}>Horario</div>
            <div className={`${VALUE} tabular-nums`}>{hora}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-zinc-400">
              Fecha: {fecha}
            </div>
          </div>
        </div>
      </div>

      {/* Frase motivadora */}
      <div className={`${PANEL} mb-0`}>
        <p className="text-sm leading-relaxed text-zinc-300">{phrase}</p>
      </div>
    </div>
  );
});
