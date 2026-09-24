import * as React from "react";
import { CalendarDays, CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  student_id: string | null;
  alumno: { nombre: string; telefono: string } | null;
  realizada: boolean;
}

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function TodayClassesSheet({ currentStudentId }: { currentStudentId: string }) {
  const [open, setOpen] = React.useState(false);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setLoading(false);
      const { data: a, error } = await supabase
        .from("agenda_diaria")
        .select("id, hora_inicio, hora_fin, estado, student_id")
        .eq("profesor_id", u.user.id)
        .eq("fecha", toISO(new Date()))
        .order("hora_inicio");
      if (error) toast.error("No se pudo cargar la agenda");
      const ids = [...new Set((a ?? []).map((x) => x.student_id).filter(Boolean))] as string[];
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(startOfToday);
      endOfToday.setDate(endOfToday.getDate() + 1);
      const [{ data: s }, { data: lessons }] = await Promise.all([
        ids.length
          ? supabase.from("students").select("id, name, apellidos, phone").in("id", ids)
          : Promise.resolve({ data: [] as { id: string; name: string; apellidos: string; phone: string }[] }),
        ids.length
          ? supabase
              .from("lessons")
              .select("student_id")
              .eq("created_by", u.user.id)
              .in("student_id", ids)
              .gte("date", startOfToday.toISOString())
              .lt("date", endOfToday.toISOString())
          : Promise.resolve({ data: [] as { student_id: string }[] }),
      ]);
      const completedStudentIds = new Set((lessons ?? []).map((lesson) => lesson.student_id));
      if (!alive) return;
      setRows(
        (a ?? []).map((x) => {
          const st = s?.find((y) => y.id === x.student_id);
          return {
            ...x,
            alumno: st ? { nombre: [st.name, st.apellidos].filter(Boolean).join(" "), telefono: st.phone ?? "" } : null,
            realizada: x.estado === "completada" || (!!x.student_id && completedStudentIds.has(x.student_id)),
          };
        }),
      );
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="size-12 rounded-2xl" aria-label="Resto de clases de hoy">
          <CalendarDays className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[90vw] max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">Resto de clases de hoy</SheetTitle>
        </SheetHeader>
        <ul className="mt-4 space-y-2 px-4 pb-4">
          {loading && (
            <li className="flex justify-center p-4">
              <Loader2 className="size-6 animate-spin" />
            </li>
          )}
          {!loading && rows.length === 0 && (
            <li className="rounded-2xl border border-dashed p-5 text-center text-muted-foreground">
              No tienes clases hoy.
            </li>
          )}
          {!loading &&
            rows.map((r) => {
              const alumno = r.alumno;
              const current = r.student_id === currentStudentId;
              const cancelled = r.estado === "cancelada";
              const completed = r.realizada;
              return (
                <li
                  key={r.id}
                  className={cn(
                    "flex min-h-16 items-center gap-3 rounded-2xl border p-3 transition-colors",
                    completed && "bg-success/10 opacity-60",
                    current && !completed && "border-2 border-primary bg-primary/10",
                    cancelled && "opacity-60",
                  )}
                >
                  <span className="text-base font-bold tabular-nums">{r.hora_inicio.slice(0, 5)}</span>
                  <span className="min-w-0 flex-1 truncate text-base font-semibold">
                    {alumno?.nombre ?? "Hueco libre"}
                    {current && !completed && <span className="block text-xs font-bold text-primary">Evaluando ahora</span>}
                    {completed && (
                      <span className="mt-0.5 flex items-center gap-1 text-xs font-bold text-success">
                        <CheckCircle2 className="size-4" /> Realizada
                      </span>
                    )}
                  </span>
                  {alumno && (
                    <Button
                      type="button"
                      size="icon"
                      aria-label={`WhatsApp a ${alumno.nombre}`}
                      className="size-12 shrink-0 rounded-2xl bg-success text-success-foreground hover:bg-success/90 active:scale-95"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!alumno.telefono) {
                          toast.error("El alumno no tiene teléfono registrado");
                          return;
                        }
                        const cleanPhone = alumno.telefono.replace(/\D/g, "");
                        window.open(`https://wa.me/34${cleanPhone}`, "_blank", "noopener,noreferrer");
                      }}
                    >
                      <MessageCircle className="size-6" />
                    </Button>
                  )}
                </li>
              );
            })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
