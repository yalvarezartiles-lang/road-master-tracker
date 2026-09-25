import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SYSTEM =
  "Eres un Copiloto IA experto en el Reglamento General de Circulación de España (DGT) y en pedagogía vial. Tu objetivo es ayudar a los profesores de autoescuela. Responde siempre de forma muy breve, directa y profesional. Si te preguntan por normas, básate estrictamente en la DGT de España. Si te pasan datos del semáforo de un alumno, sugiere una ruta o ejercicio concreto.";

type Input = { message: string; context: string };

export const askCopilot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: Input) => ({
    message: String(i.message ?? "").slice(0, 2000),
    context: String(i.context ?? "").slice(0, 4000),
  }))
  .handler(async ({ data }) => {
    if (!data.message.trim()) return { ok: false as const, error: "Escribe una pregunta" };
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false as const, error: "La IA no está configurada" };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions: SYSTEM,
        input: [
          {
            role: "user",
            content: `Contexto de la pantalla actual:\n${data.context || "(sin datos)"}\n\nPregunta del profesor:\n${data.message}`,
          },
        ],
      }),
    });

    if (!res.ok || !res.body) {
      if (res.status === 429) return { ok: false as const, error: "Demasiadas preguntas seguidas. Espera un momento." };
      if (res.status === 402) return { ok: false as const, error: "Se han agotado los créditos de IA." };
      const t = await res.text().catch(() => "");
      console.error("copilot error", res.status, t);
      return { ok: false as const, error: "El Copiloto no está disponible ahora mismo." };
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let out = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload);
          if (ev.type === "response.output_text.delta") out += ev.delta ?? "";
          if (ev.type === "error" || ev.type === "response.failed")
            return { ok: false as const, error: "El Copiloto no pudo responder." };
        } catch {
          /* ignore partial */
        }
      }
    }
    out = out.replace(/\*\*/g, "").replace(/^#+\s*/gm, "").trim();
    if (!out) return { ok: false as const, error: "El Copiloto no ha devuelto respuesta." };
    return { ok: true as const, text: out };
  });
