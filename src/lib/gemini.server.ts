// Conexión directa a la API REST de Google Gemini. Sin Lovable AI.
// Motor de IA único y exclusivo de la plataforma.
// gemini-1.5-flash y gemini-2.5-flash ya no se sirven a cuentas nuevas; la API
// indica gemini-3.8-flash como sustituto (soporta imagen y PDF).
export const GEMINI_MODEL = "gemini-3.8-flash";

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export class GeminiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function friendly(status: number): string {
  if (status === 429) return "Demasiadas peticiones seguidas. Espera un momento.";
  if (status === 401 || status === 403) return "La clave de Gemini no es válida.";
  return "El servicio de IA no está disponible ahora mismo.";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Llama a Gemini y devuelve el texto plano generado. Reintenta ante 503/429 pasajeros. */
export async function generateGemini(opts: {
  parts: GeminiPart[];
  systemInstruction?: string;
}): Promise<string> {
  const MAX_ATTEMPTS = 3;
  const key = process.env["GEMINI_API_KEY"];
  // Limpieza estricta: nunca enviar el prefijo data:...;base64,
  opts.parts = opts.parts.map((p) =>
    "inlineData" in p
      ? { inlineData: { mimeType: p.inlineData.mimeType, data: p.inlineData.data.replace(/^data:(.*,)?/, "").replace(/\s/g, "") } }
      : p,
  );
  if (!key) throw new GeminiError(500, "Falta la clave de Gemini");

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: opts.parts }],
    generationConfig: { temperature: 0.2 },
  };
  if (opts.systemInstruction) {
    body["systemInstruction"] = { parts: [{ text: opts.systemInstruction }] };
  }

  // Anti-503: la demanda alta de Google es pasajera; reintentamos con espera.
  let lastError: GeminiError | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
    } catch (e) {
      throw new GeminiError(503, `Error de red con Gemini: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("gemini error", res.status, detail.slice(0, 500));
      let msg = detail;
      try { msg = (JSON.parse(detail) as { error?: { message?: string } }).error?.message ?? detail; } catch { /* texto */ }
      lastError = new GeminiError(res.status, `Error ${res.status}: ${(msg || friendly(res.status)).slice(0, 300)}`);
      // Solo se reintenta ante saturación o límite de ritmo; el resto de errores se muestran tal cual.
      if (res.status === 503 || res.status === 429) {
        if (attempt < MAX_ATTEMPTS) {
          await sleep(1200 * attempt);
          continue;
        }
      }
      throw lastError;
    }

    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    if (!json.candidates?.length) console.error("gemini sin candidatos", JSON.stringify(json).slice(0, 500));
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    return parts
      .map((p) => p.text ?? "")
      .join("")
      .trim();
  }
  throw lastError ?? new GeminiError(503, "El servicio de IA no está disponible ahora mismo.");
}

/** Conversión nativa (Web APIs, sin Buffer de Node). */
export function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Descarga el reglamento PDF del Super Admin (si existe) en Base64. */
export async function loadReglamentoBase64(): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.storage
      .from("documentos-legales")
      .download("reglamento.pdf");
    if (error || !data) {
      console.error("reglamento.pdf no disponible, se continúa sin PDF:", error?.message);
      return null;
    }
    return arrayBufferToBase64(await data.arrayBuffer());
  } catch (e) {
    console.error("Fallo al descargar reglamento.pdf, se continúa sin PDF:", e);
    return null;
  }
}
