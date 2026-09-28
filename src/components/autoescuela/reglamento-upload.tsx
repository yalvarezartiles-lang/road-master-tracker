import * as React from "react";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/** Solo Super Admin: sube o sustituye el reglamento que consulta el Copiloto. */
export function ReglamentoUpload() {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("El archivo debe ser un PDF");
      return;
    }
    setUploading(true);
    const t = toast.loading("Subiendo reglamento…");
    const { error } = await supabase.storage
      .from("documentos-legales")
      .upload("reglamento.pdf", file, { upsert: true, contentType: "application/pdf" });
    setUploading(false);
    if (error) toast.error("No se pudo subir el reglamento", { id: t });
    else toast.success("Reglamento actualizado. El Copiloto ya lo consulta.", { id: t });
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
        accept="application/pdf"
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
        Subir reglamento (PDF)
      </Button>
    </div>
  );
}
