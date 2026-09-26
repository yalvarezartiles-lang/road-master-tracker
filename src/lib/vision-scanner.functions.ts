import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Visión directa con Groq (sin Lovable AI). llama-3.2-11b-vision-preview fue
// retirado por Groq; qwen/qwen3.8-27b es el modelo con visión disponible.
const MODEL = "qwen/qwen3.8-27b";
const PROMPT =
  'Extrae los nombres completos (Nombre y Apellidos) de los alumnos de este cuadrante. Devuelve ÚNICAMENTE un array JSON válido de strings, sin texto adicional ni formato markdown. Ejemplo: ["Juan Perez", "Maria Garcia"]';

export const scanRoster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ image: z.string().startsWith("data:image/").max(15_000_000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const key = process.env["GROQ_API_KEY"];
    if (!key) throw new Error("Falta la clave de Groq");
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: data.image } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error("Groq vision", res.status, await res.text());
      throw new Error(res.status === 429 ? "Demasiadas peticiones, espera un momento" : "No se pudo analizar la imagen");
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const m = raw.match(/\[[\s\S]*\]/);
    let nombres: string[] = [];
    try {
      const arr = m ? JSON.parse(m[0]) : [];
      if (Array.isArray(arr)) nombres = arr.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim());
    } catch {
      nombres = [];
    }
    return { nombres };
  });
