import * as React from "react";
import { UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useStore } from "@/lib/autoescuela/store";
import type { Student } from "@/lib/autoescuela/types";

export function StudentDialog({
  open,
  onOpenChange,
  student,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
}) {
  const { addStudent, updateStudent } = useStore();
  const [name, setName] = React.useState("");
  const [apellidos, setApellidos] = React.useState("");
  const [dni, setDni] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(student?.name ?? "");
      setApellidos(student?.apellidos ?? "");
      setDni(student?.dni ?? "");
      setPhone(student?.phone ?? "");
    }
  }, [open, student]);

  const submit = async () => {
    if (!name.trim() || !apellidos.trim() || !dni.trim()) {
      toast.error("Nombre, apellidos y DNI son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const input = { name: name.trim(), apellidos: apellidos.trim(), dni: dni.trim(), phone: phone.trim() };
      if (student) {
        await updateStudent(student.id, input);
        toast.success("Cambios guardados");
      } else {
        const created = await addStudent(input);
        if (!created) {
          toast.error("No se pudo guardar el alumno");
          return;
        }
        toast.success("Alumno añadido");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el alumno");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-5">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <UserPlus className="size-6 text-primary" />
            {student ? "Editar alumno" : "Nuevo alumno"}
          </DialogTitle>
          <DialogDescription className="text-base">
            {student
              ? "Actualiza los datos del alumno."
              : "Añade un alumno para empezar a registrar sus clases."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-base">Nombre *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre"
              className="h-14 rounded-2xl text-base"
            />
          </div>
          <div>
            <Label className="mb-2 block text-base">Apellidos *</Label>
            <Input
              value={apellidos}
              onChange={(e) => setApellidos(e.target.value)}
              placeholder="Apellidos"
              className="h-14 rounded-2xl text-base"
            />
          </div>
          <div>
            <Label className="mb-2 block text-base">DNI *</Label>
            <Input
              value={dni}
              onChange={(e) => setDni(e.target.value.toUpperCase())}
              placeholder="00000000A"
              inputMode="text"
              className="h-14 rounded-2xl text-base"
            />
          </div>
          <div>
            <Label className="mb-2 block text-base">Teléfono</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="+34 600 000 000"
              className="h-14 rounded-2xl text-base"
            />
          </div>
          <Button
            onClick={() => void submit()}
            disabled={saving}
            className="h-16 w-full rounded-2xl text-lg font-bold"
          >
            {student ? "Guardar cambios" : "Guardar alumno"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
