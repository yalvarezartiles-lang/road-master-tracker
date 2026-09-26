import * as React from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useServerFn } from "@tanstack/react-start";
import { scanRoster } from "@/lib/vision-scanner.functions";

const toBase64 = (file: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("No se pudo leer la imagen"));
    r.readAsDataURL(file);
  });

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addMin = (t: string, m: number) => {
  const [h, mm] = t.split(":").map(Number);
  const tot = h! * 60 + mm! + m;
  return `${String(Math.floor(tot / 60) % 24).padStart(2, "0")}:${String(tot % 60).padStart(2, "0")}`;
};
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

async function syncRoster(profesorId: string, nombres: string[]) {
  const { data: p } = await supabase.from("profiles").select("autoescuela_id, seccion").eq("id", profesorId).maybeSingle();
  const autoescuelaId = p?.autoescuela_id ?? null;
  const seccion = p?.seccion ?? "";
  let found = 0, created = 0;
  const ids: string[] = [];

  for (const full of nombres) {
    const [first, ...rest] = full.trim().split(/\s+/);
    const apellidos = rest.join(" ");
    let q = supabase.from("students").select("id, name, apellidos").eq("archivado", false).ilike("name", `%${first}%`);
    if (autoescuelaId) q = q.eq("autoescuela_id", autoescuelaId);
    if (seccion) q = q.eq("seccion", seccion);
    const { data: cands } = await q;
    const match = (cands ?? []).find((c) => norm(`${c.name} ${c.apellidos}`) === norm(full))
      ?? (cands ?? []).find((c) => norm(`${c.name} ${c.apellidos}`).includes(norm(full)) || norm(full).includes(norm(`${c.name} ${c.apellidos}`)));
    if (match) { ids.push(match.id); found++; continue; }
    const { data: ins, error } = await supabase
      .from("students")
      .insert({ name: first!, apellidos, seccion, archivado: false, ...(autoescuelaId ? { autoescuela_id: autoescuelaId } : {}) })
      .select("id").single();
    if (error || !ins) throw new Error(`No se pudo crear a ${full}`);
    ids.push(ins.id); created++;
  }

  const fecha = toISO(new Date());
  const { data: existing } = await supabase.from("agenda_diaria").select("student_id, hora_fin")
    .eq("profesor_id", profesorId).eq("fecha", fecha).order("hora_fin");
  const already = new Set((existing ?? []).map((e) => e.student_id));
  let start = existing?.length ? existing[existing.length - 1]!.hora_fin.slice(0, 5) : "09:00";
  const rows = ids.filter((id) => !already.has(id)).map((student_id) => {
    const row = { profesor_id: profesorId, fecha, hora_inicio: start, hora_fin: addMin(start, 45), student_id };
    start = row.hora_fin;
    return row;
  });
  if (rows.length) {
    const { error } = await supabase.from("agenda_diaria").insert(rows);
    if (error) throw new Error("Alumnos listos, pero no tienes permiso para editar la agenda");
  }
  return { found, created };
}

export function ScanRosterButton({ profesorId, onDone }: { profesorId: string; onDone?: () => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const scan = useServerFn(scanRoster);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      e.target.value = "";
      return;
    }
    setBusy(true);
    const loadingId = toast.loading("Analizando cuadrante...");
    try {
      const image = await toBase64(file);
      const data = await scan({ data: { image } });
      const nombres = data.nombres;
      if (!nombres.length) throw new Error("No se detectaron nombres en la imagen");
      const { found, created } = await syncRoster(profesorId, nombres);
      toast.success(`Agenda actualizada: ${found} alumno(s) existentes añadidos y ${created} alumno(s) nuevos creados.`, { id: loadingId });
      onDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo procesar el cuadrante", { id: loadingId });
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg, image/png, image/jpg"
        className="hidden"
        onChange={onFile}
      />
      <Button variant="outline" onClick={() => setConfirmOpen(true)} disabled={busy}
        className="h-18 shrink-0 rounded-3xl border-2 border-primary px-4 text-base font-bold text-primary">
        <Camera className="size-6" /> Escanear Cuadrante 📸
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">¿Quieres escanear el cuadrante desde tu cámara o galería?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Selecciona una imagen y detectaremos los alumnos para añadirlos a tu agenda de hoy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-3 sm:flex-row">
            <AlertDialogCancel className="h-14 rounded-2xl text-base font-semibold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="h-14 rounded-2xl text-base font-bold"
              onClick={(ev) => {
                ev.preventDefault();
                setConfirmOpen(false);
                inputRef.current?.click();
              }}
            >
              Seleccionar Imagen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={busy}>
        <DialogContent className="rounded-3xl [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Loader2 className="size-6 animate-spin text-primary" /> Analizando cuadrante con IA...</DialogTitle>
            <DialogDescription>Detectando alumnos y actualizando tu agenda de hoy.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
