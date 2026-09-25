import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Conexión directa a Groq (API compatible con OpenAI). Sin Lovable AI.
const SYSTEM = `Eres un Copiloto IA experto en el Reglamento General de Circulación de España (DGT) y en pedagogía vial. Responde de forma muy breve y directa.

REGLA DE ACCIONES (ESTRICTA): Si el usuario te pide abrir, buscar o ir al perfil de un alumno específico, DEBES responder obligatoriamente SOLO con un JSON válido, sin ningún texto adicional antes ni después, con esta estructura exacta:
{"respuesta": "Voy a abrir el perfil de [Nombre]...", "accion": "NAVIGATE_ALUMNO", "nombre_alumno": "[Nombre exacto]"}
Si es una pregunta normal de tráfico o pedagogía, responde con texto normal (nunca JSON).`;
// llama3-8b-8192 fue retirado por Groq; sustituto rápido disponible en la cuenta.
const MODEL = "openai/gpt-oss-20b";

type Input = { message: string; context: string };

type ActionPayload = { respuesta: string; accion: string; nombre_alumno: string };

// Extrae el JSON de acción de una respuesta del modelo. gpt-oss a veces lo
// emite envuelto como llamada a herramienta ({"name","arguments"}), también
// válido: se desenvuelve igualmente.
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
    const key = process.env["GROQ_API_KEY"];
    if (!key) return { ok: false as const, error: "Falta la clave de Groq" };

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `Contexto de la pantalla actual:\n${data.context || "(sin datos)"}\n\nPregunta del profesor:\n${data.message}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("groq error", res.status, t);
      if (res.status === 429) return { ok: false as const, error: "Demasiadas preguntas seguidas. Espera un momento." };
      if (res.status === 401) return { ok: false as const, error: "La clave de Groq no es válida." };
      return { ok: false as const, error: "El Copiloto no está disponible ahora mismo." };
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const out = (json.choices?.[0]?.message?.content ?? "")
      .replace(/\*\*/g, "")
      .replace(/^#+\s*/gm, "")
      .trim();
    if (!out) return { ok: false as const, error: "El Copiloto no ha devuelto respuesta." };

    // Intercepción de acciones: si Groq respondió con JSON de navegación, se
    // extrae y se devuelve estructurado; texto plano se envuelve como NONE.
    const m = out.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const parsed = JSON.parse(m[0]) as { respuesta?: unknown; accion?: unknown; nombre_alumno?: unknown };
        if (typeof parsed.respuesta === "string" && typeof parsed.accion === "string" && parsed.accion) {
          return {
            ok: true as const,
            respuesta: parsed.respuesta,
            accion: parsed.accion,
            nombre_alumno: typeof parsed.nombre_alumno === "string" ? parsed.nombre_alumno : "",
          };
        }
      } catch {
        // JSON inválido: se trata como texto normal.
      }
    }
    return { ok: true as const, respuesta: out, accion: "NONE", nombre_alumno: "" };
  });
