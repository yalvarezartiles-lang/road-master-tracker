import * as React from "react";
import { Loader2, Sparkles, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useStore } from "@/lib/autoescuela/store";
import type { Student } from "@/lib/autoescuela/types";

const MOCK =
  "Simulación: He analizado el historial y tus notas. Recomiendo repasar las glorietas hoy y practicar las incorporaciones. Todo en orden según el reglamento de la DGT.";

export function CopilotSheet({ student, notes }: { student: Student; notes: string }) {
  const { data } = useStore();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [text, setText] = React.useState("");
  const [speaking, setSpeaking] = React.useState(false);
  const [snapshot, setSnapshot] = React.useState({ verde: 0, amarillo: 0, rojo: 0, notas: "" });

  React.useEffect(() => {
    if (!open) {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      return undefined;
    }
    const c = { verde: 0, amarillo: 0, rojo: 0 };
    data.skills.forEach((k) => {
      c[student.skills[k.id] ?? "rojo"]++;
    });
    setSnapshot({ ...c, notas: notes.trim() });
    setLoading(true);
    setText("");
    const t = setTimeout(() => {
      setText(MOCK);
      setLoading(false);
    }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const speak = () => {
    const synth = window.speechSynthesis;
    if (!synth) { toast.error("Tu navegador no permite la lectura en voz alta"); return; }
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(utterance);
    setSpeaking(true);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-12 rounded-2xl border-primary/40 px-4 font-semibold text-primary">
          <Sparkles className="size-5" /> Copiloto IA
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-xl">Análisis del Copiloto ✨</SheetTitle>
          <SheetDescription>
            {student.name} · {snapshot.verde} verdes · {snapshot.amarillo} ámbar · {snapshot.rojo} rojos
            {snapshot.notas ? " · con notas" : ""}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          {loading ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border bg-muted/40 p-8 text-muted-foreground">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="font-medium">Analizando…</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="rounded-3xl border bg-card p-5 text-base leading-relaxed shadow-sm">{text}</p>
              <Button onClick={speak} className="h-14 w-full rounded-2xl text-base font-bold">
                {speaking ? <Square className="size-5" /> : <Volume2 className="size-5" />}
                {speaking ? "Detener" : "Escuchar"}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
