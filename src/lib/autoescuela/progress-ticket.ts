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
    ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${t.greens
        .map(
          (g) => `<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:14px;background:#f0fdf4;border:1px solid #dcfce7;font-size:15px;font-weight:600;color:#0f172a;line-height:1.25">
          <span style="flex:none;width:20px;height:20px;border-radius:50%;background:#22c55e;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff">\u2713</span><span>${esc(g)}</span></div>`,
        )
        .join("")}</div>`
    : `<div style="font-size:16px;color:#64748b">Seguimos trabajando para conseguir tus primeros verdes \u{1F4AA}</div>`;
  const node = document.createElement("div");
  node.style.cssText = "position:fixed;left:-10000px;top:0;padding:24px;background:transparent;";
  node.innerHTML = `<div style="width:520px;height:auto;box-sizing:border-box;padding:32px;border-radius:24px;background:#ffffff;border:1px solid #f1f5f9;box-shadow:0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1);font-family:Archivo,system-ui,sans-serif;color:#0f172a">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#64748b;font-weight:700">${esc(t.school || "Autoescuela")}</div>
      <div style="font-size:12px;font-weight:700;color:#2563eb;background:#eff6ff;padding:6px 10px;border-radius:999px">Ticket de progreso</div>
    </div>
    <div style="margin-top:22px;font-size:32px;font-weight:800;line-height:1.1;color:#0f172a;letter-spacing:-.02em">${esc(t.student)}</div>
    <div style="margin-top:6px;font-size:15px;color:#64748b;text-transform:capitalize">${esc(date)}</div>
    <div style="margin:22px 0 14px;height:1px;background:#f1f5f9"></div>
    <div style="margin-bottom:12px;font-size:15px;font-weight:700;color:#0f172a">Habilidades dominadas · <span style="color:#16a34a">${t.greens.length}</span></div>
    ${list}
    <div style="margin-top:22px;font-size:14px;color:#64748b;text-align:center">¡Sigue así! \u{1F697}</div>
  </div>`;
  document.body.appendChild(node);
  try {
    const blob = await toBlob(node, { pixelRatio: 2, cacheBust: true });
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
