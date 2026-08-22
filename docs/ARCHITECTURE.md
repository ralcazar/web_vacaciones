# Arquitectura

La aplicación sigue una arquitectura de puertos y adaptadores:

```text
UI estática (GitHub Pages)
  → servicios de aplicación y dominio puro
    → CalendarRepository (puerto)
      → adaptador en memoria (fase 1)
      → futuro adaptador Supabase / Firestore / Worker+D1 / API+Neon
```

El frontend nunca importa un SDK de base de datos fuera de un adaptador. La autenticación también será responsabilidad del adaptador (o de un cliente de sesión inyectado en él), y cada consulta futura deberá estar limitada al `user_id` autenticado. En producción no deben incluirse secretos administrativos en GitHub Pages.

## Modelo persistente propuesto

* `years(user_id, year, telework_limit, created_at, updated_at)`, clave `(user_id, year)`.
* `leave_types(user_id, year, code, name, annual_limit, color)`, clave `(user_id, year, code)`.
* `calendar_entries(user_id, date, type, leave_code)`, clave `(user_id, date)` y restricción entre tipo/código.
* `holidays(user_id, date, name, scope)`, clave `(user_id, date)`.

Las escrituras de un año completo deben ser transaccionales. JSON `version: 1` es el contrato portable y permite migraciones futuras.

## Decisión: Supabase

Se ha elegido **Supabase**. El propietario se compromete a consultar la aplicación al menos una vez por semana, de modo que una eventual política de pausa por inactividad del plan gratuito deja de ser el factor principal de decisión. Antes de contratar o desplegar se revisarán siempre las condiciones vigentes del proveedor.

Supabase encaja especialmente bien con el modelo relacional ya propuesto:

* PostgreSQL representa directamente años, códigos, entradas y festivos;
* Supabase Auth permite magic link o email/password sin una API propia;
* Row Level Security puede limitar todas las filas al usuario autenticado;
* el cliente web puede llamar a Supabase desde GitHub Pages;
* el volumen de una agenda personal cabe holgadamente en las cuotas habituales de un plan gratuito.

La URL del proyecto y la clave pública `anon` se podrán incluir como variables de compilación del frontend. **Nunca** se incluirá la clave `service_role`. La protección real no depende de ocultar la clave pública, sino de habilitar y probar RLS en todas las tablas.

### Comparación práctica

| Alternativa | Ventaja | Inconveniente para este caso |
| --- | --- | --- |
| Supabase — elegido | PostgreSQL, Auth y políticas RLS; modelo relacional muy natural | Hay que configurar y probar RLS cuidadosamente |
| Firebase / Firestore | Acceso directo seguro desde GitHub Pages, autenticación integrada y cero servidor propio | Modelo documental y reglas específicas de Firebase |
| Cloudflare D1 + Worker | SQL, coste muy bajo y una capa API controlada | Hay que crear, desplegar y mantener el Worker y su autenticación |
| Neon/PostgreSQL | PostgreSQL portable y escalado automático | No debe conectarse desde el navegador: requiere una API segura adicional |

La consulta semanal acordada reduce el riesgo práctico de inactividad, pero no sustituye la copia de seguridad JSON ni garantiza que las políticas comerciales no cambien. La exportación portable seguirá siendo parte esencial de la aplicación.

### Adaptador futuro

Un `SupabaseCalendarRepository` traducirá filas a `YearData` y será el único módulo que importe `@supabase/supabase-js`. Se añadirá mediante una factoría de composición, conservando `InMemoryCalendarRepository` para tests y desarrollo. Si más adelante cambia el coste o las condiciones, otro adaptador podrá implementar el mismo puerto sin modificar calendario, contadores ni importación/exportación.

La siguiente fase debe crear las migraciones SQL, políticas RLS y el adaptador. Hasta que eso ocurra, la UI continuará mostrando explícitamente que utiliza memoria y que recargar elimina los datos.

## Despliegue

Vite genera `dist/` estático y `base: './'` permite servirlo desde un subdirectorio de GitHub Pages. El workflow incluido ejecuta instalación reproducible, tests y build, y publica `dist` desde cada commit a `main`.
