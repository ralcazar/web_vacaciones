# Mi calendario laboral

Calendario laboral anual, estático y responsive, preparado para GitHub Pages. Esta primera fase usa un repositorio en memoria deliberadamente: sirve para validar la interfaz y el dominio antes de conectar un proveedor externo.

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

Se ha elegido **Supabase (PostgreSQL + Auth + Row Level Security)**. La decisión y el diseño están documentados en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). El calendario seguirá dependiendo únicamente de `CalendarRepository`, por lo que Supabase quedará contenido en un adaptador y no contaminará el dominio ni el formato JSON.
