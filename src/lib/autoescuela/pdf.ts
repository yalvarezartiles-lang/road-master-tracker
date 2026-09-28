import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Student } from "./types";

const IMG_RE = /^data:image\/(png|jpe?g);base64,[A-Za-z0-9+/=]+$/;

function validImage(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (s.length < 100 || !IMG_RE.test(s)) return null;
  return s;
}

export interface FichaRow {
  key: string;
  fecha: string;
  horas: string;
  matricula: string;
  profesor: string;
  tipo: string;
  observaciones: string;
  alumno: string | null;
  firmaProfesor: string | null;
}

export interface FichaDraft {
  alumno: string;
  dni: string;
  fileBase: string;
  rows: FichaRow[];
}

const safeName = (v: string | null | undefined) =>
  (v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "Alumno";

/** Carga los datos de la ficha como borrador editable. Devuelve null si no hay clases. */
export async function loadFichaDraft(student: Pick<Student, "id">): Promise<FichaDraft | null> {
  const { data: st, error: stErr } = await supabase
    .from("students")
    .select("id, name, apellidos, dni")
    .eq("id", student.id)
    .maybeSingle();
  if (stErr) throw new Error(`Error leyendo alumno: ${stErr.message}`);
  if (!st) throw new Error("No se encontró el alumno");

  const { data: lessons, error: lErr } = await supabase
    .from("lessons")
    .select("id, number, date, hora_inicio, hora_fin, matricula, firma_alumno, firma_alumno_2, firma_profesor, created_by, notes")
    .eq("student_id", student.id)
    .order("number", { ascending: true });
  if (lErr) throw new Error(`Error leyendo clases: ${lErr.message}`);
  if (!lessons || lessons.length === 0) return null;

  const ids = [...new Set(lessons.map((l) => l.created_by).filter(Boolean))] as string[];
  const profMap = new Map<string, { full_name: string; apellidos: string; dni: string }>();
  if (ids.length) {
    const { data: profs, error: pErr } = await supabase
      .from("profiles")
      .select("id, full_name, apellidos, dni")
      .in("id", ids);
    if (pErr) throw new Error(`Error leyendo profesores: ${pErr.message}`);
    for (const p of profs ?? []) profMap.set(p.id, p as any);
  }

  const toMinutes = (value: string) => {
    const [h, m] = value.slice(0, 5).split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const addMinutes = (value: string, amount: number) => {
    const total = (toMinutes(value) + amount) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };

  const rows: FichaRow[] = lessons.flatMap((l) => {
    const p = l.created_by ? profMap.get(l.created_by) : undefined;
    const d = l.date ? new Date(l.date) : null;
    const fecha = d && !isNaN(d.getTime()) ? d.toLocaleDateString("es-ES") : "-";
    const profesor = p ? `${p.full_name ?? ""} ${p.apellidos ?? ""}`.trim() + `\nDNI: ${p.dni || "-"}` : "-";
    const firma1 = validImage(l.firma_alumno);
    const firma2 = validImage(l.firma_alumno_2);
    const firmaProfesor = validImage(l.firma_profesor);
    const base = {
      fecha,
      matricula: l.matricula || "-",
      profesor,
      tipo: "Práctica",
      observaciones: (l.notes ?? "").slice(0, 200),
      firmaProfesor,
    };
    if (!firma2 || !l.hora_inicio) {
      return [{
        ...base,
        key: l.id,
        horas: l.hora_inicio && l.hora_fin ? `${l.hora_inicio.slice(0, 5)} - ${l.hora_fin.slice(0, 5)}` : "-",
        alumno: firma1,
      }];
    }
    const i1 = l.hora_inicio.slice(0, 5);
    const i2 = addMinutes(i1, 45);
    return [
      { ...base, key: `${l.id}-1`, horas: `${i1} - ${i2}`, alumno: firma1 },
      { ...base, key: `${l.id}-2`, horas: `${i2} - ${addMinutes(i2, 45)}`, alumno: firma2 },
    ];
  });

  return {
    alumno: `${st.name ?? ""} ${st.apellidos ?? ""}`.trim(),
    dni: st.dni || "-",
    fileBase: `Ficha_Oficial_Clases_${safeName(st.name)}_${safeName(st.apellidos)}`,
    rows,
  };
}

/** Genera y descarga el PDF oficial a partir del borrador (posiblemente editado). */
export async function renderFichaPdf(draft: FichaDraft): Promise<void> {
  const jspdfMod: any = await import("jspdf");
  const atMod: any = await import("jspdf-autotable");
  const JsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
  const autoTable = atMod.autoTable ?? atMod.default;
  if (typeof JsPDF !== "function") throw new Error("No se pudo cargar jsPDF");
  if (typeof autoTable !== "function") throw new Error("No se pudo cargar jspdf-autotable");

  const doc = new JsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(16);
  doc.text("Ficha de clases prácticas", 14, 15);
  doc.setFontSize(12);
  doc.text(`Alumno: ${draft.alumno}`, 14, 23);
  doc.text(`DNI: ${draft.dni}`, 14, 30);

  const pdfRows = draft.rows;
  autoTable(doc, {
    startY: 36,
    head: [["Fecha", "Hora Inicio-Fin", "Matrícula", "Profesor", "Tipo", "Observaciones", "Firma Alumno", "Firma Profesor"]],
    body: pdfRows.map((r) => [
      r.fecha, r.horas, r.matricula, r.profesor, r.tipo, r.observaciones,
      r.alumno ? "" : "Pendiente", r.firmaProfesor ? "" : "Pendiente",
    ]),
    styles: { fontSize: 9, valign: "middle", minCellHeight: 20 },
    headStyles: { fillColor: [30, 64, 175] },
    columnStyles: { 5: { cellWidth: 45 }, 6: { cellWidth: 40 }, 7: { cellWidth: 40 } },
    didDrawCell: (c: any) => {
      if (c.section !== "body" || (c.column.index !== 6 && c.column.index !== 7)) return;
      const row = pdfRows[c.row.index];
      const img = c.column.index === 6 ? row?.alumno : row?.firmaProfesor;
      if (!img) return;
      try {
        const fmt = img.startsWith("data:image/png") ? "PNG" : "JPEG";
        const props = doc.getImageProperties(img);
        const pad = 1.5;
        const ratio = Math.min((c.cell.width - pad * 2) / props.width, (c.cell.height - pad * 2) / props.height);
        const w = props.width * ratio;
        const h = props.height * ratio;
        doc.addImage(img, fmt, c.cell.x + (c.cell.width - w) / 2, c.cell.y + (c.cell.height - h) / 2, w, h);
      } catch (e) {
        console.warn("Firma no válida, se omite", e);
      }
    },
  });

  doc.save(`${draft.fileBase}.pdf`);
}

export async function exportFichasPdf(student: Pick<Student, "id">): Promise<void> {
  try {
    const draft = await loadFichaDraft(student);
    if (!draft) {
      toast.info("No hay clases para exportar");
      return;
    }
    await renderFichaPdf(draft);
    toast.success("PDF descargado");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    toast.error(`Error al generar el PDF: ${msg}`);
  }
}
