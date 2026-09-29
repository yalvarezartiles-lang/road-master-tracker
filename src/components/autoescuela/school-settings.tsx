import * as React from "react";
import { ImageUp, Palette, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSchool } from "@/lib/autoescuela/school-branding";

const MAX_LOGO = 400 * 1024;

export function SchoolSettings() {
  const { schoolName, schoolLogo, primaryColor, setBranding, reset } = useSchool();

  const extractDominantColor = (dataUrl: string) => new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return reject(new Error("Canvas no disponible"));
      context.drawImage(image, 0, 0, 64, 64);
      const pixels = context.getImageData(0, 0, 64, 64).data;
      const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
      for (let index = 0; index < pixels.length; index += 16) {
        const alpha = pixels[index + 3] ?? 0;
        const r = pixels[index] ?? 0;
        const g = pixels[index + 1] ?? 0;
        const b = pixels[index + 2] ?? 0;
        const brightness = (r + g + b) / 3;
        if (alpha < 180 || brightness > 245 || brightness < 12) continue;
        const key = `${Math.round(r / 24)}-${Math.round(g / 24)}-${Math.round(b / 24)}`;
        const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
        bucket.count += 1;
        bucket.r += r;
        bucket.g += g;
        bucket.b += b;
        buckets.set(key, bucket);
      }
      const dominant = [...buckets.values()].sort((a, b) => b.count - a.count)[0];
      if (!dominant) return resolve("#71717a");
      const hex = [dominant.r, dominant.g, dominant.b]
        .map((sum) => Math.round(sum / dominant.count).toString(16).padStart(2, "0"))
        .join("");
      resolve(`#${hex}`);
    };
    image.onerror = () => reject(new Error("No se pudo leer la imagen"));
    image.src = dataUrl;
  });

  const onLogo = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return void toast.error("El logo debe ser una imagen");
    if (file.size > MAX_LOGO) return void toast.error("El logo no puede superar 400 KB");
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const schoolLogo = String(reader.result);
        const primaryColor = await extractDominantColor(schoolLogo);
        setBranding({ schoolLogo, primaryColor });
        toast.success("Logo y colores actualizados");
      } catch {
        toast.error("No se pudo analizar el logo");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="rounded-3xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground"><Palette className="size-5" /></span>
        <div>
          <h2 className="text-lg font-bold">Marca de la autoescuela</h2>
          <p className="text-sm text-muted-foreground">El color se obtiene automáticamente del logo.</p>
        </div>
      </div>
        <div className="mt-5 space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Nombre</span>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setBranding({ schoolName: e.target.value })}
              placeholder="Autoescuela…"
              className="h-12 w-full rounded-xl border bg-background px-4 text-base outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <div className="space-y-2">
            <span className="text-sm font-medium">Logo</span>
            <div className="flex items-center gap-3">
              <div className="flex size-16 items-center justify-center overflow-hidden rounded-xl border bg-muted">
                {schoolLogo ? <img src={schoolLogo} alt="Logo" className="size-full object-contain" /> : <Upload className="size-5 text-muted-foreground" />}
              </div>
              <label className="inline-flex h-12 cursor-pointer items-center rounded-xl border px-4 text-sm font-medium hover:bg-accent">
                Subir imagen
                 <ImageUp className="mr-2 size-5" /> Subir imagen
                 <input type="file" accept="image/*" className="sr-only" onChange={(e) => void onLogo(e.target.files?.[0])} />
              </label>
              {schoolLogo && (
                <Button variant="ghost" size="icon" aria-label="Quitar logo" onClick={() => setBranding({ schoolLogo: "" })}>
                  <Trash2 className="size-5" />
                </Button>
              )}
            </div>
          </div>
           {primaryColor && (
             <div className="flex items-center gap-3 rounded-2xl border bg-background p-3 text-sm text-muted-foreground">
               <span className="size-9 rounded-full border" style={{ backgroundColor: primaryColor }} />
               Paleta pastel generada automáticamente
             </div>
           )}
           <div className="flex justify-end">
             <Button variant="outline" onClick={reset}>Restablecer marca</Button>
          </div>
        </div>
    </section>
  );
}
