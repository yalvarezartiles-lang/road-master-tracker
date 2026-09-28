import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/terminos")({
  head: () => ({
    meta: [
      { title: "Términos de Uso" },
      {
        name: "description",
        content: "Términos de uso de la plataforma de seguimiento de clases prácticas de autoescuela.",
      },
      { property: "og:title", content: "Términos de Uso" },
      {
        property: "og:description",
        content: "Condiciones de uso de la plataforma para autoescuelas.",
      },
    ],
  }),
  component: TerminosPage,
});

function TerminosPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/auth" search={{ next: undefined }}>
            <ArrowLeft className="size-4" />
            Volver al Login
          </Link>
        </Button>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="text-3xl font-extrabold">Términos de Uso</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última actualización: septiembre de 2026
        </p>

        <div className="mt-6 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="font-semibold text-amber-600 dark:text-amber-400">
            ⚠️ Aviso: software en fase Beta
          </p>
          <p className="mt-2 text-sm leading-relaxed">
            Este software se encuentra actualmente en fase de desarrollo (Beta).
            Se ofrece <strong>sin coste</strong> con la única finalidad de
            realizar pruebas y evaluación técnica. El servicio puede sufrir
            reinicios, interrupciones o pérdidas temporales de disponibilidad en
            cualquier momento, y no está destinado a uso comercial ni en
            producción durante esta fase.
          </p>
        </div>

        <div className="mt-8 space-y-8 text-base leading-relaxed">
          <section>
            <h2 className="text-xl font-bold">1. Objeto del servicio</h2>
            <p className="mt-2">
              La presente plataforma es una herramienta de gestión destinada a
              autoescuelas y profesionales de la formación vial, que permite
              registrar y evaluar clases prácticas, gestionar alumnos y agendas,
              y generar documentación de seguimiento. El acceso está limitado a
              cuentas autorizadas por la organización titular.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">2. Condiciones de acceso</h2>
            <p className="mt-2">
              El registro de nuevas cuentas está cerrado al público. Solo la
              administración de la organización titular puede crear cuentas de
              acceso. El usuario es responsable de la custodia de sus
              credenciales y de todo uso que se realice a través de ellas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">3. Uso adecuado del servicio</h2>
            <p className="mt-2">
              El usuario se compromete a utilizar la plataforma conforme a la
              legislación vigente, en particular el Reglamento (UE) 2016/679
              (RGPD) y la Ley Orgánica 3/2018 de Protección de Datos, y a no
              introducir datos de terceros sin la base legal correspondiente.
              Queda prohibido ceder el acceso a terceros no autorizados,
              intentar vulnerar los mecanismos de seguridad o extraer datos de
              otras organizaciones.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">4. Responsabilidad sobre los datos</h2>
            <p className="mt-2">
              La organización titular de la suscripción actúa como Responsable
              del Tratamiento de los datos de alumnos y clases registrados. El
              proveedor de la plataforma actúa como Encargado del Tratamiento,
              tratando los datos únicamente por instrucciones del Responsable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">5. Disponibilidad y soporte</h2>
            <p className="mt-2">
              Al tratarse de un proyecto en fase Beta, el Desarrollador no
              garantiza la disponibilidad continua del servicio: este puede
              sufrir reinicios, interrupciones o períodos de indisponibilidad
              sin previo aviso. El Desarrollador no será responsable de daños
              derivados de un uso indebido de la herramienta, de la pérdida de
              datos no atribuible a esta ni de las interrupciones propias de la
              fase de pruebas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">6. Propiedad intelectual</h2>
            <p className="mt-2">
              El software, los diseños y los contenidos de la plataforma son
              titularidad de su proveedor, que concede al usuario un derecho de
              uso limitado, no exclusivo e intransferible mientras dure la
              relación de servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">7. Terminación</h2>
            <p className="mt-2">
              La administración titular puede desactivar cuentas en cualquier
              momento. El proveedor puede suspender el servicio ante usos
              fraudulentos o contrarios a la ley. Tras la finalización, los
              datos se tratarán conforme a la Política de Privacidad y a la
              normativa de conservación aplicable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">8. Legislación aplicable</h2>
            <p className="mt-2">
              Estos términos se rigen por la legislación española. Cualquier
              controversia se someterá a los juzgados y tribunales que
              corresponda conforme a la normativa procesal vigente.
            </p>
          </section>

          <p className="border-t pt-6 text-sm text-muted-foreground">
            Este documento es un borrador de trabajo y debe ser revisado por un
            profesional jurídico antes de su uso definitivo.
          </p>
        </div>
      </main>
    </div>
  );
}
