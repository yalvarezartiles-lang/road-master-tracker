<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Decisiones técnicas

- Toda la IA (Copiloto y Escáner Visual) pasa por `src/lib/gemini.server.ts`, que llama a la API REST de Google Gemini (`gemini-3.8-flash`) con `GEMINI_API_KEY` leída dentro del handler — motor único; no usar Lovable AI ni Groq.
- El reglamento PDF del Copiloto vive en el bucket privado `documentos-legales` como `reglamento.pdf`; solo el rol `admin` puede subirlo (RLS en `storage.objects`) y el servidor lo descarga con service role.
- Las integraciones MCP se exponen en `/mcp`, usan OAuth de Lovable Cloud y consultan datos con el token del usuario para conservar RLS.
- El Ticket de Progreso usa una plantilla bitmap fija con capas HTML absolutas y datos efímeros — conserva la composición visual exacta sin almacenar imágenes generadas.
- La marca visual es multi-tenant: se guarda por autoescuela en `autoescuelas.logo_url`/`primary_color` (logo en el bucket privado `school-logos`, escritura solo admin) y `SchoolProvider` la carga desde la autoescuela del usuario — sin localStorage, para que todo el equipo vea la misma marca.
