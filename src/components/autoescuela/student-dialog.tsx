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

export function StudentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addStudent } = useStore();
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setName("");
      setPhone("");
    }
  }, [open]);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Escribe el nombre del alumno");
      return;
    }
    const created = await addStudent({ name: name.trim(), phone: phone.trim() });
    if (!created) {
      toast.error("No se pudo guardar el alumno");
      return;
    }
    toast.success("Alumno añadido");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-5">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <UserPlus className="size-6 text-primary" /> Nuevo alumno
          </DialogTitle>
          <DialogDescription className="text-base">
            Añade un alumno para empezar a registrar sus clases.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block text-base">Nombre</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre y apellidos"
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
          <Button onClick={() => void submit()} className="h-16 w-full rounded-2xl text-lg font-bold">
            Guardar alumno
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
