import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { ImageUp, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LOGO_BUCKET, loadLogoDataUrl, useSchool } from "@/lib/autoescuela/school-branding";
import { updateAutoescuelaBranding } from "@/lib/admin.functions";

const MAX_LOGO = 2 * 1024 * 1024;

const toHex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/** Extrae hasta 3 colores predominantes y bien diferenciados (principal, secundario, acento). */
export function extractPalette(dataUrl: string) {
  return new Promise<string[]>((resolve, reject) => {
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
      for (let index = 0; index < pixels.length; index += 4) {
        const alpha = pixels[index + 3] ?? 0;
        const r = pixels[index] ?? 0;
        const g = pixels[index + 1] ?? 0;
        const b = pixels[index + 2] ?? 0;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        // Ignora transparencias, blancos, negros y grises (fondos del logo).
        if (alpha < 180 || max > 245 && min > 230 || max < 25 || max - min < 28) continue;
        const key = `${Math.round(r / 32)}-${Math.round(g / 32)}-${Math.round(b / 32)}`;
        const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
        bucket.count += 1;
        bucket.r += r;
        bucket.g += g;
        bucket.b += b;
        buckets.set(key, bucket);
      }
      const ranked = [...buckets.values()]
        .sort((a, b) => b.count - a.count)
        .map((c) => [c.r / c.count, c.g / c.count, c.b / c.count] as const);
      const picked: (readonly [number, number, number])[] = [];
      for (const c of ranked) {
        if (picked.every((p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) > 70)) picked.push(c);
        if (picked.length === 3) break;
      }
      if (!picked.length) return resolve(["#71717a"]);
      resolve(picked.map((c) => toHex(c[0], c[1], c[2])));
    };
    image.onerror = () => reject(new Error("No se pudo leer la imagen"));
    image.src = dataUrl;
  });
}

export async function extractDominantColor(dataUrl: string) {
  return (await extractPalette(dataUrl))[0] ?? "#71717a";
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
  school: {
    id: string;
    nombre_comercial: string;
    logo_url?: string | null;
    primary_color?: string | null;
    secondary_color?: string | null;
    accent_color?: string | null;
  };
  onSaved?: () => void;
}

/** Marca de una autoescuela concreta. Solo se muestra al super administrador. */
export function SchoolSettings({ school, onSaved }: Props) {
  const saveBranding = useServerFn(updateAutoescuelaBranding);
  const brand = useSchool();
  const [preview, setPreview] = React.useState("");
  const initial = [school.primary_color, school.secondary_color, school.accent_color].filter(Boolean) as string[];
  const [palette, setPalette] = React.useState<string[]>(initial);
  const color = palette[0] ?? "";
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setPalette([school.primary_color, school.secondary_color, school.accent_color].filter(Boolean) as string[]);
    if (!school.logo_url) return void setPreview("");
    let alive = true;
    void loadLogoDataUrl(school.logo_url).then((url) => {
      if (alive) setPreview(url);
    });
    return () => {
      alive = false;
    };
  }, [school.logo_url, school.primary_color, school.secondary_color, school.accent_color]);

  const onLogo = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return void toast.error("El logo debe ser una imagen");
    if (file.size > MAX_LOGO) return void toast.error("El logo no puede superar 2 MB");
    setBusy(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      const colors = await extractPalette(dataUrl);
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${school.id}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(LOGO_BUCKET).upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw new Error(error.message);
      await saveBranding({
        data: { id: school.id, logoUrl: path, primaryColor: colors[0] ?? null, secondaryColor: colors[1] ?? null, accentColor: colors[2] ?? null },
      });
      setPreview(dataUrl);
      setPalette(colors);
      toast.success("Logo y paleta actualizados");
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
      await saveBranding({ data: { id: school.id, logoUrl: null, primaryColor: null, secondaryColor: null, accentColor: null } });
      setPreview("");
      setPalette([]);
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
      {palette.length > 0 && (
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex -space-x-2">
            {palette.map((c) => (
              <span key={c} className="size-7 rounded-full border-2 border-card" style={{ backgroundColor: c }} />
            ))}
          </span>
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
