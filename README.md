# Mi calendario laboral

Calendario laboral anual, responsive y preparado para GitHub Pages. Usa Supabase para autenticación con correo/contraseña y persistencia privada por usuario.

## Desarrollo

```bash
npm install
npm run dev
```

Pruebas y compilación:

```bash
npm test
npm run build
```

## Publicación en GitHub Pages

El workflow `deploy-pages.yml` publica automáticamente `dist/` cuando se envía un commit a `main`. En el repositorio de GitHub hay que seleccionar una sola vez **Settings → Pages → Source → GitHub Actions**.

Para este repositorio, la dirección será:

```text
https://ralcazar.github.io/web_vacaciones/
```

El remoto `origin` es `https://github.com/ralcazar/web_vacaciones.git`. Tras activar **Settings → Pages → Source → GitHub Actions**, cada actualización de `main` desplegará esta URL.

## Persistencia

Se usa **Supabase (PostgreSQL + Auth + Row Level Security)**.

### Opción recomendada si estás usando Codex Cloud

Codex puede crear el proyecto y aplicar la migración con la CLI, pero no puede entrar en tu cuenta de Supabase sin autorización. No pegues contraseñas ni tokens en el chat. Haz una sola vez lo siguiente en la configuración del entorno de Codex Cloud:

1. En Supabase abre **Account → Access Tokens**, crea un token y guárdalo como secreto `SUPABASE_ACCESS_TOKEN`.
2. Copia el identificador de tu organización desde **Organization Settings → General** y guárdalo como `SUPABASE_ORG_ID`.
3. Inventa una contraseña larga para la nueva base de datos y guárdala como `SUPABASE_DB_PASSWORD`. No es la contraseña con la que entras en Supabase.
4. Vuelve a ejecutar Codex y dile: **«Ya he configurado los tres secretos; crea y configura el proyecto Supabase»**.

Con esos secretos, Codex podrá ejecutar `supabase projects create`, aplicar esta migración con `supabase db push`, obtener la URL y la clave pública y preparar las variables de la aplicación. El repositorio ya incluye `supabase/config.toml`, por lo que no hace falta copiar SQL manualmente.

### Opción manual desde el panel

Si prefieres no dar acceso temporal a Codex, la configuración inicial es:

1. En el panel de Supabase, abre **SQL Editor → New query**.
2. Ejecuta en orden los archivos de [`supabase/migrations`](supabase/migrations). Estos crean las tablas, las reglas de guardado y las políticas RLS, y aplican las ampliaciones posteriores del calendario sin perder los datos existentes.
3. Ve a **Project Settings → API** y copia la **Project URL** y la clave pública **anon/publishable**. No copies nunca `service_role`.
4. En local crea `.env.local` (está ignorado por Git) a partir del ejemplo:

   ```bash
   cp .env.example .env.local
   ```

   Completa sus dos valores y reinicia `npm run dev`.
5. En **Authentication → Providers → Email**, deja activo Email. Si mantienes habilitada la confirmación de correo, el usuario deberá abrir el enlace recibido antes de entrar.
6. Crea una cuenta desde la propia pantalla de acceso de la aplicación.

Para GitHub Pages, añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` como variables del repositorio y asegúrate de que el workflow las pasa al paso de compilación. También añade la URL publicada en **Authentication → URL Configuration → Site URL / Redirect URLs**.

La clave `anon` es pública por diseño: la protección efectiva la proporcionan la sesión de Auth y las políticas RLS incluidas en la migración. La aplicación conserva además la importación/exportación JSON como copia portable. La decisión arquitectónica está explicada en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
