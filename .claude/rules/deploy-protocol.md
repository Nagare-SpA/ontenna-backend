# Protocolo de despliegue

Este repo tiene **dos configuraciones de deploy conviviendo** y solo una activa.
Antes de tocar nada, saber cuál es cuál.

| Destino | Estado | Config en repo | Dispara |
|---|---|---|---|
| **Vercel** | ✅ **PRODUCCIÓN ACTIVA** (`ontenna.org`) | `vercel.json` | push a `main` |
| **Supabase** | ✅ activo, proyecto único `ycfrjvnuepfkeffsqxgm` | `supabase/` | CLI manual |
| **Railway + Docker** | ⚠️ preparado, **cutover NO ejecutado** | `Dockerfile`, `Caddyfile` | nada aún |

## Gate obligatorio — aplica a TODO lo que sigue

Ningún push, merge, migración o deploy procede sin:

```bash
./scripts/check-main-sync.sh    # debe retornar exit 0
```

Si retorna `1`, `2`, `3` o `4`: **detenerse y resolver**. No hay excepciones
"porque es un cambio chico". El desfase de 45 commits que motivó esta regla
empezó igual.

---

## 1. Vercel — producción actual

`ontenna.org` lo sirve Vercel vía la integración de GitHub (el enlace vive en el
dashboard, no en el repo; por eso no hay `.vercel/` versionado).

**Cada push a `main` construye y publica en producción automáticamente.**
No hay entorno de staging intermedio. Un push roto es una producción rota.

Antes de mergear a `main`:

1. `./scripts/check-main-sync.sh` → exit 0
2. `npm run build` local → debe compilar sin errores
3. `npm run lint` → sin errores nuevos
4. Verificar que las `VITE_*` que use el cambio existan en el proyecto de Vercel.
   **Vite las inlinea en build time**: una variable ausente no falla el build,
   produce un bundle con `undefined` y rompe en runtime.

Tras el deploy, confirmar que salió lo esperado:

```bash
curl -sI https://ontenna.org | grep -i 'server\|last-modified'
```

## 2. Supabase — sin red de seguridad

**Hay un solo proyecto (`ycfrjvnuepfkeffsqxgm`, "Ontenna App"). No existe staging.
Todo comando de CLI impacta producción directamente.**

### `supabase db push` — irreversible

Las migraciones corren contra la base de producción y no tienen rollback automático.
26 migraciones aplicadas a la fecha.

Antes de ejecutarlo:

1. Gate de sincronía → exit 0
2. Revisar el SQL completo de la migración nueva, línea por línea
3. Confirmar que es **aditiva**. Un `DROP`, `ALTER ... TYPE` o `DELETE` sin `WHERE`
   requiere aprobación explícita del responsable antes de correr
4. `supabase db diff` para ver qué aplicaría realmente
5. Verificar que las políticas RLS de toda tabla nueva estén en la misma migración

### `supabase functions deploy` — sale en caliente

25 edge functions. **23 tienen `verify_jwt = false`** en `supabase/config.toml`:
son endpoints públicos sin autenticación de plataforma. Un bug en una de ellas
queda expuesto a internet en el momento del deploy.

Antes de desplegar:

1. Gate de sincronía → exit 0
2. Desplegar **una función por vez**, nunca `--all`
3. Si la función es nueva y debe ser pública, su entrada `verify_jwt = false`
   va en `config.toml` **en el mismo commit**
4. Si valida input de usuario, revisar ese path antes de publicar
5. Probar con `curl` contra la función desplegada antes de considerarlo hecho

```bash
supabase functions deploy <nombre>     # nunca --all
```

## 3. Railway + Docker — condicional, cutover pendiente

`Dockerfile` (build Vite multi-stage → Caddy) y `Caddyfile` existen desde
`83b91dc` (19-jul-2026), pero `ontenna.org` **sigue resolviendo a Vercel**
(`76.76.21.21`, header `server: Vercel`). Cloudflare está en los nameservers
pero en modo DNS-only, sin proxy.

**Esta sección está inactiva. No ejecutar comandos de Railway CLI hasta que el
cutover esté formalmente autorizado.**

Cuando se active, el cutover requiere, en orden:

1. Gate de sincronía → exit 0
2. Build local del contenedor verde:
   ```bash
   docker build -t ontenna-web .
   docker run --rm -p 8080:8080 -e PORT=8080 ontenna-web
   ```
   Probar el fallback SPA: `/dashboard` y `/reset-password` deben servir el shell,
   no un 404.
3. Declarar las cinco `VITE_*` como variables de servicio en Railway. Son
   `ARG`/`ENV` de build time en el `Dockerfile`: si faltan, el bundle sale roto
   sin que el build falle.
4. Desplegar a Railway y validar contra la URL `*.up.railway.app` **antes** de
   tocar DNS.
5. Recién entonces mover el DNS en Cloudflare.
6. Al completar: **borrar `vercel.json`** y desconectar la integración de GitHub
   en Vercel, o quedarán dos pipelines publicando el mismo repo.

Mientras ambas configs coexistan, `vercel.json` es la canónica.
