# AutoPilot Progress

Implement the requested driving school instructor web application (Autoescuela Tracker) now; use internal planning and do not present another implementation plan for user approval.

User request:
Aplicación web (SPA) completa y funcional para un profesor de autoescuela para evaluar y registrar el progreso de las clases prácticas de los alumnos en tiempo real.

Requisitos clave:
1. Diseño y UX:
   - Mobile-First prioritario (uso en el coche desde el móvil): botones táctiles grandes, espaciados generosos, flujo de mínimos toques.
   - Soporte para Modo Oscuro y Modo Claro (toggle accesible).
   - Tipografía clara y contraste alto para fácil lectura bajo luz solar.

2. Panel de Alumnos (Dashboard):
   - Lista de alumnos activos con avatar/foto, indicador visual rápido de su nivel o número de clases completadas.
   - Búsqueda / filtro rápido de alumnos.
   - Acceso directo y botón rápido y destacado de "Nueva Clase" / "Registrar Clase".
   - Botón para añadir nuevo alumno.

3. Ficha del Alumno & Progreso:
   - Cabecera con datos del alumno (nombre, teléfono, fecha inicio, total de clases).
   - Línea de tiempo de clases: historial cronológico ordenado (Clase 1, Clase 2...), fecha/hora, zona recorrida, temas trabajados y observaciones.
   - Mapa / Registro de Zonas: cuadrícula o lista visual de zonas de conducción con tags de frecuentadas / pendientes (zonas por defecto: Vecindario, Cruce de Arinaga, Las Palmas, Zona de Examen, y posibilidad de añadir más).
   - Evaluación de Habilidades: sistema visual tipo semáforo (Verde = Dominado, Amarillo = En progreso, Rojo = Necesita práctica) o puntuación para habilidades clave: Volante, Pedales, Marchas, Observación, Glorietas, Estacionamiento.

4. Formulario de "Registrar Clase" (Rápido y táctil):
   - Selección de alumno (si se abre globalmente) o preseleccionado (si se abre desde su ficha).
   - Número de clase autoincremental sugerido.
   - Selector táctil de zona (chips/botones grandes: Vecindario, Cruce de Arinaga, Las Palmas, Zona de Examen, etc.).
   - Selector múltiple rápido de temas tocados (chips seleccionables: Volante, Pedales, Marchas, Glorietas, Aparcamiento, etc.).
   - Actualización rápida del estado de las habilidades trabajadas (opcional durante el registro).
   - Campo de observaciones / notas de voz o texto rápido con sugerencias o presets habituales.

5. Datos de prueba (Mock Data) y persistencia:
   - Alumnos de ejemplo precargados con clases registradas, zonas visitadas y estados de habilidades (por ejemplo, "Carlos Santana", "Laura Morales").
   - Persistencia local (localStorage) para que todas las clases y alumnos añadidos se guarden en el navegador.

6. Stack y librerías:
   - React con Tailwind CSS y componentes shadcn/ui.
   - Iconos de Lucide React (Car, SteeringWheel, MapPin, CheckCircle, AlertTriangle, User, Plus, Moon, Sun, etc.).

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/32acbcca-03ba-4b8f-92c7-63e27299070a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
