import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Autoescuela Adassa — Acceso" },
      {
        name: "description",
        content:
          "Acceso privado al panel de clases prácticas de la Autoescuela Adassa.",
      },
      { property: "og:title", content: "Autoescuela Adassa — Acceso" },
      {
        property: "og:description",
        content: "Panel privado para profesores de la Autoescuela Adassa.",
      },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/panel" });
  },
  component: () => null,
});
