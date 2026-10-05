// Cola local de evaluaciones guardadas sin conexión (solo datos de texto, sin imágenes).
const KEY = "pending_evaluations";

export type PendingEvaluation = {
  studentId: string;
  input: { date: string; zone: string; topics: string[]; notes: string; notasProfesor?: string; matricula: string };
};

export function readPending(): PendingEvaluation[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingEvaluation[]) : [];
  } catch {
    return [];
  }
}

export function enqueuePending(item: PendingEvaluation) {
  localStorage.setItem(KEY, JSON.stringify([...readPending(), item]));
}

export function writePending(items: PendingEvaluation[]) {
  if (items.length) localStorage.setItem(KEY, JSON.stringify(items));
  else localStorage.removeItem(KEY);
}

// --- Escrituras genéricas en la agenda (Optimistic UI / zonas sin cobertura) ---
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const WKEY = "pending_writes";
export type PendingWrite =
  | { op: "insert"; values: Record<string, unknown> }
  | { op: "update"; id: string; values: Record<string, unknown> };

function readWrites(): PendingWrite[] {
  try { return JSON.parse(localStorage.getItem(WKEY) ?? "[]") as PendingWrite[]; } catch { return []; }
}
function saveWrites(items: PendingWrite[]) {
  if (items.length) localStorage.setItem(WKEY, JSON.stringify(items));
  else localStorage.removeItem(WKEY);
}

async function run(w: PendingWrite) {
  const q = w.op === "insert"
    ? supabase.from("agenda_diaria").insert(w.values as never)
    : supabase.from("agenda_diaria").update(w.values as never).eq("id", w.id);
  const timeout = new Promise<{ error: { message: string } }>((r) =>
    setTimeout(() => r({ error: { message: "timeout" } }), 8000));
  return (await Promise.race([q, timeout])) as { error: { message: string } | null };
}

const isNetwork = (msg: string) =>
  !navigator.onLine || /timeout|fetch|network|load failed/i.test(msg);

/** Ejecuta la escritura; si no hay red la guarda en local y avisa sin bloquear. */
export async function safeAgendaWrite(w: PendingWrite): Promise<"ok" | "queued" | "error"> {
  let res: { error: { message: string } | null };
  try { res = await run(w); } catch (e) { res = { error: { message: String((e as Error)?.message ?? e) } }; }
  if (!res.error) return "ok";
  if (isNetwork(res.error.message)) {
    saveWrites([...readWrites(), w]);
    toast("Sin conexión. Guardado localmente, se sincronizará luego");
    return "queued";
  }
  return "error";
}

export async function flushAgendaWrites() {
  const items = readWrites();
  if (!items.length) return;
  const failed: PendingWrite[] = [];
  for (const w of items) {
    try { const r = await run(w); if (r.error && isNetwork(r.error.message)) failed.push(w); }
    catch { failed.push(w); }
  }
  saveWrites(failed);
  if (failed.length < items.length) toast.success("Cambios sin conexión sincronizados");
}
