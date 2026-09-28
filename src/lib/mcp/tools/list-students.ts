import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_students",
  title: "Listar alumnos",
  description: "Lista los alumnos visibles para el usuario de AutoPilot Progress.",
  inputSchema: {
    search: z.string().trim().max(100).optional().describe("Nombre o apellido opcional para filtrar."),
    includeArchived: z.boolean().optional().describe("Incluye alumnos archivados cuando es true."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, includeArchived }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Debes iniciar sesión en AutoPilot Progress");
    const db = supabaseForUser(ctx);
    let query = db.from("students").select("id, name, apellidos, seccion, archivado").order("name").limit(100);
    if (!includeArchived) query = query.eq("archivado", false);
    if (search) query = query.or(`name.ilike.%${search}%,apellidos.ilike.%${search}%`);
    const { data, error } = await query;
    if (error) throw new ToolError(error.message);
    const students = (data ?? []).map((student) => ({
      id: student.id,
      nombre: [student.name, student.apellidos].filter(Boolean).join(" "),
      seccion: student.seccion,
      archivado: student.archivado,
    }));
    return {
      content: [{ type: "text", text: students.length ? `${students.length} alumno(s) encontrados.` : "No se encontraron alumnos." }],
      structuredContent: { students },
    };
  },
});