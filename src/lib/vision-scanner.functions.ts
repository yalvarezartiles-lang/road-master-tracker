import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Visión directa con Groq (sin Lovable AI). llama-3.2-11b-vision-preview fue
// retirado por Groq; qwen/qwen3.8-27b es el modelo con visión disponible.
const MODEL = "qwen/qwen3.8-27b";
const PROMPT =
  'La imagen es un cuadrante impreso por ordenador. Prioridad 1: Nombres, exactamente como están impresos. REGLA DE SECCIÓN: Delante del nombre suele aparecer explícitamente un código numérico indicando la sección de la autoescuela (ej: "01", "02", "03", "04", etc.). Si ves cualquier número antes del nombre (ej: "03 Laura Perez"), extrae ese número en el campo seccion como string y deja el campo nombre totalmente limpio (solo "Laura Perez"). Prioridad 2: Horas (HH:MM) y teléfonos (9 dígitos o null). Devuelve ÚNICAMENTE este JSON exacto: {"clases": [{"nombre": "...", "hora": "...", "telefono": "...", "seccion": "03"}]}';

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
    let m: RegExpMatchArray | null = null;
    try {
      const objTxt = raw.match(/\{[\s\S]*\}/)?.[0];
      const obj = objTxt ? (JSON.parse(objTxt) as { clases?: unknown }) : null;
      if (obj && Array.isArray(obj.clases)) m = [JSON.stringify(obj.clases)] as unknown as RegExpMatchArray;
    } catch { /* fallback al array */ }
    if (!m) m = raw.match(/\[[\s\S]*\]/);
    let clases: { nombre: string; hora: string | null; telefono: string | null; seccion: string | null }[] = [];
    try {
      const arr = m ? JSON.parse(m[0]) : [];
      if (Array.isArray(arr)) {
        clases = arr
          .map((x) => {
            const obj = (x ?? {}) as { nombre?: unknown; hora?: unknown; telefono?: unknown; seccion?: unknown };
            let nombre = typeof obj.nombre === "string" ? obj.nombre : "";
            let seccion: string | null = null;
            const rawSec = typeof obj.seccion === "string" || typeof obj.seccion === "number" ? String(obj.seccion).replace(/\D/g, "") : "";
            const pre = nombre.trim().match(/^(\d{1,3})[\s.\-]+(.*)$/);
            if (pre) { nombre = pre[2]!; }
            const sd = rawSec || pre?.[1] || "";
            if (sd) seccion = sd.padStart(2, "0");
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
            return { nombre: nombre.trim(), hora, telefono, seccion };
          })
          .filter((c): c is { nombre: string; hora: string | null; telefono: string | null; seccion: string | null } => c.nombre.length > 0);
      }
    } catch {
      clases = [];
    }
    return { clases };
  });
