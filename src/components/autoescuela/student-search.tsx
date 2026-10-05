import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Search, SearchX } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/autoescuela/store";
import { normalize } from "@/lib/autoescuela/normalize";
import { EmptyState } from "@/components/autoescuela/empty-state";

export function StudentSearch() {
  const { data } = useStore();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const words = normalize(q).split(/\s+/).filter(Boolean);
  const list = data.students.filter((s) => {
    const full = normalize(`${s.name} ${s.apellidos} ${s.dni}`);
    return words.every((w) => full.includes(w));
  });
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-11 rounded-2xl" aria-label="Buscar alumno">
          <Search className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-dvh max-h-dvh w-full max-w-full flex-col gap-4 rounded-none border-0 p-4 pt-6 sm:max-w-full">
        <DialogTitle className="text-2xl font-bold tracking-tight">Buscar alumno</DialogTitle>
        <div className="relative">
          <Search className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, apellidos o DNI…" className="h-14 rounded-2xl pl-12 text-base" />
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {list.length === 0 ? (
            <EmptyState icon={SearchX} text="No se encontraron alumnos" />
          ) : list.map((s) => (
            <Link key={s.id} to="/alumno/$studentId" params={{ studentId: s.id }} onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-2xl border bg-card p-4 transition-all duration-200 active:scale-95">
              <span className="min-w-0 flex-1 truncate text-base font-semibold">{s.name} {s.apellidos}</span>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
