// Ticket de Progreso: el componente vive siempre montado en el DOM, fuera de
// pantalla (ver progress-ticket-card.tsx), y aquí solo se captura. La imagen
// jamás se envía al servidor: portapapeles, compartir o descarga local.
import { toBlob } from "html-to-image";

/** Captura el nodo del ticket y lo copia al portapapeles; si no se puede, comparte o descarga en local. */
export async function deliverTicket(node: HTMLElement): Promise<"copied" | "shared" | "downloaded"> {
  const blobPromise = toBlob(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: "#ffffff",
    // El nodo vive fuera de pantalla (left: -9999px); en el clon se anula esa
    // posición o el contenido se pintaría fuera del lienzo (cuadrado blanco).
    style: { position: "static", left: "0px", top: "0px", zIndex: "0" },
  }).then((blob) => {
    if (!blob) throw new Error("No se pudo generar la imagen");
    return blob;
  });
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
