import * as React from "react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const KEY = "cookie-consent-v1";

export function CookieConsent() {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    if (!localStorage.getItem(KEY)) setShow(true);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3">
      <div className="mx-auto flex max-w-2xl flex-col gap-3 rounded-3xl border bg-card p-4 text-card-foreground shadow-lg sm:flex-row sm:items-center">
        <Cookie className="size-6 shrink-0 text-primary" />
        <p className="flex-1 text-sm text-muted-foreground">
          Usamos únicamente cookies técnicas y de sesión, necesarias para la seguridad del portal y mantener tu acceso. No usamos cookies publicitarias.
        </p>
        <Button
          className="h-12 rounded-2xl px-6 text-base font-bold"
          onClick={() => {
            localStorage.setItem(KEY, new Date().toISOString());
            setShow(false);
          }}
        >
          Aceptar
        </Button>
      </div>
    </div>
  );
}
