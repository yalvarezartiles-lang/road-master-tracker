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
          <Link to="/auth" search={{ next: undefined }}>
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
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
            <p className="font-semibold text-amber-600 dark:text-amber-400">
              ⚠️ Aviso: proyecto en fase Beta
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              Esta aplicación es un prototipo independiente en fase de
              evaluación (Beta), no comercial. Los datos alojados se tratan
              exclusivamente para el testeo funcional de la plataforma.
            </p>
          </div>

          <section>
            <h2 className="text-xl font-bold">1. Responsable del Tratamiento</h2>
            <p className="mt-2">
              El tratamiento de los datos se realiza en el marco de un proyecto
              independiente en fase de evaluación, gestionado por El
              Desarrollador de la plataforma. No existe una empresa comercial
              titular del servicio durante la fase Beta. La autoescuela u
              organización para la que se pruebe la plataforma actúa como
              Responsable de los datos de sus alumnos, y El Desarrollador
              trata los datos únicamente para el testeo funcional del
              sistema.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">2. Datos Recopilados y Tratados</h2>
            <p className="mt-2">
              La plataforma recopila y trata exclusivamente la siguiente
              información, facilitada por los profesionales autorizados:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6">
              <li>
                <strong>De los usuarios (Profesores/Administradores):</strong>{" "}
                correo electrónico y contraseñas (encriptadas).
              </li>
              <li>
                <strong>De los alumnos:</strong> nombre y apellidos, número de
                teléfono y código de sucursal/sección.
              </li>
              <li>
                <strong>Del desarrollo de las clases:</strong> fechas, horas,
                duración (45/90 min), firmas digitales (trazos biométricos de
                confirmación) y estado de evaluación del alumno.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold">3. Procesamiento de imágenes (IA)</h2>
            <p className="mt-2">
              Las fotografías de los cuadrantes en papel subidas al sistema se
              procesan mediante Inteligencia Artificial de forma{" "}
              <strong>efímera</strong>, únicamente para extraer el texto
              (nombres, horas y teléfonos). Las imágenes{" "}
              <strong>NO se almacenan permanentemente en ninguna base de
              datos</strong> tras la extracción.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">4. Finalidad y base jurídica</h2>
            <p className="mt-2">
              Durante la fase Beta, los datos se tratan con la única finalidad
              de probar y evaluar el funcionamiento de la plataforma: registro
              de clases, seguimiento del progreso del alumno y generación de
              documentos de prueba. La base jurídica es el consentimiento de
              los usuarios de prueba y el interés legítimo de El Desarrollador
              en validar el sistema (art. 6.1.a y 6.1.f RGPD).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">5. Conservación de los datos</h2>
            <p className="mt-2">
              Los datos se conservan mientras mantengan relación formativa con
              la organización titular y, posteriormente, durante los plazos de
              prescripción legal aplicables. Los alumnos dados de baja se
              archivan antes de su supresión definitiva, que solo puede
              realizar la administración de la organización.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">6. Destinatarios y encargados</h2>
            <p className="mt-2">
              No se ceden datos a terceros salvo obligación legal. El
              tratamiento se apoya en proveedores tecnológicos (alojamiento,
              base de datos y servicios de IA para el asistente y la lectura de
              documentos) que actúan como Encargados del Tratamiento con
              contratos conformes al art. 28 RGPD.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">7. Derechos de los interesados</h2>
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
            <h2 className="text-xl font-bold">8. Seguridad</h2>
            <p className="mt-2">
              La plataforma aplica medidas técnicas y organizativas apropiadas:
              acceso restringido mediante credenciales, aislamiento de datos por
              organización, cifrado de las comunicaciones y registro cerrado de
              cuentas autorizadas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold">9. Cookies</h2>
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
