import * as React from "react";
import { Car, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth/auth";

export function Login() {
  const { login } = useAuth();
  const [user, setUser] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const ok = login(user, password);
    if (!ok) {
      toast.error("Usuario o contraseña incorrectos");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground">
            <Car className="size-9" />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
            Autoescuela Adassa
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acceso privado para el profesor
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border bg-card p-6 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="user" className="text-sm font-semibold">
              Usuario
            </Label>
            <div className="relative">
              <User className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="user"
                name="username"
                autoComplete="username"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="admin"
                className="h-14 rounded-2xl pl-12 text-base"
                required
              />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold">
              Contraseña
            </Label>
            <div className="relative">
              <Lock className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-14 rounded-2xl pl-12 text-base"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="mt-6 h-16 w-full rounded-3xl text-lg font-extrabold shadow-lg"
          >
            Entrar
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Sistema cerrado · acceso restringido a personal autorizado
        </p>
      </div>
    </div>
  );
}
