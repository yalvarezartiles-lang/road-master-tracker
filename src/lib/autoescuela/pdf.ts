import { supabase } from "@/integrations/supabase/client";
import type { Student } from "./types";

export async function exportFichasPdf(student: Student) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const ids = [...new Set(student.lessons.map((l) => l.profesorId).filter(Boolean))] as string[];
  const { data: profs } = ids.length
    ? await supabase.from("profiles").select("id, full_name, apellidos, dni").in("id", ids)
    : { data: [] as any[] };
  const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(16);
  doc.text("Ficha de clases prácticas", 14, 15);
  doc.setFontSize(12);
  doc.text(`Alumno: ${student.name} ${student.apellidos}`, 14, 23);
  doc.text(`DNI: ${student.dni || "—"}`, 14, 30);

  const lessons = [...student.lessons].sort((a, b) => a.number - b.number);
  const rows = lessons.map((l) => {
    const p: any = l.profesorId ? profMap.get(l.profesorId) : null;
    return [
      new Date(l.date).toLocaleDateString("es-ES"),
      l.horaInicio && l.horaFin ? `${l.horaInicio} - ${l.horaFin}` : "—",
      l.matricula || "—",
      p ? `${p.full_name} ${p.apellidos ?? ""}\nDNI: ${p.dni || "—"}` : "—",
      l.firmaAlumno ? "" : "Pendiente",
      l.firmaProfesor ? "" : "Pendiente",
    ];
  });

  const ROW_H = 20;
  autoTable(doc, {
    startY: 36,
    head: [["Fecha", "Hora Inicio-Fin", "Matrícula", "Profesor", "Firma Alumno", "Firma Profesor"]],
    body: rows,
    styles: { fontSize: 10, valign: "middle", minCellHeight: ROW_H },
    headStyles: { fillColor: [30, 64, 175] },
    columnStyles: { 4: { cellWidth: 50 }, 5: { cellWidth: 50 } },
    didDrawCell: (d) => {
      if (d.section !== "body" || (d.column.index !== 4 && d.column.index !== 5)) return;
      const l = lessons[d.row.index];
      const img = d.column.index === 4 ? l?.firmaAlumno : l?.firmaProfesor;
      if (!img) return;
      // Escala manteniendo proporción (lienzo ~ ancho x 192px)
      const pad = 1.5;
      const maxW = d.cell.width - pad * 2;
      const maxH = d.cell.height - pad * 2;
      const props = doc.getImageProperties(img);
      const ratio = Math.min(maxW / props.width, maxH / props.height);
      const w = props.width * ratio;
      const h = props.height * ratio;
      doc.addImage(img, "PNG", d.cell.x + (d.cell.width - w) / 2, d.cell.y + (d.cell.height - h) / 2, w, h);
    },
  });

  doc.save(`fichas-${student.name}-${student.apellidos}.pdf`.replace(/\s+/g, "_"));
}
