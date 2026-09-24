import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acceso" },
      {
        name: "description",
        content:
          "Acceso privado al panel de clases prácticas.",
      },
      { property: "og:title", content: "Acceso" },
      {
        property: "og:description",
        content: "Panel privado para profesores.",
      },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/panel" });
  },
  component: () => null,
});
