import * as React from "react";
import { Palette, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useSchool } from "@/lib/autoescuela/school-branding";

const MAX_LOGO = 400 * 1024;

export function SchoolSettings() {
  const { schoolName, schoolLogo, primaryColor, setBranding, reset } = useSchool();
  const [open, setOpen] = React.useState(false);

  const onLogo = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return void toast.error("El logo debe ser una imagen");
    if (file.size > MAX_LOGO) return void toast.error("El logo no puede superar 400 KB");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        setBranding({ schoolLogo: String(reader.result) });
      } catch {
        toast.error("No se pudo guardar el logo");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Marca de la autoescuela" className="size-9 rounded-xl md:size-12 md:rounded-2xl">
          <Palette className="size-5 md:size-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marca de la autoescuela</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
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
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => onLogo(e.target.files?.[0])} />
              </label>
              {schoolLogo && (
                <Button variant="ghost" size="icon" aria-label="Quitar logo" onClick={() => setBranding({ schoolLogo: "" })}>
                  <Trash2 className="size-5" />
                </Button>
              )}
            </div>
          </div>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Color principal</span>
            <input
              type="color"
              value={primaryColor || "#2563eb"}
              onChange={(e) => setBranding({ primaryColor: e.target.value })}
              className="h-12 w-20 cursor-pointer rounded-xl border bg-background p-1"
            />
          </label>
          <div className="flex justify-between gap-2">
            <Button variant="outline" onClick={reset}>Restablecer</Button>
            <Button onClick={() => setOpen(false)}>Listo</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
