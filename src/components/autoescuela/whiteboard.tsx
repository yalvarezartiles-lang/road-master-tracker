import * as React from "react";
import {
  CheckCircle,
  Eraser,
  Pencil,
  RotateCw,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COLORS = ["#111827", "#2563eb", "#dc2626", "#16a34a", "#f59e0b"];
const BOARD_WIDTH = 800;
const BOARD_HEIGHT = 500;

type ElementKind = "car" | "stop" | "yield" | "traffic-light";
type BoardElement = {
  id: string;
  kind: ElementKind;
  x: number;
  y: number;
  rotation: number;
};

const ELEMENTS: { kind: ElementKind; label: string }[] = [
  { kind: "car", label: "Coche" },
  { kind: "stop", label: "STOP" },
  { kind: "yield", label: "Ceda" },
  { kind: "traffic-light", label: "Semáforo" },
];

function ElementGraphic({ kind }: { kind: ElementKind }) {
  if (kind === "car") {
    return (
      <svg viewBox="0 0 64 88" aria-hidden="true" className="h-full w-full drop-shadow-sm">
        <rect x="10" y="3" width="44" height="82" rx="14" className="fill-primary stroke-foreground" strokeWidth="3" />
        <path d="M17 25 22 12h20l5 13Z" className="fill-primary-foreground/80 stroke-foreground" strokeWidth="2" />
        <path d="M16 60h32l-4 15H20Z" className="fill-primary-foreground/80 stroke-foreground" strokeWidth="2" />
        <path d="M7 20h5M52 20h5M7 66h5M52 66h5" className="stroke-foreground" strokeWidth="6" strokeLinecap="round" />
        <path d="m25 8 7-5 7 5" className="fill-none stroke-primary-foreground" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "stop") {
    return (
      <svg viewBox="0 0 88 88" aria-hidden="true" className="h-full w-full drop-shadow-sm">
        <path d="m28 4 32 0 24 24 0 32-24 24H28L4 60V28Z" className="fill-destructive stroke-background" strokeWidth="5" />
        <text x="44" y="51" textAnchor="middle" className="fill-destructive-foreground text-[20px] font-black">STOP</text>
      </svg>
    );
  }
  if (kind === "yield") {
    return (
      <svg viewBox="0 0 88 88" aria-hidden="true" className="h-full w-full drop-shadow-sm">
        <path d="M44 80 5 12h78Z" className="fill-background stroke-destructive" strokeWidth="8" strokeLinejoin="round" />
        <path d="M44 66 19 22h50Z" className="fill-background" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 96" aria-hidden="true" className="h-full w-full drop-shadow-sm">
      <rect x="8" y="2" width="48" height="82" rx="11" className="fill-foreground stroke-background" strokeWidth="3" />
      <circle cx="32" cy="20" r="10" className="fill-danger" />
      <circle cx="32" cy="43" r="10" className="fill-warning" />
      <circle cx="32" cy="66" r="10" className="fill-success" />
      <path d="M32 84v10M17 94h30" className="stroke-foreground" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function drawElement(ctx: CanvasRenderingContext2D, element: BoardElement) {
  ctx.save();
  ctx.translate(element.x, element.y);
  ctx.rotate((element.rotation * Math.PI) / 180);
  if (element.kind === "car") {
    ctx.fillStyle = "#2563eb";
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-25, -39, 50, 78, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#dbeafe";
    ctx.fillRect(-17, -23, 34, 16);
    ctx.fillRect(-17, 12, 34, 16);
    ctx.fillStyle = "#111827";
    ctx.fillRect(-29, -26, 6, 17);
    ctx.fillRect(23, -26, 6, 17);
    ctx.fillRect(-29, 11, 6, 17);
    ctx.fillRect(23, 11, 6, 17);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(-8, -29);
    ctx.lineTo(0, -36);
    ctx.lineTo(8, -29);
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();
  } else if (element.kind === "stop") {
    ctx.fillStyle = "#dc2626";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const angle = Math.PI / 8 + (i * Math.PI) / 4;
      const x = Math.cos(angle) * 38;
      const y = Math.sin(angle) * 38;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 19px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("STOP", 0, 1);
  } else if (element.kind === "yield") {
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#dc2626";
    ctx.lineWidth = 8;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(0, 38);
    ctx.lineTo(-38, -30);
    ctx.lineTo(38, -30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.roundRect(-23, -39, 46, 77, 10);
    ctx.fill();
    ["#dc2626", "#f59e0b", "#16a34a"].forEach((light, index) => {
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.arc(0, -24 + index * 24, 9, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.restore();
}

export function Whiteboard({
  saved,
  onSave,
}: {
  saved: boolean;
  onSave: (dataUrl: string | null) => void;
}) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const boardRef = React.useRef<HTMLDivElement>(null);
  const drawing = React.useRef(false);
  const last = React.useRef<{ x: number; y: number } | null>(null);
  const drag = React.useRef<{ id: string; pointerId: number } | null>(null);
  const [color, setColor] = React.useState(COLORS[0] ?? "#111827");
  const [eraser, setEraser] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [elements, setElements] = React.useState<BoardElement[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const markDirty = () => {
    setDirty(true);
    if (saved) onSave(null);
  };

  const fill = () => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  React.useEffect(fill, []);

  const boardPosition = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.max(42, Math.min(BOARD_WIDTH - 42, ((clientX - rect.left) * BOARD_WIDTH) / rect.width)),
      y: Math.max(42, Math.min(BOARD_HEIGHT - 42, ((clientY - rect.top) * BOARD_HEIGHT) / rect.height)),
    };
  };

  const canvasPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = ref.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const addElement = (kind: ElementKind, point = { x: BOARD_WIDTH / 2, y: BOARD_HEIGHT / 2 }) => {
    const element: BoardElement = { id: crypto.randomUUID(), kind, ...point, rotation: 0 };
    setElements((current) => [...current, element]);
    setSelectedId(element.id);
    markDirty();
  };

  const down = (event: React.PointerEvent<HTMLCanvasElement>) => {
    setSelectedId(null);
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    last.current = canvasPosition(event);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const ctx = ref.current?.getContext("2d");
    const point = canvasPosition(event);
    if (!ctx || !point) return;
    ctx.strokeStyle = eraser ? "#ffffff" : color;
    ctx.lineWidth = eraser ? 28 : 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    last.current = point;
    markDirty();
  };

  const stopDrawing = () => {
    drawing.current = false;
    last.current = null;
  };

  const startElementDrag = (event: React.PointerEvent<HTMLDivElement>, id: string) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id, pointerId: event.pointerId };
    setSelectedId(id);
  };

  const moveElement = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    const point = boardPosition(event.clientX, event.clientY);
    if (!point) return;
    setElements((current) => current.map((item) => item.id === drag.current?.id ? { ...item, ...point } : item));
    markDirty();
  };

  const stopElementDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  };

  const saveBoard = () => {
    const canvas = ref.current;
    if (!canvas) return;
    const output = document.createElement("canvas");
    output.width = BOARD_WIDTH;
    output.height = BOARD_HEIGHT;
    const ctx = output.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(canvas, 0, 0);
    elements.forEach((element) => drawElement(ctx, element));
    onSave(output.toDataURL("image/jpeg", 0.86));
    setSelectedId(null);
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 lg:w-28 lg:flex-col lg:overflow-visible" aria-label="Elementos de tráfico">
          {ELEMENTS.map(({ kind, label }) => (
            <Button
              key={kind}
              type="button"
              variant="outline"
              draggable
              onDragStart={(event) => event.dataTransfer.setData("application/x-board-element", kind)}
              onClick={() => addElement(kind)}
              className="h-20 min-w-20 shrink-0 flex-col gap-1 rounded-2xl px-2 text-xs lg:w-full"
              aria-label={`Añadir ${label}`}
            >
              <span className="h-10 w-10"><ElementGraphic kind={kind} /></span>
              {label}
            </Button>
          ))}
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {COLORS.map((itemColor) => (
              <button
                key={itemColor}
                type="button"
                aria-label={`Color ${itemColor}`}
                onClick={() => { setColor(itemColor); setEraser(false); }}
                className={cn("size-11 rounded-full border-4", !eraser && color === itemColor ? "border-primary" : "border-border")}
                style={{ background: itemColor }}
              />
            ))}
            <Button type="button" variant={eraser ? "default" : "outline"} className="h-11 rounded-2xl" onClick={() => setEraser((value) => !value)} aria-label={eraser ? "Lápiz" : "Goma"}>
              {eraser ? <Pencil className="size-5" /> : <Eraser className="size-5" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-2xl"
              aria-label="Limpiar pizarra"
              onClick={() => { fill(); setElements([]); setSelectedId(null); setDirty(false); onSave(null); }}
            >
              <Trash2 className="size-5" />
            </Button>
          </div>

          <div
            ref={boardRef}
            className="relative w-full overflow-hidden rounded-2xl border-2 bg-background"
            style={{ aspectRatio: "8 / 5" }}
            onPointerDown={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const kind = event.dataTransfer.getData("application/x-board-element") as ElementKind;
              const point = boardPosition(event.clientX, event.clientY);
              if (point && ELEMENTS.some((item) => item.kind === kind)) addElement(kind, point);
            }}
          >
            <canvas
              ref={ref}
              width={BOARD_WIDTH}
              height={BOARD_HEIGHT}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              className="absolute inset-0 h-full w-full touch-none bg-background"
            />
            <div className="pointer-events-none absolute inset-0">
              {elements.map((element) => {
                const selected = selectedId === element.id;
                return (
                  <div
                    key={element.id}
                    className={cn("pointer-events-auto absolute size-16 touch-none select-none sm:size-20", selected && "z-20")}
                    style={{ left: `${(element.x / BOARD_WIDTH) * 100}%`, top: `${(element.y / BOARD_HEIGHT) * 100}%`, transform: "translate(-50%, -50%)" }}
                    onPointerDown={(event) => startElementDrag(event, element.id)}
                    onPointerMove={moveElement}
                    onPointerUp={stopElementDrag}
                    onPointerCancel={stopElementDrag}
                    aria-label={`${ELEMENTS.find((item) => item.kind === element.kind)?.label ?? "Elemento"} en la pizarra`}
                  >
                    <div className={cn("h-full w-full rounded-xl p-1", selected && "ring-2 ring-primary ring-offset-2 ring-offset-background")} style={{ transform: `rotate(${element.rotation}deg)` }}>
                      <ElementGraphic kind={element.kind} />
                    </div>
                    {selected && (
                      <div className="absolute -top-12 left-1/2 flex -translate-x-1/2 gap-2" onPointerDown={(event) => event.stopPropagation()}>
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="size-11 rounded-full border shadow-md"
                          aria-label="Girar elemento 45 grados"
                          onClick={() => { setElements((current) => current.map((item) => item.id === element.id ? { ...item, rotation: item.rotation + 45 } : item)); markDirty(); }}
                        >
                          <RotateCw className="size-5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="size-11 rounded-full shadow-md"
                          aria-label="Eliminar elemento"
                          onClick={() => { setElements((current) => current.filter((item) => item.id !== element.id)); setSelectedId(null); markDirty(); }}
                        >
                          <Trash2 className="size-5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Button type="button" variant={saved ? "secondary" : "outline"} disabled={!dirty} className="h-13 w-full rounded-2xl text-base font-semibold" onClick={saveBoard}>
        {saved ? <CheckCircle className="size-5" /> : <Save className="size-5" />}
        {saved ? "Explicación lista (se guarda con la clase)" : "Guardar explicación"}
      </Button>
    </div>
  );
}