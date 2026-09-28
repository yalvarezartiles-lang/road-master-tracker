import * as React from "react";
import { Cookie } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const KEY = "cookie-consent-v1";

/** true solo si el usuario aceptó todas las cookies (analíticas incluidas). */
export function analyticsAllowed() {
  if (typeof localStorage === "undefined") return false;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    return JSON.parse(raw)?.analytics === true;
  } catch {
    return false;
  }
}

export function CookieConsent() {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    if (!localStorage.getItem(KEY)) setShow(true);
  }, []);

  const decide = (analytics: boolean) => {
    localStorage.setItem(KEY, JSON.stringify({ analytics, date: new Date().toISOString() }));
    setShow(false);
  };

  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3">
      <div className="mx-auto flex max-w-2xl flex-col gap-3 rounded-3xl border bg-card p-4 text-card-foreground shadow-lg">
        <div className="flex gap-3">
          <Cookie className="size-6 shrink-0 text-primary" />
          <p className="flex-1 text-sm text-muted-foreground">
            Usamos cookies técnicas y de sesión, necesarias para la seguridad del portal y mantener tu acceso.
            No usamos cookies publicitarias. Más detalles en la{" "}
            <Link to="/politica-cookies" className="text-blue-500 hover:underline">Política de Cookies</Link>.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            aria-label="Solo Necesarias: aceptar solo cookies necesarias"
            className="h-12 rounded-2xl px-6 text-base font-bold"
            onClick={() => decide(false)}
          >
            Solo Necesarias
          </Button>
          <Button
            aria-label="Aceptar Todas las cookies"
            className="h-12 rounded-2xl px-6 text-base font-bold"
            onClick={() => decide(true)}
          >
            Aceptar Todas
          </Button>
        </div>
      </div>
    </div>
  );
}
