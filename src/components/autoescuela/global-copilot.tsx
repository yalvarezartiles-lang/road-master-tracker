import * as React from "react";
import { useLocation } from "@tanstack/react-router";
import { Loader2, Mic, MicOff, Send, Sparkles, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Msg = { role: "copiloto" | "profesor"; text: string };

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function mockAnswer(ctx: "alumno" | "agenda" | "otro") {
  if (ctx === "alumno")
    return "Simulación: He revisado el semáforo de este alumno. Recomiendo reforzar glorietas e incorporaciones antes de marcarlas en verde.";
  if (ctx === "agenda")
    return "Simulación: Tu próxima clase empieza pronto. Te recomiendo revisar la zona asignada antes de salir.";
  return "Simulación: Estoy aquí para ayudarte. Pronto podré responder preguntas reales sobre tráfico y tus alumnos.";
}

export function GlobalCopilot() {
  const { pathname } = useLocation();
  const ctx: "alumno" | "agenda" | "otro" = pathname.startsWith("/alumno/")
    ? "alumno"
    : pathname.startsWith("/panel")
      ? "agenda"
      : "otro";

  const [open, setOpen] = React.useState(false);
  const [msgs, setMsgs] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [thinking, setThinking] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const [speakingIdx, setSpeakingIdx] = React.useState<number | null>(null);
  const recRef = React.useRef<any>(null);
  const inputRef = React.useRef(input);
  inputRef.current = input;

  // Welcome message depending on where the user is
  React.useEffect(() => {
    if (!open) {
      window.speechSynthesis?.cancel();
      recRef.current?.abort?.();
      setSpeakingIdx(null);
      return;
    }
    let alive = true;
    (async () => {
      let text: string;
      if (ctx === "alumno") {
        text =
          "Estoy viendo la ficha de este alumno. ¿Quieres que analice su semáforo, guarde una nota, o tienes alguna duda de tráfico?";
      } else if (ctx === "agenda") {
        const { data: u } = await supabase.auth.getUser();
        let count = 0;
        if (u.user) {
          const { count: c } = await supabase
            .from("agenda_diaria")
            .select("id", { count: "exact", head: true })
            .eq("profesor_id", u.user.id)
            .eq("fecha", toISO(new Date()))
            .neq("estado", "cancelada")
            .not("student_id", "is", null);
          count = c ?? 0;
        }
        text = `Hola, soy tu Copiloto. Tienes ${count} ${count === 1 ? "clase" : "clases"} hoy. ¿Quieres que te lea la agenda o busque a un alumno?`;
      } else {
        text = "Hola, soy tu Copiloto. ¿En qué te ayudo?";
      }
      if (alive) setMsgs([{ role: "copiloto", text }]);
    })();
    return () => {
      alive = false;
    };
  }, [open, ctx]);

  const toggleMic = () => {
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
      const cur = inputRef.current.trim();
      setInput(cur ? `${cur} ${text}` : text);
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

  const speak = (idx: number, text: string) => {
    const synth = window.speechSynthesis;
    if (!synth) {
      toast.error("Tu navegador no permite la lectura en voz alta");
      return;
    }
    synth.cancel();
    if (speakingIdx === idx) {
      setSpeakingIdx(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";
    utterance.onend = () => setSpeakingIdx(null);
    utterance.onerror = () => setSpeakingIdx(null);
    synth.speak(utterance);
    setSpeakingIdx(idx);
  };

  const send = () => {
    const q = input.trim();
    if (!q || thinking) return;
    recRef.current?.stop?.();
    setMsgs((m) => [...m, { role: "profesor", text: q }]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setMsgs((m) => [...m, { role: "copiloto", text: mockAnswer(ctx) }]);
      setThinking(false);
    }, 1500);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir Copiloto IA"
        className={cn(
          "fixed right-6 z-50 flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl ring-4 ring-primary/25 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95",
          ctx === "alumno" ? "bottom-32" : "bottom-6",
        )}
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/30 [animation-duration:2.5s]" />
        <Sparkles className="relative size-7" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b p-4">
            <SheetTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="size-5 text-primary" /> Copiloto
            </SheetTitle>
            <SheetDescription>Respuestas simuladas · aún sin inteligencia artificial real</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {msgs.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "profesor" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[88%] rounded-3xl px-4 py-3 text-base leading-relaxed",
                    m.role === "profesor" ? "bg-primary text-primary-foreground" : "border bg-card shadow-sm",
                  )}
                >
                  <p>{m.text}</p>
                  {m.role === "copiloto" && (
                    <Button
                      variant="ghost"
                      onClick={() => speak(i, m.text)}
                      className="mt-2 h-12 rounded-2xl px-3 text-primary"
                    >
                      {speakingIdx === i ? <Square className="size-5" /> : <Volume2 className="size-5" />}
                      {speakingIdx === i ? "Detener" : "Escuchar"}
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {(thinking || msgs.length === 0) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-5 animate-spin text-primary" /> Pensando…
              </div>
            )}
          </div>

          <div className="space-y-2 border-t p-4">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={3}
              placeholder="Pulsa el micrófono y habla, o escribe tu pregunta…"
              className="rounded-2xl text-base"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleMic}
                aria-label={listening ? "Detener dictado" : "Dictar por voz"}
                aria-pressed={listening}
                className={cn(
                  "flex h-14 min-w-14 items-center justify-center gap-2 rounded-2xl border px-4 font-semibold transition-all duration-200 active:scale-95",
                  listening
                    ? "animate-pulse border-destructive bg-destructive text-destructive-foreground"
                    : "bg-primary text-primary-foreground",
                )}
              >
                {listening ? <MicOff className="size-6" /> : <Mic className="size-6" />}
                {listening && <span>Escuchando...</span>}
              </button>
              <Button
                onClick={send}
                disabled={!input.trim() || thinking}
                className="h-14 flex-1 rounded-2xl text-base font-bold"
              >
                <Send className="size-5" /> Preguntar
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
