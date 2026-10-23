# Estrategia de testing — no romper producción

**Problema que resuelve:** hasta ahora se probó **directamente contra producción** (crear/borrar
usuarios, aplicar DDL en vivo). Eso es rápido pero peligroso: un error puede dejar datos corruptos,
cobrar mal, o tumbar signups en medio de una entrega. Esta guía define **dónde** probar cada cosa y
**cómo** hacerlo sin tocar datos reales.

---

## 1. Los tres entornos

| Entorno | Para qué | Cómo |
|---|---|---|
| **Local** | Desarrollo diario, probar funciones y migraciones antes de nada | `supabase start` (Postgres + Auth + Functions + Storage en Docker). `supabase functions serve <fn>` |
| **Staging** | Validar como en prod, con datos de prueba, antes de desplegar | **Proyecto Supabase separado** *o* **branch** de Supabase (ver §2) |
| **Producción** (`ycfrjvnuepfkeffsqxgm`) | Usuarios reales. **Solo** smoke tests auto-limpiantes y lectura | Nunca DDL ni borrados manuales directos |

**Regla de oro:** *todo cambio (migración o función) se prueba en Local → Staging → recién Producción.*

---

## 2. Montar Staging (elige una)

**Opción A — Proyecto de staging dedicado (recomendado).**
1. Crear un proyecto nuevo en la misma org (ej. `ontenna-staging`).
2. Aplicar el esquema con las migraciones del repo:
   `supabase link --project-ref <staging-ref> && supabase db push`
3. Sembrar datos de prueba (usuarios `qa+*@`, un plan, etc.) — nunca copiar PII real de prod.
4. Setear los mismos secrets con credenciales **de test** (Stripe test mode, un dominio Resend de prueba).

**Opción B — Supabase Branching** (si el plan lo incluye): cada PR levanta un branch efímero con el
esquema de las migraciones. Ideal para CI. Requiere plan Pro+ y branching activado.

> Mientras no exista staging, **todo cambio de esquema va primero a Local** (`supabase start`) y se
> revisa con `supabase db diff` antes de `db push` a prod, en una ventana de baja actividad y con
> un checkpoint de backup.

---

## 3. Flujo seguro para migraciones (nunca más DDL a mano en prod)
```bash
# 1. Local: crear/editar la migración y probarla
supabase start
supabase db reset               # aplica TODAS las migraciones desde cero (detecta las rotas)

# 2. Ver el diff real contra el esquema deseado
supabase db diff -f mi_cambio   # genera una migración a partir de cambios locales

# 3. Staging: aplicar y correr el smoke
supabase link --project-ref <staging-ref>
supabase db push
./scripts/smoke.sh              # con las keys de staging

# 4. Producción: SOLO tras verde en staging, con backup previo
supabase link --project-ref ycfrjvnuepfkeffsqxgm
supabase db push
```
- Las migraciones deben ser **idempotentes** (`IF NOT EXISTS`, `ON CONFLICT`, `OR REPLACE`) y **no destructivas** (jamás `DELETE FROM` sin guarda en el historial).
- **Backup checkpoint** antes de cualquier `db push` a prod (dashboard → Database → Backups, o confirmar PITR).

---

## 4. Convención de datos de prueba (para no tocar usuarios reales)
- **Emails de test siempre con sufijo reconocible:** `qa+<algo>@nagaretech.com`, `smoke.ci+<ts>@…`.
  Nunca un email que pueda ser de un usuario real.
- **Auto-limpieza:** todo test que cree datos debe borrarlos al final (ver `scripts/smoke.sh`, que
  borra el usuario en un `trap EXIT`).
- **Prohibido en prod:** `DELETE`/`UPDATE` masivos, cambiar filas de usuarios reales, aplicar DDL,
  o correr tests que no limpien lo que crean.
- Si necesitás inspeccionar prod: **solo lecturas** (`SELECT`, `GET`).

---

## 5. Smoke test — `scripts/smoke.sh`
Prueba el flujo completo **signup → código malo → código bueno → login → entitlement → webhook sin
firma**, y **borra** el usuario de prueba al terminar. Es seguro contra staging o prod.

```bash
SUPABASE_URL=https://<ref>.supabase.co \
ANON_KEY=<anon> \
SERVICE_KEY=<service_role> \
./scripts/smoke.sh
# Exit 0 = todo verde; !=0 = falló algún check
```
Corré esto **después de cada deploy** (idealmente contra staging; en prod es seguro porque se limpia).

---

## 6. Checks previos al deploy (local, sin tocar nada remoto)
```bash
npm run lint                                   # ESLint del frontend
npx tsc --noEmit -p tsconfig.app.json          # typecheck del frontend
deno check supabase/functions/**/index.ts      # typecheck de las edge functions
supabase db reset                              # ¿aplican todas las migraciones limpio?
```

---

## 7. CI (GitHub Actions — `.github/workflows/ci.yml`)

Lo que corre hoy en cada PR y en cada push a `main`, sin tocar prod:

1. `npm ci` → `npm run lint` → `tsc --noEmit -p tsconfig.app.json`.
2. `deno check` de las 25 edge functions.

**El smoke no está en CI, y es a propósito.** Hubo un job `smoke` ("Smoke test
(staging)") que reportaba verde sin ejecutar nada: su único paso estaba guardado
con `if: env.STAGING_SUPABASE_URL != ''`, pero el `env:` de un paso no está en
alcance para el `if:` de ese mismo paso, así que la condición comparaba `'' != ''`
→ falso y el paso se saltaba **en todas las corridas**. Un paso saltado no es una
falla, así que el job salía success: un check verde que no verificaba nada.

No se arregla la condición y listo, porque **no existe proyecto de staging** (§1:
`ycfrjvnuepfkeffsqxgm` es producción y es el único), por lo que los secrets
`STAGING_*` no están configurados en el repo. Apuntar `scripts/smoke.sh` al único
proyecto sería correr signup → verify → login → DELETE contra producción en cada PR.

Para reactivarlo hacen falta, en este orden:

1. Un destino real: proyecto de staging dedicado o branch de Supabase (§2), **o**
   un stack efímero en el runner (`supabase start` → `supabase db reset`), que es
   la opción preferible porque no necesita secrets compartidos ni alcanza prod.
2. Gatillar en el **job**, nunca en el paso. `secrets` no es un contexto
   disponible en ningún `if:`; `vars` sí lo es a nivel de job. La receta completa
   está comentada al final de `.github/workflows/ci.yml`.
3. Bloquear el merge si algo falla.

Un job saltado por su propio `if:` se reporta como *skipped*, no como *success*:
ausencia honesta en vez de cobertura falsa.

Deploy a prod: solo desde `main`, tras verde, y con `supabase db push` +
`functions deploy` en un job manual/aprobado.

---

## 8. Runbook rápido — ¿es seguro correr esto en prod?
| Acción | ¿Seguro en prod? |
|---|---|
| `SELECT` / `GET` de lectura | ✅ sí |
| `./scripts/smoke.sh` (auto-limpiante) | ✅ sí |
| Crear un usuario de prueba y borrarlo enseguida | ⚠️ solo con sufijo `qa+`/`smoke.` y limpieza |
| Aplicar una migración / DDL | ❌ no — pasar por Local → Staging primero |
| `UPDATE`/`DELETE` sobre datos existentes | ❌ no — salvo operación puntual revisada y con backup |
| Desplegar una función sin smoke previo | ❌ no — correr el smoke después, mínimo |
