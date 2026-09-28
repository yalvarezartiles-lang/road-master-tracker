import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/politica-cookies")({
  head: () => ({
    meta: [
      { title: "Política de Cookies" },
      { name: "description", content: "Cookies técnicas y de sesión utilizadas en la plataforma de seguimiento de clases prácticas." },
      { property: "og:title", content: "Política de Cookies" },
      { property: "og:description", content: "Información sobre las cookies utilizadas y cómo gestionarlas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/80 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto max-w-2xl">
          <Button asChild variant="ghost" className="h-12 rounded-2xl px-3 text-base">
            <Link to="/auth" aria-label="Volver al inicio de sesión">
              <ArrowLeft className="size-5" /> Volver al Login
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6 text-base leading-relaxed">
        <h1 className="text-3xl font-bold tracking-tight">Política de Cookies</h1>

        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          ⚠️ Aviso: la plataforma se encuentra en fase Beta, se ofrece sin coste con fines de prueba y evaluación técnica.
        </div>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">1. Qué son las cookies</h2>
          <p className="text-muted-foreground">
            Son pequeños archivos que se guardan en tu dispositivo al visitar la plataforma. Permiten
            recordar tu sesión y garantizar el funcionamiento seguro del servicio.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">2. Cookies necesarias</h2>
          <p className="text-muted-foreground">
            Imprescindibles para iniciar sesión, mantener tu acceso y proteger la cuenta frente a accesos no
            autorizados. Incluyen el testigo de sesión de autenticación y la preferencia de consentimiento de
            cookies. No requieren consentimiento previo conforme al artículo 22.2 de la LSSI.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">3. Cookies analíticas y de terceros</h2>
          <p className="text-muted-foreground">
            Actualmente la plataforma no carga cookies publicitarias ni de perfilado. Cualquier medición
            estadística futura solo se activará si pulsas «Aceptar Todas»; con «Solo Necesarias» no se cargará
            ningún script de analítica.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">4. Cómo gestionar tu elección</h2>
          <p className="text-muted-foreground">
            Puedes revocar o cambiar tu consentimiento en cualquier momento borrando los datos de navegación de
            tu navegador; al volver a entrar se mostrará de nuevo el aviso. También puedes bloquear o eliminar
            cookies desde la configuración de tu navegador, aunque esto puede impedir el inicio de sesión.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">5. Conservación</h2>
          <p className="text-muted-foreground">
            La cookie de sesión caduca al cerrar sesión o expirar el acceso. La preferencia de consentimiento se
            conserva en tu dispositivo hasta que borres los datos del navegador.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">6. Más información</h2>
          <p className="text-muted-foreground">
            Consulta también la{" "}
            <Link to="/privacidad" className="text-blue-500 hover:underline">Política de Privacidad</Link> y los{" "}
            <Link to="/terminos" className="text-blue-500 hover:underline">Términos de Uso</Link>.
          </p>
        </section>

        <p className="pt-4 text-sm text-muted-foreground">
          Documento de trabajo en fase Beta, sujeto a revisión jurídica antes de su uso definitivo.
        </p>
      </main>
    </div>
  );
}
