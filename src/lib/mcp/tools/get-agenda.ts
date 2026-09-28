import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_agenda",
  title: "Consultar agenda",
  description: "Consulta las clases de una fecha visibles para el usuario de AutoPilot Progress.",
  inputSchema: {
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Fecha en formato AAAA-MM-DD."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ date }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Debes iniciar sesión en AutoPilot Progress");
    const db = supabaseForUser(ctx);
    const { data, error } = await db
      .from("agenda_diaria")
      .select("id, fecha, hora_inicio, hora_fin, estado, es_examen, student_id, students(name, apellidos, seccion)")
      .eq("fecha", date)
      .order("hora_inicio")
      .limit(100);
    if (error) throw new ToolError(error.message);
    const lessons = (data ?? []).map((lesson) => {
      const student = Array.isArray(lesson.students) ? lesson.students[0] : lesson.students;
      return {
        id: lesson.id,
        fecha: lesson.fecha,
        inicio: lesson.hora_inicio,
        fin: lesson.hora_fin,
        estado: lesson.estado,
        examen: lesson.es_examen,
        alumnoId: lesson.student_id,
        alumno: student ? [student.name, student.apellidos].filter(Boolean).join(" ") : null,
        seccion: student?.seccion ?? null,
      };
    });
    return {
      content: [{ type: "text", text: lessons.length ? `${lessons.length} clase(s) para ${date}.` : `No hay clases para ${date}.` }],
      structuredContent: { date, lessons },
    };
  },
});