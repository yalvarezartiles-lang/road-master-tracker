import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, Shield, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ThemeToggle } from "@/components/theme-toggle";
import { useCurrentUser } from "@/lib/auth";
import { createTeamMember, deleteTeamMember, listTeam } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administración — Autoescuela Adassa" },
      {
        name: "description",
        content: "Gestión de cuentas de profesores de la Autoescuela Adassa.",
      },
      { property: "og:title", content: "Administración — Autoescuela Adassa" },
      {
        property: "og:description",
        content: "Crea y gestiona las cuentas del equipo docente.",
      },
    ],
  }),
  component: AdminPage,
});

interface Member {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "profesor";
}

function AdminPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: loadingUser } = useCurrentUser();
  const fetchTeam = useServerFn(listTeam);
  const createMember = useServerFn(createTeamMember);
  const removeMember = useServerFn(deleteTeamMember);

  const [team, setTeam] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<"admin" | "profesor">("profesor");
  const [toDelete, setToDelete] = React.useState<Member | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setTeam((await fetchTeam({})) as Member[]);
    } catch {
      toast.error("No se pudo cargar el equipo");
    } finally {
      setLoading(false);
    }
  }, [fetchTeam]);

  React.useEffect(() => {
    if (loadingUser) return;
    if (!isAdmin) {
      navigate({ to: "/panel", replace: true });
      return;
    }
    void load();
  }, [isAdmin, loadingUser, load, navigate]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await createMember({ data: { fullName, email, password, role } });
      toast.success("Cuenta creada");
      setFullName("");
      setEmail("");
      setPassword("");
      setRole("profesor");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear la cuenta");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!toDelete) return;
    try {
      await removeMember({ data: { userId: toDelete.id } });
      toast.success("Cuenta eliminada");
      setToDelete(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link
            to="/panel"
            className="flex size-12 items-center justify-center rounded-2xl border"
            aria-label="Volver"
          >
            <ArrowLeft className="size-6" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-4 py-5">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Shield className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold">Administración</h1>
            <p className="text-sm text-muted-foreground">Cuentas del equipo</p>
          </div>
        </div>

        <section className="rounded-3xl border bg-card p-5">
          <h2 className="text-lg font-bold">Crear cuenta de profesor</h2>
          <form onSubmit={onCreate} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nm" className="text-base">
                Nombre
              </Label>
              <Input
                id="nm"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-14 rounded-2xl text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="em" className="text-base">
                Email
              </Label>
              <Input
                id="em"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-14 rounded-2xl text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw" className="text-base">
                Contraseña
              </Label>
              <Input
                id="pw"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-14 rounded-2xl text-base"
              />
            </div>
            <div className="flex gap-2">
              {(["profesor", "admin"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`h-14 flex-1 rounded-2xl border-2 text-base font-semibold capitalize ${
                    role === r
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/40"
                  }`}
                >
                  {r === "admin" ? "Administrador" : "Profesor"}
                </button>
              ))}
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="h-16 w-full rounded-3xl text-lg font-extrabold"
            >
              {busy ? <Loader2 className="size-6 animate-spin" /> : <UserPlus className="size-6" />}
              Crear cuenta
            </Button>
          </form>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">Equipo ({team.length})</h2>
          <ul className="space-y-3">
            {team.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-3xl border bg-card p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold">{m.full_name || m.email}</p>
                  <p className="truncate text-sm text-muted-foreground">{m.email}</p>
                  <span className="mt-1 inline-flex rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase">
                    {m.role === "admin" ? "Administrador" : "Profesor"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Eliminar ${m.email}`}
                  onClick={() => setToDelete(m)}
                  className="size-14 shrink-0 rounded-2xl text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-6" />
                </Button>
              </li>
            ))}
            {team.length === 0 && (
              <li className="rounded-3xl border border-dashed p-8 text-center text-muted-foreground">
                {loading ? "Cargando…" : "Todavía no hay cuentas."}
              </li>
            )}
          </ul>
        </section>
      </main>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta cuenta?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.email} perderá el acceso a la aplicación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-14 rounded-2xl text-base">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void onDelete();
              }}
              className="h-14 rounded-2xl bg-destructive text-base text-white hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
