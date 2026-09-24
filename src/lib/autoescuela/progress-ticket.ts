// Ticket de Progreso: se genera 100% en el navegador y nunca se envía al servidor.
import { toBlob } from "html-to-image";

export interface TicketData {
  school: string;
  student: string;
  greens: string[];
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function renderTicketBlob(t: TicketData): Promise<Blob> {
  const date = new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const list = t.greens.length
    ? t.greens
        .map(
          (g) => `<div style="display:flex;align-items:center;gap:14px;padding:14px 18px;margin-bottom:10px;border-radius:18px;background:rgba(255,255,255,.12);font-size:24px;font-weight:600">
          <span style="flex:none;width:30px;height:30px;border-radius:50%;background:#22c55e;display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff">✓</span>${esc(g)}</div>`,
        )
        .join("")
    : `<div style="font-size:24px;opacity:.8">Seguimos trabajando para conseguir tus primeros verdes 💪</div>`;
  const node = document.createElement("div");
  node.style.cssText = "position:fixed;left:-10000px;top:0;";
  node.innerHTML = `<div style="width:540px;height:960px;box-sizing:border-box;padding:48px 40px;border-radius:40px;overflow:hidden;color:#fff;font-family:Archivo,system-ui,sans-serif;background:linear-gradient(160deg,#1e3a8a 0%,#2563eb 55%,#0f766e 100%);display:flex;flex-direction:column">
    <div style="font-size:18px;letter-spacing:.2em;text-transform:uppercase;opacity:.8">${esc(t.school || "Autoescuela")}</div>
    <div style="margin-top:40px;font-size:22px;opacity:.85">Ticket de progreso</div>
    <div style="font-size:46px;font-weight:800;line-height:1.1;margin-top:6px">${esc(t.student)}</div>
    <div style="margin-top:10px;font-size:20px;opacity:.8;text-transform:capitalize">${esc(date)}</div>
    <div style="margin-top:36px;font-size:22px;font-weight:700">🚦 Habilidades dominadas · ${t.greens.length}</div>
    <div style="margin-top:16px;flex:1;overflow:hidden">${list}</div>
    <div style="font-size:18px;opacity:.75;text-align:center">¡Sigue así! 🚗</div>
  </div>`;
  document.body.appendChild(node);
  try {
    const blob = await toBlob(node.firstElementChild as HTMLElement, { pixelRatio: 2, cacheBust: true });
    if (!blob) throw new Error("No se pudo generar la imagen");
    return blob;
  } finally {
    node.remove();
  }
}

/** Copia la imagen al portapapeles; si no se puede, comparte o descarga en local. */
export async function deliverTicket(t: TicketData): Promise<"copied" | "shared" | "downloaded"> {
  const blobPromise = renderTicketBlob(t);
  try {
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("no clipboard");
    // Se llama sin esperar para mantener el gesto del usuario (Safari).
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blobPromise })]);
    return "copied";
  } catch {
    const blob = await blobPromise;
    const file = new File([blob], "progreso.png", { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return "shared";
      }
    } catch {
      /* cae a descarga */
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "progreso.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return "downloaded";
  }
}
