import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Motor de IA: Google Gemini (API REST directa). Sin Lovable AI.
const SYSTEM = `Eres un experto en el Reglamento de la DGT. Si se adjunta un PDF, léelo para basar tus respuestas. REGLA DE RESPUESTA: Haz un resumen muy claro y conversacional. NUNCA leas artículos literales. Ve directo al grano. Recuerda que el profesor es legalmente el conductor y no puede usar pantallas en movimiento: solo con el vehículo inmovilizado. No inventes normas.

REGLA DE ACCIONES (ESTRICTA): Si el usuario te pide abrir, buscar o ir al perfil de un alumno específico, DEBES responder obligatoriamente SOLO con un JSON válido, sin ningún texto adicional antes ni después, con esta estructura exacta:
{"respuesta": "Voy a abrir el perfil de [Nombre]...", "accion": "NAVIGATE_ALUMNO", "nombre_alumno": "[Nombre exacto]"}
Si es una pregunta normal de tráfico o pedagogía, responde con texto normal (nunca JSON).`;

type Input = { message: string; context: string };

type ActionPayload = { respuesta: string; accion: string; nombre_alumno: string };

// Extrae el JSON de acción de una respuesta del modelo.
function parseAction(raw: string): ActionPayload | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[0]) as Record<string, unknown>;
    let inner: unknown = parsed;
    if (parsed["arguments"] !== undefined) inner = parsed["arguments"];
    if (typeof inner === "string") {
      try { inner = JSON.parse(inner); } catch { return null; }
    }
    const a = inner as Record<string, unknown> | null;
    if (a && typeof a["respuesta"] === "string" && typeof a["accion"] === "string" && a["accion"]) {
      return {
        respuesta: a["respuesta"],
        accion: a["accion"],
        nombre_alumno: typeof a["nombre_alumno"] === "string" ? a["nombre_alumno"] : "",
      };
    }
  } catch {
    // JSON inválido: texto normal.
  }
  return null;
}

export const askCopilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: Input) => ({
    message: String(i.message ?? "").slice(0, 2000),
    context: String(i.context ?? "").slice(0, 4000),
  }))
  .handler(async ({ data }) => {
    if (!data.message.trim()) return { ok: false as const, error: "Escribe una pregunta" };

    const { generateGemini, loadReglamentoBase64, GeminiError } = await import("@/lib/gemini.server");
    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [];

    // Base de conocimiento: reglamento subido por el Super Admin.
    const pdf = await loadReglamentoBase64();
    if (pdf) parts.push({ inlineData: { mimeType: "application/pdf", data: pdf } });
    parts.push({
      text: `Contexto de la pantalla actual:\n${data.context || "(sin datos)"}\n\nPregunta del profesor:\n${data.message}`,
    });

    let out = "";
    try {
      out = (await generateGemini({ parts, systemInstruction: SYSTEM }))
        .replace(/\*\*/g, "")
        .replace(/^#+\s*/gm, "")
        .trim();
    } catch (err) {
      const msg = err instanceof GeminiError ? err.message : "El Copiloto no está disponible ahora mismo.";
      return { ok: false as const, error: msg };
    }
    if (!out) return { ok: false as const, error: "El Copiloto no ha devuelto respuesta." };

    // Intercepción de acciones: JSON de navegación estructurado; texto plano como NONE.
    const action = parseAction(out);
    if (action) return { ok: true as const, ...action };
    return { ok: true as const, respuesta: out, accion: "NONE", nombre_alumno: "" };
  });
