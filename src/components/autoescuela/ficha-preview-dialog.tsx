import * as React from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { loadFichaDraft, renderFichaPdf, type FichaDraft, type FichaRow } from "@/lib/autoescuela/pdf";

type Field = "fecha" | "horas" | "matricula" | "profesor" | "tipo" | "observaciones";
const COLS: { key: Field; label: string; w: string; multi?: boolean }[] = [
  { key: "fecha", label: "Fecha", w: "w-28" },
  { key: "horas", label: "Horas", w: "w-32" },
  { key: "matricula", label: "Matrícula", w: "w-28" },
  { key: "profesor", label: "Profesor", w: "w-48", multi: true },
  { key: "tipo", label: "Tipo", w: "w-28" },
  { key: "observaciones", label: "Observaciones", w: "w-56", multi: true },
];

export function FichaPreviewDialog({
  studentId,
  open,
  onOpenChange,
}: {
  studentId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [draft, setDraft] = React.useState<FichaDraft | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    setDraft(null);
    loadFichaDraft({ id: studentId })
      .then((d) => {
        if (!d) {
          toast.info("No hay clases para exportar");
          onOpenChange(false);
        } else setDraft(d);
      })
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : String(e));
        onOpenChange(false);
      })
      .finally(() => setLoading(false));
  }, [open, studentId, onOpenChange]);

  const edit = (i: number, key: Field, value: string) =>
    setDraft((d) => d && { ...d, rows: d.rows.map((r, j) => (j === i ? ({ ...r, [key]: value } as FichaRow) : r)) });

  const exportar = async () => {
    if (!draft) return;
    setExporting(true);
    try {
      await renderFichaPdf(draft);
      toast.success("PDF descargado");
      onOpenChange(false);
    } catch (e) {
      toast.error(`Error al generar el PDF: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Revisar ficha práctica</DialogTitle>
          <DialogDescription>Toca cualquier celda para corregirla. Los cambios solo afectan a este PDF.</DialogDescription>
        </DialogHeader>
        {loading || !draft ? (
          <div className="flex justify-center p-8"><Loader2 className="size-6 animate-spin" /></div>
        ) : (
          <>
            <p className="text-sm font-semibold">{draft.alumno} · DNI {draft.dni}</p>
            <div className="min-h-0 flex-1 overflow-auto rounded-xl border">
              <table className="text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    {COLS.map((c) => <th key={c.key} className="p-2 text-left font-semibold">{c.label}</th>)}
                    <th className="p-2 text-left font-semibold">Firmas</th>
                  </tr>
                </thead>
                <tbody>
                  {draft.rows.map((r, i) => (
                    <tr key={r.key} className="border-t align-top">
                      {COLS.map((c) => (
                        <td key={c.key} className="p-1">
                          {c.multi ? (
                            <textarea
                              value={r[c.key]}
                              onChange={(e) => edit(i, c.key, e.target.value)}
                              rows={2}
                              aria-label={`${c.label} fila ${i + 1}`}
                              className={`${c.w} resize-none rounded-md border border-transparent bg-transparent p-2 hover:border-border focus:border-primary focus:outline-none`}
                            />
                          ) : (
                            <input
                              value={r[c.key]}
                              onChange={(e) => edit(i, c.key, e.target.value)}
                              aria-label={`${c.label} fila ${i + 1}`}
                              className={`${c.w} h-11 rounded-md border border-transparent bg-transparent px-2 hover:border-border focus:border-primary focus:outline-none`}
                            />
                          )}
                        </td>
                      ))}
                      <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">
                        Alumno: {r.alumno ? "✓" : "Pendiente"}<br />Profesor: {r.firmaProfesor ? "✓" : "Pendiente"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button onClick={exportar} disabled={exporting} className="h-12 rounded-2xl text-base font-bold">
              {exporting ? <Loader2 className="size-5 animate-spin" /> : <FileDown className="size-5" />} Exportar Ficha Oficial
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
