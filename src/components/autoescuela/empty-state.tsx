import * as React from "react";
import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, text, action }: { icon: LucideIcon; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border px-6 py-10 text-center">
      <Icon className="size-14 text-muted-foreground/30" strokeWidth={1.5} />
      <p className="text-base font-medium text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}
