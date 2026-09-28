import * as React from "react";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/** Solo Super Admin: sube o sustituye el reglamento que consulta el Copiloto. */
export function ReglamentoUpload() {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const MAX_MB = 20;
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    // Algunos móviles no informan el tipo: aceptamos también por extensión.
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      toast.error("Solo se admiten archivos PDF (.pdf)");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`El PDF pesa ${(file.size / 1048576).toFixed(1)} MB. El máximo es ${MAX_MB} MB.`);
      return;
    }
    setUploading(true);
    const t = toast.loading("Subiendo reglamento…");
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Tu sesión ha caducado. Vuelve a iniciar sesión.");
      const { error } = await supabase.storage
        .from("documentos-legales")
        .upload("reglamento.pdf", file, { upsert: true, contentType: "application/pdf", cacheControl: "60" });
      if (error) {
        const m = error.message.toLowerCase();
        if (m.includes("row-level") || m.includes("unauthorized") || m.includes("403"))
          throw new Error("Solo el Super Admin puede subir el reglamento.");
        if (m.includes("bucket not found"))
          throw new Error("La carpeta de documentos no existe. Avisa al soporte.");
        if (m.includes("size") || m.includes("too large"))
          throw new Error(`El PDF supera el máximo de ${MAX_MB} MB.`);
        throw new Error(error.message);
      }
      toast.success("Reglamento actualizado. El Copiloto ya lo consulta.", { id: t });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const net = /fetch|network|failed/i.test(msg);
      toast.error(net ? "Error al subir el documento. Inténtalo de nuevo" : `Error al subir el documento: ${msg}`, { id: t });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-4 rounded-3xl border bg-card p-5">
      <p className="text-base font-bold">Base de conocimiento del Copiloto</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Sube el reglamento en PDF. Sustituye al anterior y el asistente lo usará para responder.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        aria-label="Seleccionar reglamento en PDF"
        onChange={(e) => void onFile(e)}
      />
      <Button
        variant="secondary"
        disabled={uploading}
        aria-label="Subir reglamento en PDF"
        className="mt-4 h-14 w-full rounded-2xl text-base font-bold"
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="size-5 animate-spin" /> : <FileUp className="size-5" />}
        {uploading ? "Subiendo…" : "Subir reglamento (PDF)"}
      </Button>
      <p className="mt-2 text-center text-xs text-muted-foreground">Solo PDF, máximo 20 MB.</p>
    </div>
  );
}
