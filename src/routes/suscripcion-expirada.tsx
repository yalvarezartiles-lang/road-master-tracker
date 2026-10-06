import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/suscripcion-expirada")({
  beforeLoad: () => { throw redirect({ to: "/bloqueado", replace: true }); },
});
