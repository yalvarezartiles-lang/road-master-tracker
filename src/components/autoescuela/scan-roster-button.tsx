import * as React from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
    r.onerror = () => rej(new Error("No se pudo leer el archivo"));
    r.readAsDataURL(file);
  });

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addMin = (t: string, m: number) => {
  const [h, mm] = t.split(":").map(Number);
  const tot = (h ?? 0) * 60 + (mm ?? 0) + m;
  return `${String(Math.floor(tot / 60) % 24).padStart(2, "0")}:${String(tot % 60).padStart(2, "0")}`;
};
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const DEFAULT_HORA = "00:00";

const toMin = (t: string | null) => {
  if (!t) return Number.POSITIVE_INFINITY;
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

type ClaseAgrupada = { nombre: string; hora: string | null; telefono: string | null; apariciones: number; duracion: number };

/** Agrupa cada alumno desde su primera hora y suma 45 minutos por aparición. */
function mergeClases(clases: RawClase[]): ClaseAgrupada[] {
  const map = clases.reduce<Map<string, ClaseAgrupada>>((acc, c) => {
    const key = norm(c.nombre);
    const prev = acc.get(key);
    if (!prev) {
      acc.set(key, { nombre: c.nombre, hora: c.hora, telefono: c.telefono ?? null, apariciones: 1, duracion: 45 });
    } else {
      prev.apariciones += 1;
      if (!prev.telefono && c.telefono) prev.telefono = c.telefono;
      prev.duracion = prev.apariciones * 45;
      if (toMin(c.hora) < toMin(prev.hora)) prev.hora = c.hora;
    }
    return acc;
  }, new Map());
  return [...map.values()];
}

/** Minúsculas, sin tildes, sin signos y espacios simples. */
const normName = (s: string) => norm(s).replace(/[^a-z0-9ñ\s]/g, " ").replace(/\s+/g, " ").trim();

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length]!;
}
const similarity = (a: string, b: string) => 1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);

type PoolItem = { id: string; name: string; apellidos: string; phone: string | null; n: string };
/** Devuelve el alumno más parecido si supera el 75% o coinciden nombre y primer apellido. */
function findBestMatch(scanned: string, pool: PoolItem[]): PoolItem | null {
  const [sf, sa] = scanned.split(" ");
  let best: PoolItem | null = null;
  let bestScore = 0;
  for (const a of pool) {
    const [af, aa] = a.n.split(" ");
    const sameKey = !!sf && !!sa && sf === af && sa === aa;
    const score = sameKey ? 1 : similarity(scanned, a.n);
    if (score > bestScore) { bestScore = score; best = a; }
  }
  return best && bestScore > 0.75 ? best : null;
}

type RawClase = { nombre: string; hora: string | null; telefono?: string | null; seccion?: string | null };

