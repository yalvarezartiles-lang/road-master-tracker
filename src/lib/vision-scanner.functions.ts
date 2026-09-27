import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Visión directa con Groq (sin Lovable AI). llama-3.2-11b-vision-preview fue
// retirado por Groq; qwen/qwen3.8-27b es el modelo con visión disponible.
const MODEL = "qwen/qwen3.8-27b";
const PROMPT =
  'Extrae los nombres completos (Nombre y Apellidos), la HORA de la clase, y el TELÉFONO (si aparece) de los alumnos en este cuadrante. Devuelve ÚNICAMENTE un array JSON válido de objetos, sin texto adicional. Formato estricto: [{"nombre": "Juan Perez", "hora": "10:30", "telefono": "600123456"}]. Si un alumno no tiene teléfono visible, devuelve "telefono": null.';

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
    let clases: { nombre: string; hora: string | null; telefono: string | null }[] = [];
    try {
      const arr = m ? JSON.parse(m[0]) : [];
      if (Array.isArray(arr)) {
        clases = arr
          .map((x) => {
            const obj = (x ?? {}) as { nombre?: unknown; hora?: unknown; telefono?: unknown };
            const nombre = typeof obj.nombre === "string" ? obj.nombre : "";
            const rawHora = typeof obj.hora === "string" ? obj.hora : "";
            const hm = rawHora.match(/(\d{1,2})[:.h](\d{2})?/);
            let hora: string | null = null;
            if (hm) {
              const h = Number(hm[1]);
              const min = hm[2] ? Number(hm[2]) : 0;
              if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
                hora = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
              }
            }
            const rawTel = typeof obj.telefono === "string" || typeof obj.telefono === "number" ? String(obj.telefono) : "";
            const digits = rawTel.replace(/[^\d+]/g, "");
            const telefono = digits.replace(/\D/g, "").length >= 9 ? digits : null;
            return { nombre: nombre.trim(), hora, telefono };
          })
          .filter((c): c is { nombre: string; hora: string | null; telefono: string | null } => c.nombre.length > 0);
      }
    } catch {
      clases = [];
    }
    return { clases };
  });
