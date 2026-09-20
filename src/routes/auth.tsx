import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Car, Loader2, LogIn, ShieldPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/integrations/supabase/client";
import { createFirstAdmin, getSetupStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Iniciar sesión — Autoescuela Adassa" },
      {
        name: "description",
        content: "Acceso privado para el equipo de la Autoescuela Adassa.",
      },
      { property: "og:title", content: "Iniciar sesión — Autoescuela Adassa" },
      {
        property: "og:description",
        content: "Acceso privado para profesores y administración.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const checkSetup = useServerFn(getSetupStatus);
  const setupAdmin = useServerFn(createFirstAdmin);

  const [needsSetup, setNeedsSetup] = React.useState(false);
  const [checking, setChecking] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  React.useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        navigate({ to: "/panel", replace: true });
        return;
      }
      try {
        const status = await checkSetup({});
        setNeedsSetup(status.needsSetup);
      } catch {
        /* ignore */
      }
      setChecking(false);
    })();
  }, [checkSetup, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (needsSetup) {
        await setupAdmin({ data: { email, password, fullName } });
        toast.success("Cuenta de administrador creada");
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error("Email o contraseña incorrectos");
      navigate({ to: "/panel", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-4">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Car className="size-7" />
        </span>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-16">
        <h1 className="text-3xl font-extrabold">Autoescuela Adassa</h1>
        <p className="mt-2 text-base text-muted-foreground">
          {checking
            ? "Comprobando acceso…"
            : needsSetup
              ? "Crea la cuenta de administrador para empezar."
              : "Acceso exclusivo para el equipo."}
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          {needsSetup && (
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-base">
                Tu nombre
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-14 rounded-2xl text-base"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-14 rounded-2xl text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-base">
              Contraseña
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete={needsSetup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-14 rounded-2xl text-base"
            />
          </div>

          <Button
            type="submit"
            disabled={busy || checking}
            className="h-16 w-full rounded-3xl text-lg font-extrabold"
          >
            {busy ? (
              <Loader2 className="size-6 animate-spin" />
            ) : needsSetup ? (
              <ShieldPlus className="size-6" />
            ) : (
              <LogIn className="size-6" />
            )}
            {needsSetup ? "Crear administrador" : "Entrar"}
          </Button>
        </form>

        {!needsSetup && !checking && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            El registro está cerrado. Solo el administrador puede crear cuentas.
          </p>
        )}
      </main>
    </div>
  );
}
