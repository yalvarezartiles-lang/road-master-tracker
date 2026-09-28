import * as React from "react";
import { CalendarDays, CheckCircle, Star, User } from "lucide-react";
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

const MILESTONES = ["Control de embrague", "Circulación urbana", "Vías rápidas", "Conducción nocturna"];

/**
 * Ticket de Progreso (FinalPracticeCard): SIEMPRE montado en el DOM, fuera de la
 * vista, para que html-to-image pueda capturarlo. 100% efímero.
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
  const fecha = now.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div
      ref={ref}
      aria-hidden
      style={{ fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif" }}
      className="pointer-events-none fixed top-0 left-0 z-[-50] w-[400px] overflow-hidden rounded-3xl border border-blue-900/50 bg-gray-950 p-6 text-white opacity-0 shadow-2xl"
    >
      {/* Neón azul en las esquinas */}
      <div className="absolute -top-16 -left-16 size-40 rounded-full bg-blue-600/40 blur-3xl" />
      <div className="absolute -right-16 -bottom-16 size-40 rounded-full bg-blue-500/40 blur-3xl" />

      <div className="relative space-y-5">
        <h2 className="text-center text-2xl font-bold tracking-wide text-white uppercase">
          {school || "Autoescuela"}
        </h2>

        {/* Bloque 1: progreso */}
        <div>
          <div className="mb-2 flex justify-between text-xs font-semibold text-blue-200">
            {["0%", "25%", "50%", "75%", "100%"].map((m) => <span key={m}>{m}</span>)}
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-gray-800">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {MILESTONES.map((m) => (
              <div key={m} className="flex items-center gap-2 text-sm font-medium text-gray-200">
                <CheckCircle className="size-4 flex-none text-blue-500" /> {m}
              </div>
            ))}
          </div>
        </div>

        {/* Bloque 2: alumno */}
        <div className="flex items-center gap-4 rounded-xl bg-gray-900 p-6">
          <User className="size-8 flex-none text-cyan-500" />
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Nombre del alumno/a</div>
            <div className="text-xl font-bold break-words text-white">{studentName || "\u2014"}</div>
          </div>
        </div>

        {/* Bloque 3: clase */}
        <div className="flex items-center gap-4 rounded-xl bg-gray-900 p-6">
          <CalendarDays className="size-8 flex-none text-cyan-500" />
          <div>
            <div className="text-xs font-semibold tracking-wider text-gray-400 uppercase">Horario</div>
            <div className="text-xl font-bold text-white">{hora}</div>
            <div className="text-sm font-semibold text-gray-300">FECHA: {fecha}</div>
          </div>
        </div>

        {/* Bloque 4: motivacional */}
        <div className="rounded-xl bg-gray-900 p-6 text-center">
          <Star className="mx-auto size-7 fill-yellow-300/80 text-yellow-300" />
          <p className="mt-3 text-base font-medium text-gray-100">{phrase}</p>
        </div>
      </div>
    