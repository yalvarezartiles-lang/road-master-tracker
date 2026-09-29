import * as React from "react";
import { Clock, User, Trophy, Flame, Star, TrendingUp, Award } from "lucide-react";
import { useStore } from "@/lib/autoescuela/store";
import { useSchool } from "@/lib/autoescuela/school-branding";
import { toDbLevel } from "@/lib/autoescuela/types";

const PROGRESS_MARKS = [0, 25, 50, 75, 100];
const DEFAULT_ACCENT = "#e4e4e7";

const PANEL = "rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md";
const LABEL = "mb-1 text-[10px] uppercase tracking-[0.2em] text-zinc-400";
const VALUE = "text-lg font-semibold text-zinc-50";

type Badge = { icon: React.ElementType; title: string; subtitle: string };

/**
 * Ticket de Progreso en formato Instagram Story (9:16). SIEMPRE montado en el DOM,
 * fuera de la vista, para que html-to-image pueda capturarlo. 100% efímero.
 */
export const ProgressTicketCard = React.forwardRef<
  HTMLDivElement,
  { school: string; studentName: string; studentId?: string | undefined; greens: string[] }
>(function ProgressTicketCard({ school, studentName, studentId, greens }, ref) {
  const { data } = useStore();
  const brand = useSchool();
  const accent = brand.primaryColor || DEFAULT_ACCENT;
  const name = brand.schoolName || school || "Autoescuela";
  const student = data.students.find((s) => s.id === studentId);

  const total = data.skills.length;
  const levels = student ? data.skills.map((k) => toDbLevel(student.skills[k.id] ?? "rojo")) : [];
  const points = levels.reduce((a, b) => a + b, 0);
  const pct = total ? Math.round((points / (total * 2)) * 100) : 0;
  const allGreen = total > 0 && levels.every((l) => l === 2);

  // 1–2 insignias según la evaluación.
  const badges = React.useMemo<Badge[]>(() => {
    const out: Badge[] = [];
    if (allGreen) out.push({ icon: Trophy, title: "Práctica Impecable", subtitle: "Todas las habilidades dominadas" });
    if (greens.length > 0) {
      const first = greens[0]!;
      out.push({ icon: Flame, title: `Dominio: ${first}`, subtitle: greens.length > 1 ? `y ${greens.length - 1} habilidad(es) más en verde` : "Habilidad en verde" });
    }
    if (out.length < 2 && pct >= 75) out.push({ icon: Award, title: "Casi listo para el examen", subtitle: `${pct}% del camino recorrido` });
    if (out.length < 2 && pct >= 50) out.push({ icon: Star, title: "Mitad del camino", subtitle: "Más de la mitad superada" });
    if (out.length === 0) out.push({ icon: TrendingUp, title: "Constancia al volante", subtitle: "Una práctica más completada" });
    return out.slice(0, 2);
  }, [allGreen, greens.join("|"), pct]);

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
      style={{ borderColor: `${accent}40` }}
      className="pointer-events-none fixed top-0 left-0 z-[-50] isolate flex aspect-[9/16] w-[400px] max-w-[400px] min-h-[700px] flex-col gap-4 overflow-hidden rounded-[2.5rem] border bg-gradient-to-b from-zinc-900 to-black p-8 font-sans opacity-0 shadow-2xl"
    >
      <div
        className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: accent }}
      />

      <div className="relative mb-4 flex min-h-16 items-center justify-center">
        {brand.schoolLogo ? (
          <img src={brand.schoolLogo} alt={name} className="h-16 max-w-full object-contain" />
        ) : (
          <h2 className="text-center text-2xl font-bold tracking-widest text-zinc-100 uppercase">{name}</h2>
        )}
      </div>

      <div className={PANEL}>
        <div className={LABEL}>Progreso</div>
        <div className="text-3xl font-bold text-zinc-50">{pct}%</div>
        <div className="mt-3 mb-2 flex justify-between text-[10px] font-medium text-zinc-500">
          {PROGRESS_MARKS.map((mark) => (
            <span key={mark} style={pct >= mark ? { color: accent } : undefined}>{mark}%</span>
          ))}
        </div>
        <div className="h-2.5 w-full rounded-full bg-zinc-800">
          <div className="h-full min-w-[2px] rounded-full" style={{ width: `${pct}%`, backgroundColor: accent }} />
        </div>
      </div>

      <div className={PANEL}>
        <div className="flex items-center gap-4">
          <User className="size-5 shrink-0" style={{ color: accent }} aria-hidden />
          <div className="min-w-0">
            <div className={LABEL}>Nombre del alumno/a</div>
            <div className={`${VALUE} break-words`}>{studentName || "—"}</div>
          </div>
        </div>
      </div>

      <div className={PANEL}>
        <div className="flex items-center gap-4">
          <Clock className="size-5 shrink-0" style={{ color: accent }} aria-hidden />
          <div className="min-w-0">
            <div className={LABEL}>Horario</div>
            <div className={`${VALUE} tabular-nums`}>{hora}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-zinc-400">Fecha: {fecha}</div>
          </div>
        </div>
      </div>

      <div className="mt-auto">
        <div className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-400">
          Logros destacados
        </div>
        <div className="space-y-2">
          {badges.map((b) => (
            <div key={b.title} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 p-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}26` }}>
                <b.icon className="size-5" style={{ color: accent }} aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-zinc-50">{b.title}</div>
                <div className="truncate text-xs text-zinc-400">{b.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
