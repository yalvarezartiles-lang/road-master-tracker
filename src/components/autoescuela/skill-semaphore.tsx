import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown, CheckCheck, Plus, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/autoescuela/store";
import { useCurrentUser } from "@/lib/auth";
import { SKILL_BLOCKS, nextLevel, toDbLevel, type SkillItem, type Student } from "@/lib/autoescuela/types";
import { LEVELS, LevelIcon, levelClasses } from "./skill-traffic-light";

const err = (e: unknown) => toast.error(e instanceof Error ? e.message : "Error");

export function SkillProgressBanner({ student }: { student: Student }) {
  const { data } = useStore();
  const total = data.skills.length;
  const points = data.skills.reduce((acc, k) => acc + toDbLevel(student.skills[k.id] ?? "rojo"), 0);
  const pct = total ? Math.round((points / (total * 2)) * 100) : 0;
  const done = total > 0 && points === total * 2;
  return (
    <section
      className={cn(
        "rounded-3xl border-2 p-5 transition-colors",
        done ? "border-success bg-success text-success-foreground" : "bg-card",
      )}
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-extrabold">
          {done ? (
            <span className="flex items-center gap-2">
              <Trophy className="size-7" /> ¡Apto para Examen Oficial!
            </span>
          ) : (
            "Progreso general"
          )}
        </p>
        <p className="text-3xl font-black tabular-nums">{pct}%</p>
      </div>
      <div className={cn("mt-3 h-4 overflow-hidden rounded-full", done ? "bg-success-foreground/30" : "bg-muted")}>
        <div
          className={cn("h-full rounded-full transition-all", done ? "bg-success-foreground" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  );
}

export function SkillSemaphore({
  student,
  modoLectura = false,
}: {
  student: Student;
  modoLectura?: boolean;
}) {
  const { data, setSkill, setBlockGreen, addSkill, deleteSkill } = useStore();
  const { isAdmin: esAdmin } = useCurrentUser();
  const isAdmin = esAdmin && !modoLectura;
  const [toDelete, setToDelete] = React.useState<SkillItem | null>(null);

  return (
    <>
      <AccordionPrimitive.Root type="multiple" className="space-y-3">
        {SKILL_BLOCKS.map((block) => {
          const items = data.skills.filter((k) => k.block === block.id);
          const green = items.filter((k) => student.skills[k.id] === "verde").length;
          return (
            <AccordionPrimitive.Item
              key={block.id}
              value={String(block.id)}
              className="overflow-hidden rounded-3xl border bg-card"
            >
              <AccordionPrimitive.Header className="flex items-center gap-2 p-2">
                <AccordionPrimitive.Trigger className="group flex min-h-16 flex-1 items-center gap-3 rounded-2xl px-3 text-left">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-lg font-black text-primary-foreground">
                    {block.id}
                  </span>
                  <span className="flex-1">
                    <span className="block text-lg font-bold leading-tight">{block.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {green}/{items.length} dominadas
                    </span>
                  </span>
                  <ChevronDown className="size-6 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
                </AccordionPrimitive.Trigger>
                {!modoLectura && (
                <Button
                  variant="outline"
                  className="h-14 shrink-0 rounded-2xl border-success px-3 text-success"
                  disabled={items.length === 0 || green === items.length}
                  aria-label={`Marcar todo ${block.name} en verde`}
                  onClick={() =>
                    setBlockGreen(student.id, block.id)
                      .then(() => toast.success(`${block.name}: todo en verde`))
                      .catch(err)
                  }
                >
                  <CheckCheck className="size-6" />
                  <span className="hidden sm:inline">Todo verde</span>
                </Button>
                )}
              </AccordionPrimitive.Header>
              <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <ul className="space-y-2 px-3 pb-3">
                  {items.map((k) => {
                    const level = student.skills[k.id] ?? "rojo";
                    const label = LEVELS.find((l) => l.key === level)!.label;
                    return (
                      <li key={k.id} className="flex items-center gap-2 rounded-2xl border p-2 pl-4">
                        <span className="flex-1 text-base font-semibold">{k.name}</span>
                        <button
                          type="button"
                          disabled={modoLectura}
                          onClick={() => !modoLectura && setSkill(student.id, k.id, nextLevel(level)).catch(err)}
                          aria-label={modoLectura ? `${k.name}: ${label}` : `${k.name}: ${label}. Pulsa para cambiar`}
                          className={cn(
                            "flex h-14 min-w-32 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-bold transition",
                            modoLectura ? "cursor-default" : "active:scale-95",
                            levelClasses[level],
                          )}
                        >
                          <LevelIcon level={level} className="size-6" />
                          {label}
                        </button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-12 rounded-2xl text-destructive"
                            aria-label={`Borrar habilidad ${k.name}`}
                            onClick={() => setToDelete(k)}
                          >
                            <Trash2 className="size-5" />
                          </Button>
                        )}
                      </li>
                    );
                  })}
                  {items.length === 0 && (
                    <li className="rounded-2xl border border-dashed p-4 text-center text-muted-foreground">
                      Sin habilidades en este bloque.
                    </li>
                  )}
                  {isAdmin && <AddSkillRow onAdd={(name) => addSkill(name, block.id)} />}
                </ul>
              </AccordionPrimitive.Content>
            </AccordionPrimitive.Item>
          );
        })}
      </AccordionPrimitive.Root>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar "{toDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Desaparecerá para todos los profesores y alumnos. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12 rounded-2xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="h-12 rounded-2xl bg-destructive text-destructive-foreground"
              onClick={() => {
                if (toDelete) deleteSkill(toDelete.id).then(() => toast.success("Habilidad borrada")).catch(err);
                setToDelete(null);
              }}
            >
              Borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AddSkillRow({ onAdd }: { onAdd: (name: string) => Promise<void> }) {
  const [value, setValue] = React.useState("");
  const add = async () => {
    const v = value.trim();
    if (!v) return;
    try {
      await onAdd(v);
      setValue("");
      toast.success("Habilidad añadida");
    } catch (e) {
      err(e);
    }
  };
  return (
    <li className="flex gap-2 pt-1">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && void add()}
        placeholder="Nueva habilidad"
        className="h-14 rounded-2xl text-base"
      />
      <Button onClick={() => void add()} className="h-14 rounded-2xl px-4 font-bold">
        <Plus className="size-5" /> Añadir habilidad
      </Button>
    </li>
  );
}
