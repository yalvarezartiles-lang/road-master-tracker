import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Visión directa con Google Gemini (API REST). Sin Lovable AI.
const PROMPT =
  'La imagen es un cuadrante impreso por ordenador. INSTRUCCIÓN PRIORITARIA: Busca en la cabecera o en el texto del documento la fecha a la que corresponde este cuadrante. Devuélvela en un campo llamado fecha_cuadrante a nivel raíz del JSON en formato \'YYYY-MM-DD\'. Si no puedes determinar la fecha con un 100% de seguridad, devuelve null. REGLA DE EXCLUSIÓN CRÍTICA: Ignora por completo cualquier hueco que diga "Libre", "Descanso", "Teórica", "Examen", "Desayuno", "Comida" o similares. SOLO extrae nombres propios de personas. Si no es una persona real, ignóralo. Prioridad 1: Nombres, exactamente como están impresos. Prioridad 2: Sección (extrae el código numérico como "01" o "02" si está delante del nombre, en el campo seccion como string, y deja el nombre limpio: "03 Laura Perez" → nombre "Laura Perez", seccion "03"). Prioridad 3: Teléfono. REGLA ESTRICTA PARA EL TELÉFONO: Funciona como un OCR tradicional. Cópialo dígito a dígito exactamente como está impreso. NO intentes adivinar. Si un solo número está borroso, devuelve null. Extrae también la hora de cada clase (HH:MM). Devuelve ÚNICAMENTE este JSON exacto: {"fecha_cuadrante": "2026-09-28", "clases": [{"nombre": "...", "hora": "...", "telefono": "...", "seccion": "03"}]}';

// Palabras que nunca son alumnos, por si el modelo las cuela igualmente.
const EXCLUIDOS = /^(libre|descanso|teorica|teórica|examen|desayuno|comida|almuerzo|vacio|vacío|reservado|no\s*disponible|practica\s*libre)$/i;

export const scanRoster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ image: z.string().startsWith("data:image/").max(15_000_000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { generateGemini } = await import("@/lib/gemini.server");
    const mimeType = data.image.slice(5, data.image.indexOf(";")) || "image/jpeg";
    const base64 = data.image.slice(data.image.indexOf(",") + 1);
    let raw = "";
    try {
      raw = await generateGemini({
        parts: [{ inlineData: { mimeType, data: base64 } }, { text: PROMPT }],
      });
    } catch (err) {
      console.error("Gemini vision", err);
      throw new Error(err instanceof Error ? err.message : "No se pudo analizar la imagen");
    }
    let m: RegExpMatchArray | null = null;
    let fecha_cuadrante: string | null = null;
    try {
      const objTxt = raw.match(/\{[\s\S]*\}/)?.[0];
      const obj = objTxt ? (JSON.parse(objTxt) as { clases?: unknown; fecha_cuadrante?: unknown }) : null;
      if (obj && Array.isArray(obj.clases)) m = [JSON.stringify(obj.clases)] as unknown as RegExpMatchArray;
      const f = typeof obj?.fecha_cuadrante === "string" ? obj.fecha_cuadrante.trim() : "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(f) && !Number.isNaN(new Date(`${f}T12:00:00`).getTime())) fecha_cuadrante = f;
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
          .filter((c): c is { nombre: string; hora: string | null; telefono: string | null; seccion: string | null } =>
            c.nombre.length > 0 && !EXCLUIDOS.test(c.nombre.trim()));
      }
    } catch {
      clases = [];
    }
    return { clases, fecha_cuadrante };
  });
