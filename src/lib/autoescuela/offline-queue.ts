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
