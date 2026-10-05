import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudentManager } from "@/components/autoescuela/student-manager";

export const Route = createFileRoute("/_authenticated/alumnos")({
  head: () => ({
    meta: [
      { title: "Gestión de alumnos" },
      { name: "description", content: "Alumnos activos y archivados de la autoescuela." },
      { property: "og:title", content: "Gestión de alumnos" },
      { property: "og:description", content: "Archiva y recupera alumnos en un toque." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AlumnosPage,
});

function AlumnosPage() {
  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex items-center gap-2 border-b px-3 py-3">
        <Button asChild variant="ghost" size="icon" className="size-12 rounded-2xl" aria-label="Volver">
          <Link to="/panel"><ArrowLeft className="size-6" /></Link>
        </Button>
        <h1 className="text-xl font-bold tracking-tight">Gestión de alumnos</h1>
      </header>
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col p-4"><StudentManager /></div>
    </div>
  );
}
