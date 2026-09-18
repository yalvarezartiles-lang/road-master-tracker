import { AlertTriangle, CheckCircle, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SkillLevel } from "@/lib/autoescuela/types";

export const LEVELS: { key: SkillLevel; label: string }[] = [
  { key: "rojo", label: "Necesita práctica" },
  { key: "amarillo", label: "En progreso" },
  { key: "verde", label: "Dominado" },
];

export const levelClasses: Record<SkillLevel, string> = {
  rojo: "bg-danger text-danger-foreground",
  amarillo: "bg-warning text-warning-foreground",
  verde: "bg-success text-success-foreground",
};

export function LevelIcon({ level, className }: { level: SkillLevel; className?: string }) {
  if (level === "verde") return <CheckCircle className={className} />;
  if (level === "amarillo") return <CircleDot className={className} />;
  return <AlertTriangle className={className} />;
}

export function SkillPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: SkillLevel;
  onChange: (level: SkillLevel) => void;
}) {
  return (
    <div className="rounded-2xl border bg-card p-3">
      <p className="mb-2 text-base font-semibold">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {LEVELS.map((l) => (
          <button
            key={l.key}
            type="button"
            onClick={() => onChange(l.key)}
            aria-pressed={value === l.key}
            aria-label={`${label}: ${l.label}`}
            className={cn(
              "flex h-14 items-center justify-center rounded-xl border-2 border-transparent transition",
              value === l.key
                ? cn(levelClasses[l.key], "border-foreground/30")
                : "bg-muted text-muted-foreground opacity-60",
            )}
          >
            <LevelIcon level={l.key} className="size-6" />
          </button>
        ))}
      </div>
    </div>
  );
}
