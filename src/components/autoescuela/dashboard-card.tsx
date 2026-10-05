import type { LucideIcon } from "lucide-react";

export const dashboardCardClass =
  "flex aspect-square h-auto w-full min-w-0 flex-col items-center justify-center whitespace-normal rounded-3xl border border-border bg-card p-6 text-foreground shadow-sm transition-all duration-200 hover:bg-card active:scale-95";

/** Contenido idéntico para las 4 tarjetas del inicio (icono, título, subtítulo opcional). */
export function DashboardCardContent({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle?: string }) {
  return (
    <>
      <Icon className="!size-8 shrink-0 text-foreground" strokeWidth={1.5} />
      <span className="mt-4 text-center text-sm font-semibold tracking-tight text-foreground">{title}</span>
      {subtitle && <span className="mt-1 text-xs font-normal text-muted-foreground">{subtitle}</span>}
    </>
  );
}
