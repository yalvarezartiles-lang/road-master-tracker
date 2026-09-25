import * as React from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function PasswordCard() {
  const [pw, setPw] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) return toast.error("La contraseña debe tener al menos 6 caracteres");
    if (pw !== pw2) return toast.error("Las contraseñas no coinciden");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Contraseña actualizada");
    setPw("");
    setPw2("");
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-3 rounded-3xl border bg-card p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <KeyRound className="size-5 text-primary" /> Seguridad / Contraseña
      </h2>
      <div className="space-y-1">
        <Label htmlFor="pw1">Nueva Contraseña</Label>
        <Input id="pw1" type="password" autoComplete="new-password" className="h-12 rounded-xl" value={pw} onChange={(e) => setPw(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="pw2">Repetir Contraseña</Label>
        <Input id="pw2" type="password" autoComplete="new-password" className="h-12 rounded-xl" value={pw2} onChange={(e) => setPw2(e.target.value)} />
      </div>
      <Button type="submit" disabled={saving} className="h-12 w-full rounded-2xl text-base font-semibold">
        Actualizar Contraseña
      </Button>
    </form>
  );
}
