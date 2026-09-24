import * as React from "react";
import { Link } from "@tanstack/react-router";
import { LogOut, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useSignOut } from "@/lib/auth";
import { AgendaDiaria } from "./agenda-diaria";

interface Teacher {
  id: string;
  full_name: string;
  apellidos: string;
}

export function OfficePanel({ userId }: { userId: string }) {
  const signOut = useSignOut();
  const [school, setSchool] = React.useState("");
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [selected, setSelected] = React.useState("");

  React.useEffect(() => {
    void (async () => {
      const { data: me } = await supabase.from("profiles").select("autoescuela_id").eq("id", userId).maybeSingle();
      if (!me?.autoescuela_id) return;
      const [{ data: a }, { data: profs }, { data: roles }] = await Promise.all([
        supabase.from("autoescuelas").select("nombre_comercial").eq("id", me.autoescuela_id).maybeSingle(),
        supabase.from("profiles").select("id, full_name, apellidos").eq("autoescuela_id", me.autoescuela_id).order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      setSchool(a?.nombre_comercial ?? "");
      const profIds = new Set((roles ?? []).filter((r) => r.role === "profesor").map((r) => r.user_id));
      const list = (profs ?? []).filter((p) => profIds.has(p.id)) as Teacher[];
      setTeachers(list);
      setSelected((cur) => cur || list[0]?.id || "");
    })();
  }, [userId]);

  const current = teachers.find((t) => t.id === selected);

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl leading-tight font-bold">Panel de Gestión</h1>
            {school && <p className="truncate text-sm text-muted-foreground">{school}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button asChild variant="ghost" size="icon" className="size-12 rounded-2xl">
              <Link to="/admin" aria-label="Profesores">
                <Users className="size-6" />
              </Link>
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="size-12 rounded-2xl" aria-label="Cerrar sesión" onClick={() => void signOut()}>
              <LogOut className="size-6" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        <label className="block text-sm font-bold tracking-wide text-muted-foreground uppercase" htmlFor="prof">
          Profesor
        </label>
        <select
          id="prof"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="h-14 w-full rounded-2xl border bg-background px-4 text-lg font-semibold"
        >
          {teachers.length === 0 && <option value="">No hay profesores todavía</option>}
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{[t.full_name, t.apellidos].filter(Boolean).join(" ")}</option>
          ))}
        </select>
        {current && (
          <AgendaDiaria
            key={current.id}
            profesorId={current.id}
            title={`Agenda de ${current.full_name}`}
          />
        )}
      </main>
    </div>
  );
}
