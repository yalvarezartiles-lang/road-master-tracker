import * as React from "react";
import { Check } from "lucide-react";
import { useStore } from "@/lib/autoescuela/store";
import { toDbLevel } from "@/lib/autoescuela/types";
import ticketBackground from "@/assets/progress-ticket-background.png.asset.json";

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
  const lessonDate = lastLesson?.date ? new Date(lastLesson.date) : now;
  const fecha = lessonDate.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[-50] isolate aspect-[2/3] w-[384px] overflow-hidden bg-ticket-canvas bg-cover bg-center bg-no-repeat font-sans text-ticket-primary opacity-0"
      style={{ backgroundImage: `url(${ticketBackground.url})` }}
    >
      <h2 className="absolute top-[7%] left-[9%] flex h-[11%] w-[82%] items-center justify-center text-center text-[28px] leading-tight font-extrabold uppercase text-ticket-primary drop-shadow-lg">
        {school || "Autoescuela"}
      </h2>

      <div className="absolute top-[22.1%] left-[10.1%] h-[14.6%] w-[79.8%] bg-ticket-panel" />

      <div className="absolute top-[23.35%] left-[11.9%] h-[5.3%] w-[76.5%]">
        <div className="absolute inset-x-0 top-0 flex justify-between text-[11px] leading-none font-semibold text-ticket-secondary">
          {PROGRESS_MARKS.map((mark) => (
            <span key={mark} className={`bg-ticket-canvas px-0.5 ${pct >= mark ? "text-ticket-primary" : ""}`}>{mark}%</span>
          ))}
        </div>
        <div className="absolute inset-x-0 top-[22px] h-[12px] rounded-full border border-ticket-line bg-ticket-track">
          <div
            className="h-full min-w-[2px] rounded-full bg-ticket-fill shadow-ticket-glow"
            style={{ width: `${pct}%` }}
          />
        </div>
        {PROGRESS_MARKS.map((mark) => (
          <span
            key={`tick-${mark}`}
            className="absolute top-[15px] h-[6px] w-px bg-ticket-line"
            style={{ left: `${mark}%` }}
          />
        ))}
      </div>

      <div className="absolute top-[31.7%] left-[12.3%] grid w-[76%] grid-cols-4">
        {MILESTONES.map(({ label, threshold }, index) => {
          const reached = pct >= threshold;
          return (
            <div key={label} className={`flex h-[39px] items-start gap-2 px-1.5 ${index ? "border-l border-ticket-line" : ""}`}>
              <span className={`mt-px flex size-[15px] shrink-0 items-center justify-center rounded-full border ${reached ? "border-ticket-bright text-ticket-bright shadow-ticket-icon" : "border-ticket-muted text-transparent"}`}>
                <Check className="size-[10px] stroke-[3]" />
              </span>
              <span className={`text-[9px] leading-[1.35] font-semibold ${reached ? "text-ticket-primary" : "text-ticket-muted"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="absolute top-[42.4%] left-[29.4%] flex h-[7.2%] w-[58%] flex-col justify-center bg-ticket-panel px-2">
        <div className="text-[9px] leading-none font-semibold uppercase text-ticket-secondary">Nombre del alumno/a</div>
        <div className="mt-2 line-clamp-2 text-[18px] leading-[1.08] font-bold break-words text-ticket-primary">
          {studentName || "—"}
        </div>
      </div>

      <div className="absolute top-[55.2%] left-[29.5%] flex h-[12%] w-[58%] flex-col justify-center bg-ticket-panel px-2">
        <div className="text-[9px] leading-none font-semibold uppercase text-ticket-secondary">Horario</div>
        <div className="mt-2 text-[36px] leading-none font-extrabold tabular-nums text-ticket-primary">{hora}</div>
        <div className="mt-3 text-[10px] leading-none font-semibold uppercase text-ticket-secondary">Fecha: {fecha}</div>
      </div>

      <p className="absolute top-[77.2%] left-[15%] flex min-h-[8%] w-[70%] items-center justify-center bg-ticket-panel px-2 text-center text-[14px] leading-[1.45] font-semibold text-ticket-primary">
        {phrase}
      </p>
    </div>
  );
});
