// Ticket de Progreso: el componente vive siempre montado en el DOM, fuera de
// pantalla (ver progress-ticket-card.tsx), y aquí solo se captura. La imagen
// jamás se envía al servidor: portapapeles, compartir o descarga local.
import { toBlob } from "html-to-image";

/** Captura el nodo del ticket y lo copia al portapapeles; si no se puede, comparte o descarga en local. */
export async function deliverTicket(node: HTMLElement): Promise<"copied" | "shared" | "downloaded"> {
  const blobPromise = toBlob(node, {
    pixelRatio: 2,
    skipFonts: true,
    cacheBust: true,
    backgroundColor: "#ffffff",
    // El nodo está fijo e invisible (opacity-0, z negativo); en el clon se
    // restaura la opacidad para que la imagen no salga en blanco.
    style: { position: "static", opacity: "1", zIndex: "0", left: "0px", top: "0px" },
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
