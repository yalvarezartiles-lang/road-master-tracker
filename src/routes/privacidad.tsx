import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/privacidad")({
  head: () => ({
    meta: [
      { title: "Política de Privacidad" },
      {
        name: "description",
        content: "Política de privacidad y protección de datos de la plataforma de seguimiento de clases prácticas.",
      },
      { property: "og:title", content: "Política de Privacidad" },
      {
        property: "og:description",
        content: "Cómo tratamos los datos personales conforme al RGPD.",
      },
    ],
  }),
  component: PrivacidadPage,
});

function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/auth">
            <ArrowLeft className="size-4" />
            Volver al Login
          </Link>
        </Button>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="text-3xl font-extrabold">Política de Privacidad</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Última actualización: septiembre de 2026
        </p>

        <div className="mt-8 space-y-8 text-base leading-relaxed">
          <section>
            <h2 className="text-xl font-bold">1. Responsable del Tratamiento</h2>
            <p className="mt-2">
              El Responsable del Tratamiento de los datos personales registrados
              en la plataforma es la autoescuela u organización titular de la
              suscripción, con los datos de contacto que figuren en su contrato
              de servicio. El proveedor tecnológico de la plataforma actúa como
              Encargado del Tratamiento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">2. Datos que se tratan</h2>
            <p className="mt-2">
              La plataforma trata las siguientes categorías de datos, facilitados
              por los profesionales autorizados de cada organización:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                Datos de los profesionales: nombre, correo electrónico y
                contraseña de acceso (almacenada únicamente en forma cifrada).
              </li>
              <li>
                Datos de los alumnos: nombre, apellidos, teléfono y sección de
                formación.
              </li>
              <li>
                Datos de las clases: fechas, horarios, zonas, evaluaciones de
                habilidades, observaciones y firma manuscrita del alumno como
                acreditación de asistencia.
              </li>
            </ul>
            <p className="mt-2">
              No se tratan categorías especiales de datos ni datos de menores, y
              las imágenes capturadas por el escáner de cuadrantes no se
              almacenan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">3. Finalidad y base jurídica</h2>
            <p className="mt-2">
              Los datos se tratan con la finalidad de gestionar la formación
              práctica vial: planificación de clases, seguimiento del progreso
              del alumno y emisión de registros oficiales de las sesiones. La
              base jurídica es la ejecución del contrato de prestación de
              servicios entre el Responsable y sus clientes (art. 6.1.b RGPD), y
              el cumplimiento de obligaciones legales en materia de formación
              (art. 6.1.c RGPD).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">4. Conservación de los datos</h2>
            <p className="mt-2">
              Los datos se conservan mientras mantengan relación formativa con
              la organización titular y, posteriormente, durante los plazos de
              prescripción legal aplicables. Los alumnos dados de baja se
              archivan antes de su supresión definitiva, que solo puede
              realizar la administración de la organización.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">5. Destinatarios y encargados</h2>
            <p className="mt-2">
              No se ceden datos a terceros salvo obligación legal. El
              tratamiento se apoya en proveedores tecnológicos (alojamiento,
              base de datos y servicios de IA para el asistente y la lectura de
              documentos) que actúan como Encargados del Tratamiento con
              contratos conformes al art. 28 RGPD.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">6. Derechos de los interesados</h2>
            <p className="mt-2">
              Los alumnos cuyos datos figuran en la plataforma pueden ejercer
              sus derechos de acceso, rectificación, supresión, oposición,
              limitación y portabilidad dirigiéndose por escrito al Responsable
              del Tratamiento (la autoescuela correspondiente). También pueden
              presentar una reclamación ante la Agencia Española de Protección
              de Datos (www.aepd.es).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">7. Seguridad</h2>
            <p className="mt-2">
              La plataforma aplica medidas técnicas y organizativas apropiadas:
              acceso restringido mediante credenciales, aislamiento de datos por
              organización, cifrado de las comunicaciones y registro cerrado de
              cuentas autorizadas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">8. Cookies</h2>
            <p className="mt-2">
              La aplicación solo utiliza almacenamiento técnico necesario para
              mantener la sesión iniciada, conforme a la excepción del art. 22.2
              de la LSSI. No se emplean cookies publicitarias ni de seguimiento.
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