async function syncRoster(profesorId: string, fechaDoc: string | null, rawClases: RawClase[]) {
  const secPorNombre = new Map<string, string>();
  for (const c of rawClases) if (c.seccion && !secPorNombre.has(norm(c.nombre))) secPorNombre.set(norm(c.nombre), c.seccion);
  const clases = mergeClases(rawClases);
  const { data: p } = await supabase.from("profiles").select("autoescuela_id, seccion").eq("id", profesorId).maybeSingle();
  const autoescuelaId = p?.autoescuela_id ?? null;
  let found = 0, created = 0, sinHora = 0;
  const dobles = clases.filter((c) => c.duracion >= 90).length;
  const entradas: { id: string; hora: string | null; duracion: number }[] = [];

  // Todos los alumnos activos de la autoescuela (cualquier sección) para el fuzzy matching.
  let q = supabase.from("students").select("id, name, apellidos, phone, seccion").eq("archivado", false);
  if (autoescuelaId) q = q.eq("autoescuela_id", autoescuelaId);
  const { data: todosLosAlumnos } = await q;
  const pool = (todosLosAlumnos ?? []).map((a) => ({ ...a, n: normName(`${a.name} ${a.apellidos}`) }));
  // Sección por defecto silenciosa: la del profesor, la primera existente o "01".
  const secciones = [...new Set((todosLosAlumnos ?? []).map((a) => a.seccion).filter(Boolean))].sort();
  const seccionDefecto = (p?.seccion ?? "").trim() || secciones[0] || "01";

  for (const clase of clases) {
    const full = clase.nombre;
    const hora = clase.hora;
    if (!hora) sinHora++;
    const [first, ...rest] = full.trim().split(/\s+/);
    const apellidos = rest.join(" ");
    const match = findBestMatch(normName(full), pool);
    if (match) {
      // Alumno existente: se ignora el teléfono de la IA; la agenda usa el de la base de datos.
      entradas.push({ id: match.id, hora, duracion: clase.duracion }); found++; continue;
    }
    const seccion = secPorNombre.get(norm(full)) || seccionDefecto;
    const numeroLimpio = clase.telefono?.replace(/\D/g, "") ?? "";
    const telefono = /^[67]\d{8}$/.test(numeroLimpio) ? numeroLimpio : null;
    const { data: ins, error } = await supabase
      .from("students")
      .insert({ name: first ?? full, apellidos, seccion, archivado: false, ...(telefono ? { phone: telefono } : {}), ...(autoescuelaId ? { autoescuela_id: autoescuelaId } : {}) })
      .select("id").single();
    if (error || !ins) throw new Error(`No se pudo crear a ${full}`);
    pool.push({ id: ins.id, name: first ?? full, apellidos, phone: telefono ?? "", seccion, n: normName(full) });
    entradas.push({ id: ins.id, hora, duracion: clase.duracion }); created++;
  }

  const fecha = fechaDoc ?? toISO(new Date());
  const { data: existing } = await supabase.from("agenda_diaria").select("student_id, hora_fin")
    .eq("profesor_id", profesorId).eq("fecha", fecha).order("hora_fin");
  const already = new Set((existing ?? []).map((e) => e.student_id));
  const rows = entradas
    .filter((e) => !already.has(e.id))
    .map((e) => {
      const hora_inicio = e.hora ?? DEFAULT_HORA;
      return { profesor_id: profesorId, fecha, hora_inicio, hora_fin: addMin(hora_inicio, e.duracion), student_id: e.id };
    });
  if (rows.length) {
    const { error } = await supabase.from("agenda_diaria").insert(rows);
    if (error) throw new Error("Alumnos listos, pero no tienes permiso para editar la agenda");
  }
  return { found, created, sinHora, dobles, fecha };
}

export function ScanRosterButton({ profesorId, onDone }: { profesorId: string; fecha?: string | null; onDone?: () => void }) {
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
      const dataUrl = await toBase64(file);
      const data = await scan({ data: { file: dataUrl } });
      const clases = data.clases;
      if (!clases.length) throw new Error("No se detectaron alumnos en el cuadrante");
      const { found, created, sinHora, dobles, fecha } = await syncRoster(profesorId, data.fecha_cuadrante ?? null, clases);
      toast.success(
        `Agenda del ${fecha.split("-").reverse().join("/")} actualizada: ${found} alumno(s) existentes añadidos y ${created} alumno(s) nuevos creados.${dobles ? ` ${dobles} clase(s) doble(s) de 90 min agrupadas.` : ""}${sinHora ? ` ${sinHora} sin hora detectada (guardados a las ${DEFAULT_HORA}).` : ""}`,
        { id: loadingId },
      );
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
        accept="image/*, application/pdf"
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
              Sacar foto, seleccionar de galería o escoger archivo (PDF)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={busy}>
        <DialogContent className="rounded-3xl [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Loader2 className="size-6 animate-spin text-primary" /> Analizando cuadrante con IA...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
