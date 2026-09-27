import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Visión directa con Groq (sin Lovable AI). llama-3.2-11b-vision-preview fue
// retirado por Groq; qwen/qwen3.8-27b es el modelo con visión disponible.
const MODEL = "qwen/qwen3.8-27b";
const PROMPT =
  'La imagen es un cuadrante impreso por ordenador. Prioridad absoluta 1: Extrae los NOMBRES con precisión milimétrica, exactamente como están impresos, sin cambiar ni una letra. Prioridad 2: Extrae la FECHA GLOBAL a la que corresponde el cuadrante (devuélvela en formato YYYY-MM-DD). Prioridad 3: Extrae hora (HH:MM) y teléfono (elimina espacios y guiones; exactamente 9 dígitos empezando por 6 o 7, o null). Devuelve ÚNICAMENTE este JSON exacto, sin texto adicional: {"fecha": "2026-10-15", "clases": [{"nombre": "...", "hora": "...", "telefono": "..."}]}. Si no ves fecha, devuelve "fecha": null.';

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
    let fecha: string | null = null;
    let m: RegExpMatchArray | null = null;
    try {
      const objTxt = raw.match(/\{[\s\S]*\}/)?.[0];
      const obj = objTxt ? (JSON.parse(objTxt) as { fecha?: unknown; clases?: unknown }) : null;
      if (obj && typeof obj.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(obj.fecha) && !Number.isNaN(Date.parse(obj.fecha))) fecha = obj.fecha;
      if (obj && Array.isArray(obj.clases)) m = [JSON.stringify(obj.clases)] as unknown as RegExpMatchArray;
    } catch { /* fallback al array */ }
    if (!m) m = raw.match(/\[[\s\S]*\]/);
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
            let digits = rawTel.replace(/\D/g, "");
            if (digits.length === 11 && digits.startsWith("34")) digits = digits.slice(2);
            const telefono = /^[67]\d{8}$/.test(digits) ? digits : null;
            return { nombre: nombre.trim(), hora, telefono };
          })
          .filter((c): c is { nombre: string; hora: string | null; telefono: string | null } => c.nombre.length > 0);
      }
    } catch {
      clases = [];
    }
    return { fecha, clases };
  });
