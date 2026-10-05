import * as React from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { StudentPicker, addMinutes } from "@/components/autoescuela/cuadrante-builder";
import { safeAgendaWrite } from "@/lib/autoescuela/offline-queue";

const nowHM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function ClaseSuelta({ profesorId, trigger, onSaved }: { profesorId: string; trigger: React.ReactNode; onSaved?: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [students, setStudents] = React.useState<{ id: string; name: string; apellidos: string }[]>([]);
  const [studentId, setStudentId] = React.useState("");
  const [start, setStart] = React.useState("09:00");
  const [duration, setDuration] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setStart(nowHM()); setDuration(null); setStudentId("");
    void supabase.from("students").select("id, name, apellidos").eq("archivado", false).order("name")
      .then(({ data }) => setStudents(data ?? []));
  }, [open]);

  const save = async () => {
    if (!studentId || !start || !duration) { toast.error("Elige alumno, hora y duración"); return; }
    setOpen(false);
    const r = await safeAgendaWrite({
      op: "insert",
      values: { profesor_id: profesorId, fecha: todayISO(), hora_inicio: start, hora_fin: addMinutes(start, duration), student_id: studentId, estado: "completada" },
    });
    if (r === "ok") { toast.success("Clase registrada"); onSaved?.(); }
    else if (r === "error") toast.error("No se pudo registrar la clase");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl p-5">
        <div className="mx-auto w-full max-w-md space-y-4">
          <SheetHeader className="p-0 text-left">
            <SheetTitle className="text-xl font-bold">Clase suelta</SheetTitle>
            <SheetDescription>Apunta una clase imprevista de hoy</SheetDescription>
          </SheetHeader>
          <StudentPicker students={students} value={studentId} onChange={setStudentId} />
          <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="h-14 rounded-2xl text-lg" />
          <div className="grid grid-cols-2 gap-3">
            {[45, 90].map((m) => (
              <Button key={m} type="button" variant={duration === m ? "default" : "outline"} onClick={() => setDuration(m)} className="h-14 rounded-2xl text-base font-bold">
                +{m} min
              </Button>
            ))}
          </div>
          {duration && <p className="text-center text-lg font-semibold">{start} - {addMinutes(start, duration)}</p>}
          <Button onClick={save} className="h-16 w-full rounded-2xl text-lg font-bold">Registrar Clase</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
