import * as React from "react";
import { LessonDialog } from "@/components/autoescuela/lesson-dialog";

/** Clase suelta: abre el modal completo de "Registrar clase" con selección de alumno y hora. */
export function ClaseSuelta({ profesorId, trigger, onSaved }: { profesorId: string; trigger: React.ReactElement<{ onClick?: () => void }>; onSaved?: () => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      {React.cloneElement(trigger, { onClick: () => setOpen(true) })}
      <LessonDialog open={open} onOpenChange={setOpen} suelta={{ profesorId }} onSaved={onSaved} />
    </>
  );
}
