# Límites de alcance

**Modificar exclusivamente los módulos asignados en el scope de la tarea.**
Si un cambio necesario cae fuera, reportarlo y pedir autorización — no ampliarlo
por cuenta propia.

## Mapa de módulos

| Módulo | Ruta | Qué contiene |
|---|---|---|
| Páginas app | `src/pages/` | Dashboard, Login, Signup, Verify, ResetPassword, ForgotPassword |
| Páginas sitio | `src/pages/site/` | Home, About, Science, Schools, Teachers, Students, Symphony, Press… |
| Admin | `src/pages/admin/` | Users, Plans, Firmware, Learn |
| Servicios | `src/services/billing/` | Proveedores de pago (Stripe / Mock), `config.ts`, `types.ts` |
| Catálogo | `src/services/symphonyCatalog.ts` | Datos de Symphony |
| Componentes | `src/components/{site,dashboard,billing}/` | UI por dominio |
| Primitivas UI | `src/components/ui/` | shadcn generado |
| Contextos | `src/contexts/` | `AuthContext` |
| Integraciones | `src/integrations/supabase/` | Cliente y tipos generados |
| Edge functions | `supabase/functions/<nombre>/` | 25 funciones, una carpeta cada una |
| Migraciones | `supabase/migrations/` | SQL, append-only |
| i18n | `src/i18n/locales/` | es, en, de, fr, pt |

## Reglas por zona

**`src/components/ui/`** — generado por shadcn. No editar a mano; si hace falta
variar un primitivo, envolverlo en un componente propio del dominio.

**`src/integrations/supabase/types.ts`** — generado desde el esquema. No editar a
mano: regenerar tras cambiar migraciones.

**`supabase/migrations/`** — append-only. **Nunca editar ni borrar una migración
ya aplicada**; corregir siempre con una migración nueva. Toda tabla nueva lleva
sus políticas RLS en el mismo archivo.

**`supabase/functions/`** — tocar solo las funciones del scope. Las familias
`mobile-*`, `stripe-*` y `learn-*` son contratos con clientes externos (app iOS,
webhooks de Stripe): cambiar una firma rompe consumidores que no están en este repo.
Ver [docs/MOBILE_API.md](../../docs/MOBILE_API.md).

**`src/i18n/locales/`** — al agregar una clave, agregarla **en los cinco idiomas**.
Una clave presente solo en `es.json` se renderiza como la clave cruda en el resto.

## Fuera de scope salvo autorización explícita

- `package.json` / lockfiles — no agregar, quitar ni subir dependencias
- `vite.config.ts`, `tsconfig*.json`, `tailwind.config.ts`, `eslint.config.js`
- `vercel.json`, `Dockerfile`, `Caddyfile`, `.dockerignore` — ver
  [deploy-protocol.md](./deploy-protocol.md)
- `supabase/config.toml` — salvo la entrada `verify_jwt` de una función del scope
- `.gitignore`, `.env`
- Archivos de otro worktree — ver [git-workflow.md](./git-workflow.md)

## Deuda detectada fuera de scope

No arreglar en el curso de otra tarea; levantar como tarea propia:

- `supabase/.temp/` está versionado y no debería (estado local del CLI)
- `README.md` sigue siendo la plantilla de Lovable, con `REPLACE_WITH_PROJECT_ID`
