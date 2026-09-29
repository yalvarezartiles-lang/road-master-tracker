import * as React from "react";
import { useServerFn } from "@tanstack/react-start";
import { GripVertical, ImageUp, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LOGO_BUCKET, loadLogoDataUrl, useSchool } from "@/lib/autoescuela/school-branding";
import { updateAutoescuelaBranding } from "@/lib/admin.functions";

const MAX_LOGO = 2 * 1024 * 1024;
const ROLE_LABELS = ["Principal", "Secundario", "Fondo"];
const FALLBACK = ["#71717a", "#a1a1aa", "#fafafa"];

/** Siempre 3 posiciones editables: principal, secundario y fondo. */
const toTriplet = (colors: (string | null | undefined)[]) =>
  [0, 1, 2].map((i) => colors[i] || FALLBACK[i]!) as string[];

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
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);

  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Guarda la paleta en la base de datos y refresca la marca global. */
  const persist = async (next: string[], prev: string[]) => {
    try {
      await saveBranding({
        data: { id: school.id, logoUrl: school.logo_url ?? null, primaryColor: next[0] ?? null, secondaryColor: next[1] ?? null, accentColor: next[2] ?? null },
      });
      onSaved?.();
      if (brand.schoolId === school.id) await brand.refresh();
    } catch (err) {
      setPalette(prev);
      toast.error(err instanceof Error ? err.message : "No se pudo guardar la paleta");
    }
  };

  /** Extrae el color de `draggedIndex` y lo inserta en `targetIndex` (splice), desplazando el resto. */
  const handleDrop = async (targetIndex: number) => {
    if (draggedIndex === null) return;
    const from = draggedIndex;
    setDraggedIndex(null);
    if (from === targetIndex) return;
    const next = [...palette];
    const [moved] = next.splice(from, 1);
    next.splice(targetIndex, 0, moved!);
    setPalette(next);
    await persist(next, palette);
  };

  /** Cambio manual desde la ruleta: vista previa instantánea y guardado diferido. */
  const handleColorChange = (index: number, value: string) => {
    const prev = palette;
    const next = [...palette];
    next[index] = value;
    setPalette(next);
    if (brand.schoolId === school.id && index === 0) {
      document.documentElement.style.setProperty("--primary", value);
      document.documentElement.style.setProperty("--ring", value);
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist(next, prev), 600);
  };

  const addColor = () => {
    if (palette.length >= 3) return;
    const next = [...palette, palette[0] ?? "#71717a"];
    setPalette(next);
    void persist(next, palette);
  };

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
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {palette.map((c, i) => (
          <div
            key={i}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); void handleDrop(i); }}
            className={`flex flex-col items-center gap-1 ${draggedIndex === i ? "opacity-50" : ""}`}
          >
            <div className="flex items-center">
              <button
                type="button"
                draggable={!busy}
                disabled={busy}
                onDragStart={(e) => { setDraggedIndex(i); e.dataTransfer.effectAllowed = "move"; }}
                onDragEnd={() => setDraggedIndex(null)}
                onClick={() => {
                  // Móvil: toca el asa de uno y luego la de otro para reordenar.
                  if (draggedIndex === null) setDraggedIndex(i);
                  else void handleDrop(i);
                }}
                className={`flex h-10 w-6 cursor-grab items-center justify-center rounded-md active:cursor-grabbing ${draggedIndex === i ? "bg-muted text-foreground" : ""}`}
                aria-label={`Mover ${ROLE_LABELS[i]}`}
              >
                <GripVertical className="size-4" />
              </button>
              <label className={`relative size-10 cursor-pointer rounded-full border-2 ${draggedIndex === i ? "border-foreground" : "border-card"} shadow`} style={{ backgroundColor: c }}>
                <input
                  type="color"
                  value={c}
                  disabled={busy}
                  onChange={(e) => handleColorChange(i, e.target.value)}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                  aria-label={`Elegir color ${ROLE_LABELS[i]}`}
                />
              </label>
            </div>
            <span className="text-[10px] font-medium">{ROLE_LABELS[i]}</span>
          </div>
        ))}
        {palette.length < 3 && (
          <div className="flex flex-col items-center gap-1">
            <button type="button" onClick={addColor} disabled={busy} className="flex size-10 items-center justify-center rounded-full border-2 border-dashed border-border hover:bg-muted" aria-label="Añadir color">
              <Plus className="size-4" />
            </button>
            <span className="text-[10px] font-medium">{ROLE_LABELS[palette.length]}</span>
          </div>
        )}
      </div>
      {(preview || color) && (
        <Button variant="ghost" size="icon" aria-label="Quitar marca" disabled={busy} onClick={() => void onRemove()}>
          <Trash2 className="size-5" />
        </Button>
      )}
    </div>
  );
}
