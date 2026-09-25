import * as React from "react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/autoescuela/store";
import { toDbLevel } from "@/lib/autoescuela/types";

/**
 * Ticket de Progreso: SIEMPRE montado en el DOM, fuera de la vista, para que
 * html-to-image pueda capturarlo (nunca display:none ni montaje condicional).
 * 100% efímero: nunca se envía al servidor.
 */
export const ProgressTicketCard = React.forwardRef<
  HTMLDivElement,
  { school: string; studentName: string; studentId?: string | undefined; greens: string[] }
>(function ProgressTicketCard({ school, studentName, studentId, greens }, ref) {
  const { data } = useStore();
  const student = data.students.find((s) => s.id === studentId);

  // Misma lógica y estado reactivo que la barra de progreso del perfil del
  // alumno (SkillProgressBanner): rojo=0, amarillo=1, verde=2.
  const total = data.skills.length;
  const points = student
    ? data.skills.reduce((acc, k) => acc + toDbLevel(student.skills[k.id] ?? "rojo"), 0)
    : 0;
  const pct = total ? Math.round((points / (total * 2)) * 100) : 0;
  const apto = total > 0 && points === total * 2;

  const date = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      ref={ref}
      aria-hidden
      className="fixed top-0 left-0 w-[400px] h-fit min-h-[600px] bg-white opacity-0 pointer-events-none z-[-50] overflow-hidden p-6 rounded-3xl shadow-xl"
    >
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {school || "Autoescuela"}
        </div>
        <div className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600">Ticket de progreso</div>
      </div>
      <div className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-slate-900">
        {studentName || "\u2014"}
      </div>
      <div className="mt-1 text-[15px] capitalize text-slate-500">{date}</div>

      {/* Barra de progreso clonada del perfil del alumno */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-sm font-extrabold">
          <span className={apto ? "text-green-600" : "text-slate-900"}>
            {apto ? "\u00A1Apto para Examen Oficial!" : "Progreso general"}
          </span>
          <span className="tabular-nums text-slate-500">{pct}%</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn("h-full rounded-full transition-all", apto ? "bg-green-500" : "bg-blue-500")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-5 text-[15px] font-bold text-slate-900">
        Habilidades dominadas {"\u00B7"} <span className="text-green-600">{greens.length}</span>
      </div>
      {greens.length ? (
        <div className="grid grid-cols-2 gap-3 mt-6">
          {greens.map((g) => (
            <div
              key={g}
              className="flex items-center gap-2 rounded-2xl border border-green-100 bg-green-50 px-3 py-2.5 text-[15px] font-semibold leading-snug text-slate-900"
            >
              <span className="flex size-5 flex-none items-center justify-center rounded-full bg-green-500 text-xs text-white">
                {"\u2713"}
              </span>
              <span>{g}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-base text-slate-500">
          {"Seguimos trabajando para conseguir tus primeros verdes \u{1F4AA}"}
        </div>
      )}
      <div className="mt-6 text-center text-sm text-slate-500">{"\u00A1Sigue as\u00ED! \u{1F697}"}</div>
    </div>
  );
});
