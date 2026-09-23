import * as React from "react";
import { CheckCircle, Eraser, Pencil, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COLORS = ["#111827", "#2563eb", "#dc2626", "#16a34a", "#f59e0b"];

export function Whiteboard({
  saved,
  onSave,
}: {
  saved: boolean;
  onSave: (dataUrl: string | null) => void;
}) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const drawing = React.useRef(false);
  const last = React.useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = React.useState(COLORS[0]!);
  const [eraser, setEraser] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);

  const fill = () => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
  };

  React.useEffect(fill, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = ref.current!.getContext("2d")!;
    const p = pos(e);
    ctx.strokeStyle = eraser ? "#ffffff" : color;
    ctx.lineWidth = eraser ? 28 : 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!dirty) setDirty(true);
    if (saved) onSave(null);
  };
  const up = () => {
    drawing.current = false;
    last.current = null;
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Color ${c}`}
            onClick={() => {
              setColor(c);
              setEraser(false);
            }}
            className={cn(
              "size-11 rounded-full border-4",
              !eraser && color === c ? "border-primary" : "border-border",
            )}
            style={{ background: c }}
          />
        ))}
        <Button
          type="button"
          variant={eraser ? "default" : "outline"}
          className="h-11 rounded-2xl"
          onClick={() => setEraser((v) => !v)}
          aria-label={eraser ? "Lápiz" : "Goma"}
        >
          {eraser ? <Pencil className="size-5" /> : <Eraser className="size-5" />}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-2xl"
          aria-label="Limpiar pizarra"
          onClick={() => {
            fill();
            setDirty(false);
            onSave(null);
          }}
        >
          <Trash2 className="size-5" />
        </Button>
      </div>
      <canvas
        ref={ref}
        width={800}
        height={500}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="w-full touch-none rounded-2xl border-2 bg-white"
        style={{ aspectRatio: "8 / 5" }}
      />
      <Button
        type="button"
        variant={saved ? "secondary" : "outline"}
        disabled={!dirty}
        className="h-13 w-full rounded-2xl text-base font-semibold"
        onClick={() => onSave(ref.current!.toDataURL("image/jpeg", 0.8))}
      >
        {saved ? <CheckCircle className="size-5" /> : <Save className="size-5" />}
        {saved ? "Explicación lista (se guarda con la clase)" : "Guardar explicación"}
      </Button>
    </div>
  );
}
