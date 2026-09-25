import * as React from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Loader2, Mic, MicOff, Send, Sparkles, Square, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/autoescuela/store";
import { SKILL_BLOCKS } from "@/lib/autoescuela/types";
import { askCopilot } from "@/lib/copilot.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Msg = { role: "copiloto" | "profesor"; text: string };

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function GlobalCopilot() {
  const { pathname } = useLocation();
  const ctx: "alumno" | "agenda" | "otro" = pathname.startsWith("/alumno/")
    ? "alumno"
    : pathname.startsWith("/panel")
      ? "agenda"
      : "otro";

  const { data } = useStore();
  const ask = useServerFn(askCopilot);
  const navigate = useNavigate();
  const keepSpeakingRef = React.useRef(false);
  const agendaCountRef = React.useRef(0);
  const buildContext = () => {
    if (ctx === "alumno") {
      const id = pathname.split("/")[2];
      const st = data.students.find((x) => x.id === id);
      if (!st) return "Pantalla: ficha de alumno (no encontrado).";
      const lines = SKILL_BLOCKS.map((b) => {
        const items = data.skills.filter((k) => k.block === b.id);
        const txt = items.map((k) => `${k.name}=${st.skills[k.id] ?? "rojo"}`).join(", ");
        return `- ${b.name}: ${txt || "sin habilidades"}`;
      });
      const zonas = [...new Set(st.lessons.map((l) => l.zone))].join(", ");
      return `Pantalla: ficha del alumno ${st.name}. Clases realizadas: ${st.lessons.length}. Zonas recorridas: ${zonas || "ninguna"}.\nSemáforo (rojo=necesita práctica, amarillo=en progreso, verde=dominado):\n${lines.join("\n")}`;
    }
    if (ctx === "agenda") return `Pantalla: panel/agenda del profesor. Clases hoy: ${agendaCountRef.current}. Alumnos activos: ${data.students.length}.`;
    return `Pantalla: ${pathname}.`;
  };
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
      // En una navegación por acción del Copiloto se conserva la voz en curso.
      if (!keepSpeakingRef.current) window.speechSynthesis?.cancel();
      recRef.current?.abort?.();
      setSpeakingIdx(null);
      return;
    }
    keepSpeakingRef.current = false;
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
          agendaCountRef.current = count;
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

  const send = async () => {
    const q = input.trim();
    if (!q || thinking) return;
    recRef.current?.stop?.();
    setMsgs((m) => [...m, { role: "profesor", text: q }]);
    setInput("");
    setThinking(true);
    try {
      const res = await ask({ data: { message: q, context: buildContext() } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      let idx = 0;
      setMsgs((m) => {
        idx = m.length;
        return [...m, { role: "copiloto", text: res.respuesta }];
      });

      // Intercepción de acciones: el Copiloto puede navegar a un alumno.
      if (res.accion === "NAVIGATE_ALUMNO") {
        const nombre = (res.nombre_alumno || "").replace(/[,()%"]/g, "").trim();
        const tokens = nombre.toLowerCase().split(/\s+/).filter(Boolean);
        let alumnoId: string | null = null;
        if (tokens.length > 0) {
          const { data: alumnos } = await supabase
            .from("students")
            .select("id, name, apellidos");
          const found = (alumnos ?? []).find((a) => {
            const full = `${a.name} ${a.apellidos ?? ""}`.toLowerCase();
            return tokens.every((t) => full.includes(t));
          });
          alumnoId = found?.id ?? null;
        }
        if (alumnoId) {
          keepSpeakingRef.current = true;
          setTimeout(() => speak(idx, res.respuesta), 0);
          navigate({ to: "/alumno/$studentId", params: { studentId: alumnoId } });
          setOpen(false); // libera la pantalla tras la navegación
        } else {
          const fb = "No he encontrado a ningún alumno con ese nombre en la base de datos.";
          setMsgs((m) => {
            const copy = [...m];
            copy[idx] = { role: "copiloto", text: fb };
            return copy;
          });
          setTimeout(() => speak(idx, fb), 0);
        }
        return;
      }

      setTimeout(() => speak(idx, res.respuesta), 0);
    } catch {
      toast.error("No se pudo contactar con el Copiloto");
    } finally {
      setThinking(false);
    }
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
            <SheetDescription>Experto en normativa DGT y pedagogía vial</SheetDescription>
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
                  void send();
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
                onClick={() => void send()}
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
