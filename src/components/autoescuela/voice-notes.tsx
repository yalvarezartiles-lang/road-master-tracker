import * as React from "react";
import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = { value: string; onChange: (v: string) => void };

export function VoiceNotes({ value, onChange }: Props) {
  const [listening, setListening] = React.useState(false);
  const recRef = React.useRef<any>(null);
  const valueRef = React.useRef(value);
  valueRef.current = value;

  React.useEffect(() => () => recRef.current?.abort?.(), []);

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      toast.error("Tu navegador no permite el dictado por voz");
      return;
    }
    const rec = new SR();
    rec.lang = "es-ES";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) text += e.results[i][0].transcript;
      }
      text = text.trim();
      if (!text) return;
      const cur = valueRef.current.trim();
      onChange(cur ? `${cur} ${text}` : text);
    };
    rec.onerror = (e: any) => {
      if (e.error === "not-allowed") toast.error("Permite el acceso al micrófono");
      else if (e.error !== "no-speech" && e.error !== "aborted") toast.error("Error de dictado: " + e.error);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <Label htmlFor="notas-profesor" className="text-base">Notas / Recordatorios (Opcional)</Label>
        <button
          type="button"
          onClick={toggle}
          aria-label={listening ? "Detener dictado" : "Dictar por voz"}
          aria-pressed={listening}
          className={cn(
            "flex h-14 min-w-14 items-center justify-center gap-2 rounded-2xl border px-4 font-semibold transition-colors",
            listening
              ? "animate-pulse border-destructive bg-destructive text-destructive-foreground"
              : "bg-primary text-primary-foreground",
          )}
        >
          {listening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          {listening && <span>Escuchando...</span>}
        </button>
      </div>
      <Textarea
        id="notas-profesor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder="Pulsa el micrófono y habla, o escribe aquí…"
        className="rounded-2xl text-base"
      />
    </section>
  );
}
