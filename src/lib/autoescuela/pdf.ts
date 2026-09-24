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

export async function exportFichasPdf(student: Pick<Student, "id">): Promise<void> {
  try {
    // 1) Datos del alumno desde la nube
    const { data: st, error: stErr } = await supabase
      .from("students")
      .select("id, name, apellidos, dni")
      .eq("id", student.id)
      .maybeSingle();
    if (stErr) throw new Error(`Error leyendo alumno: ${stErr.message}`);
    if (!st) throw new Error("No se encontró el alumno");

    // 2) Clases del alumno
    const { data: lessons, error: lErr } = await supabase
      .from("lessons")
      .select("id, number, date, hora_inicio, hora_fin, matricula, firma_alumno, firma_profesor, created_by")
      .eq("student_id", student.id)
      .order("number", { ascending: true });
    if (lErr) throw new Error(`Error leyendo clases: ${lErr.message}`);
    if (!lessons || lessons.length === 0) {
      toast.info("No hay clases para exportar");
      return;
    }

    // 3) Profesores cruzados
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

    // 4) Librerías
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
    doc.text(`Alumno: ${st.name ?? ""} ${st.apellidos ?? ""}`.trim(), 14, 23);
    doc.text(`DNI: ${st.dni || "-"}`, 14, 30);

    const sigs = lessons.map((l) => ({
      alumno: validImage(l.firma_alumno),
      profesor: validImage(l.firma_profesor),
    }));

    const rows = lessons.map((l, i) => {
      const p = l.created_by ? profMap.get(l.created_by) : undefined;
      const d = l.date ? new Date(l.date) : null;
      return [
        d && !isNaN(d.getTime()) ? d.toLocaleDateString("es-ES") : "-",
        l.hora_inicio && l.hora_fin ? `${l.hora_inicio} - ${l.hora_fin}` : "-",
        l.matricula || "-",
        p ? `${p.full_name ?? ""} ${p.apellidos ?? ""}\nDNI: ${p.dni || "-"}` : "-",
        sigs[i].alumno ? "" : "Pendiente",
        sigs[i].profesor ? "" : "Pendiente",
      ];
    });

    autoTable(doc, {
      startY: 36,
      head: [["Fecha", "Hora Inicio-Fin", "Matrícula", "Profesor", "Firma Alumno", "Firma Profesor"]],
      body: rows,
      styles: { fontSize: 10, valign: "middle", minCellHeight: 20 },
      headStyles: { fillColor: [30, 64, 175] },
      columnStyles: { 4: { cellWidth: 50 }, 5: { cellWidth: 50 } },
      didDrawCell: (c: any) => {
        if (c.section !== "body" || (c.column.index !== 4 && c.column.index !== 5)) return;
        const s = sigs[c.row.index];
        const img = c.column.index === 4 ? s?.alumno : s?.profesor;
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

    doc.save("fichas_practicas.pdf");
    toast.success("PDF descargado");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Error generando PDF:", e);
    toast.error(`Error al generar el PDF: ${msg}`);
  }
}
