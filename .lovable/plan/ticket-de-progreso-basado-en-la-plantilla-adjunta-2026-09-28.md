# Ticket de Progreso basado en la plantilla adjunta

## Objetivo
Recrear el Ticket de Progreso usando la imagen adjunta como base visual exacta, manteniendo todos los datos efímeros y sin guardar la imagen generada.

## Cambios
- Preparar una versión limpia de la plantilla: conservar marco, fondos, líneas, iconos y estética; retirar únicamente los textos y estados variables que se sustituirán en React.
- Usar esa plantilla como fondo del ticket con proporción fija para que la composición no se desplace al exportarla.
- Superponer el nombre de la autoescuela, alumno, hora, fecha y frase motivadora en sus huecos exactos.
- Dibujar encima la barra con el porcentaje real y los cuatro hitos, activando sus checks según el avance del alumno.
- Mantener la generación aleatoria de frase por evaluación y el flujo actual de copiar, compartir o descargar, sin subir ni almacenar la tarjeta.

## Validación
- Comprobar que la tarjeta se captura completa y que los textos largos no salen de sus bloques.
- Verificar visualmente la composición a tamaño real y confirmar que la aplicación sigue compilando correctamente.

## Detalles técnicos
- La plantilla se servirá como recurso del proyecto y el contenido dinámico se renderizará con capas HTML absolutas.
- La tarjeta conservará una relación 768:1152 y se exportará a alta resolución.
