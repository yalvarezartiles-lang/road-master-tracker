import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImageUp, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LOGO_BUCKET, loadLogoDataUrl, useSchool } from "@/lib/autoescuela/school-branding";
import { updateAutoescuelaBranding } from "@/lib/admin.functions";

const MAX_LOGO = 2 * 1024 * 1024;

export function extractDominantColor(dataUrl: string) {
  return new Promise<string>((resolve, reject) => {
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
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

interface Props {
  school: { id: string; nombre_comercial: string; logo_url?: string | null; primary_color?: string | null };
  onSaved?: () => void;
}

/** Marca de una autoescuela concreta. Solo se muestra al super administrador. */
export function SchoolSettings({ school, onSaved }: Props) {
  const saveBranding = useServerFn(updateAutoescuelaBranding);
  const brand = useSchool();
  const [preview, setPreview] = React.useState("");
  const [color, setColor] = React.useState(school.primary_color ?? "");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setColor(school.primary_color ?? "");
    if (!school.logo_url) return void setPreview("");
    let alive = true;
    void loadLogoDataUrl(school.logo_url).then((url) => {
      if (alive) setPreview(url);
    });
    return () => {
      alive = false;
    };
  }, [school.logo_url, school.primary_color]);

  const onLogo = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return void toast.error("El logo debe ser una imagen");
    if (file.size > MAX_LOGO) return void toast.error("El logo no puede superar 2 MB");
    setBusy(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      const primaryColor = await extractDominantColor(dataUrl);
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${school.id}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(LOGO_BUCKET).upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw new Error(error.message);
      await saveBranding({ data: { id: school.id, logoUrl: path, primaryColor } });
      setPreview(dataUrl);
      setColor(primaryColor);
      toast.success("Logo y colores actualizados");
      onSaved?.();
      if (brand.schoolId === school.id) await brand.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el logo");
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async () => {
    setBusy(true);
    try {
      await saveBranding({ data: { id: school.id, logoUrl: null, primaryColor: null } });
      setPreview("");
      setColor("");
      toast.success("Marca restablecida");
      onSaved?.();
      if (brand.schoolId === school.id) await brand.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo restablecer");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border bg-background/60 p-3 backdrop-blur-md">
      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
        {preview ? <img src={preview} alt="Logo" className="size-full object-contain" /> : <Upload className="size-5 text-muted-foreground" />}
      </div>
      <label className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-medium hover:bg-accent">
        {busy ? <Loader2 className="size-5 animate-spin" /> : <ImageUp className="size-5" />}
        Subir logo
        <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(e) => void onLogo(e.target.files?.[0])} />
      </label>
      {color && (
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-7 rounded-full border" style={{ backgroundColor: color }} />
          Paleta automática
        </span>
      )}
      {(preview || color) && (
        <Button variant="ghost" size="icon" aria-label="Quitar marca" disabled={busy} onClick={() => void onRemove()}>
          <Trash2 className="size-5" />
        </Button>
      )}
    </div>
  );
}
