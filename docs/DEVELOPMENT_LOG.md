# Registro de desarrollos

Una sola fuente para responder tres preguntas sin leer `git log`:
**qué hay en vuelo, quién lo hizo, y qué falta para que entre a `main`.**

Este archivo se actualiza en el mismo PR que cambia el estado de una rama. Un
PR que abre, integra o abandona una rama y no toca este archivo está incompleto.

Última actualización: **2026-10-22** · `main` en `3b2844f`

---

## 1. Quién trabaja en este repo

Saber esto importa porque **no todos integran igual**, y asumir lo contrario es
cómo se pisa trabajo ajeno.

| Autor | Commits | Último commit | Cómo integra |
|---|---|---|---|
| Fernando Soto Serdio | 53 | `bfa1a4d`, 21-jul-2026 | **Push directo a `main`**, sin PR |
| Cristian Vidal | 22 | `3b2844f`, 22-oct-2026 | Ramas + PR |
| `gpt-engineer-app[bot]` (Lovable) | 111 | `b0f73c2`, 3-jun-2026 | Push automático desde la plataforma Lovable. **Inactivo** |
| Lovable | 1 | `bebc3a2` | Commit de plantilla inicial |

Consecuencias prácticas:

- **`origin/main` puede moverse sin pasar por un PR.** Fernando pushea directo.
  Por eso toda rama parte de un `origin/main` recién sincronizado y por eso el
  gate (`./scripts/check-main-sync.sh`) hace `fetch` antes de autorizar: una
  rama creada sobre un checkout de hace una semana puede estar partiendo de un
  `main` que ya no existe.
- **El bot de Lovable sigue teniendo acceso de escritura.** No pushea desde
  junio, pero si alguien reabre el proyecto en Lovable, publica directo a `main`
  y por tanto a producción. Revisar antes de dar por estable cualquier ventana
  de deploy.
- Un `git log --author` es la única forma fiable de atribuir: los 111 commits
  del bot son trabajo humano hecho a través de la plataforma, no código generado
  sin dueño.

## 2. Qué contiene `main` hoy

`main` está en `3b2844f`, un merge que unificó siete ramas paralelas (PR #8).
Antes de ese merge, `main` local acumulaba 22 commits sin publicar: el desfase
que este registro existe para que no vuelva a pasar.

| PR | Rama | Qué aportó |
|---|---|---|
| #1 | `hardening/prod-readiness` | Fix de entitlement, `mobile-diagnostics` + tabla `ble_diagnostics`, email desde el dominio verificado, fix de recuperación de contraseña, `.env` desversionado |
| #2 | `chore/untrack-supabase-temp` | `supabase/.temp/` fuera de git |
| #3 | `chore/eslint-ci-green` | Gate de lint en verde; `.claude/` excluido del ESLint |
| #4 | `fix/ci-smoke-false-green` | Elimina el job `smoke` que reportaba verde sin ejecutar nada |
| #5 | `chore/regen-supabase-types` | `types.ts` regenerado; sin `as any` en admin |
| #6 | `chore/deno-lint-edge-functions` | `deno.json` + `deno lint` limpio en 26 functions |
| #7 | `claude/ontenna-vercel-to-railway-e07dbd` | Cabeceras de Caddy (inertes hasta el cutover) |

Las siete ramas quedaron **íntegramente contenidas** en `main` y sus PR están
cerrados. Pueden borrarse del remoto sin perder nada.

## 3. Ramas vivas — qué entra y qué falta

### `chore/remove-stripe` — bloqueada, necesita una decisión de negocio

Elimina Stripe del frontend y del backend: −1431 líneas, 18 archivos. Era un
stash huérfano (la única copia estaba en disco, sin rama); se rescató tal cual,
sin revisar, en el commit `97d4d8d`.

Premisa que la motiva: las apps móviles no pueden consumir endpoints de Stripe
—Apple exige IAP—, así que Stripe solo tendría sentido del lado web.

**No integrar sin resolver antes:**

1. Borra cuatro edge functions `stripe-*`, entre ellas `stripe-webhook`, que es
   un endpoint que **Stripe llama desde fuera**. Si se elimina mientras exista
   una suscripción viva, los eventos dejan de procesarse en silencio: nadie
   recibe un error, simplemente deja de pasar. Confirmar primero que no queda
   nada cobrando por Stripe.
2. Reescribe `PlansDialog` y `services/billing/`, y quita `stripe` de
   `package.json`. Eso cambia el flujo de cobro de la web, no solo de la app.

### `feat/sense-edge-functions` — lista en código, bloqueada por configuración

Dos edge functions nuevas: `sense-transcribe` (audio → Groq/Whisper) y
`sense-analyze` (texto del transcript → OpenAI). Estaban en disco sin existir en
ninguna rama; un `checkout` las borraba. Versionadas en `dbe4112`.

`deno check` y `deno lint` pasan limpios. **Falta antes de desplegar:**

- `GROQ_API_KEY` y `OPENAI_API_KEY` como secrets en Supabase.
- Confirmar que **no** llevan entrada en `supabase/config.toml`: sin ella el
  default es `verify_jwt = true`, que es lo que ambas documentan querer. Las 24
  entradas de ese archivo son endpoints públicos; estas dos no deben sumarse.
- `sense-analyze` apunta por defecto al modelo `gpt-5.6-luna`. Verificar que
  existe en la cuenta.

### Ramas ya integradas — se pueden borrar

`hardening/prod-readiness`, `chore/untrack-supabase-temp`,
`chore/eslint-ci-green`, `fix/ci-smoke-false-green`,
`chore/regen-supabase-types`, `chore/deno-lint-edge-functions`,
`claude/ontenna-vercel-to-railway-e07dbd`, `chore/integrate-open-prs`.

## 4. Cómo se decide qué entra

El criterio no es "está terminado", es **qué rompe si está mal**. Tres niveles,
de menos a más fricción:

**Nivel 1 — solo frontend.** `src/`, `docs/`, configuración de lint o CI. Un
push a `main` publica en Vercel; el peor caso es una web rota, reversible con un
revert y un push. Requiere: gate exit 0, `npm run build`, `npm run lint`, CI
verde, PR aprobado.

**Nivel 2 — edge functions.** 24 de 26 son públicas (`verify_jwt = false`). Un
bug queda expuesto a internet en el momento del deploy, y el deploy es un
comando manual que no pasa por el PR. Además hay consumidores fuera de este
repo: las familias `mobile-*`, `stripe-*` y `learn-*` son contratos con la app
iOS y con webhooks de Stripe. Requiere, además del nivel 1: revisar el path que
valida input de usuario, desplegar **una función por vez**, y probar con `curl`
contra la función ya desplegada.

**Nivel 3 — migraciones y cutover de infraestructura.** Hay **un solo proyecto**
de Supabase: `db push` corre contra producción y no tiene rollback automático.
Requiere, además: revisar el SQL línea por línea, confirmar que es aditiva
(`DROP`, `ALTER ... TYPE` o `DELETE` sin `WHERE` necesitan aprobación explícita),
`supabase db diff` antes, y las políticas RLS de toda tabla nueva en la misma
migración.

Una rama que mezcla niveles se evalúa por el más alto que toca.

## 5. Cómo se mantiene este registro

- **Al abrir una rama**: añadirla a §3 con una línea de qué pretende y qué le
  falta. Una rama sin entrada acá es una rama que nadie sabe que existe.
- **Al integrarla**: moverla a §2 con su número de PR, y borrar su entrada de §3.
- **Al abandonarla**: dejarla en §3 marcada como abandonada, con el motivo. No
  borrar la entrada: el motivo por el que algo no se hizo es información que se
  pierde primero y se echa de menos después.
- **Al terminar cualquier sesión de trabajo**: `git status --porcelain` sin
  salida. Las dos ramas de §3 nacieron de trabajo que estuvo a un `checkout` de
  desaparecer — un stash sin rama y dos archivos sin versionar. Eso es
  exactamente lo que esta regla previene.

## 6. Mejoras propuestas, no aplicadas

Requieren decisión del responsable del repo; ninguna está hecha:

1. **Protección de rama en `main`.** Hoy cualquier colaborador con escritura
   —incluido el bot de Lovable— puede pushear directo a `main` y publicar en
   producción. Exigir PR con CI verde cerraría ese paso. Es un cambio en los
   ajustes de GitHub, no en el repo. El costo: Fernando tendría que cambiar su
   forma de integrar, que lleva 53 commits funcionando.
2. **`CODEOWNERS`.** No existe. Con uno, un PR que toque `supabase/migrations/`
   o `supabase/functions/stripe-*` pediría revisión automáticamente de quien
   corresponda, en vez de depender de que alguien se acuerde.
3. **`deno lint` en CI.** El `deno.json` ya está en `main` y pasa limpio, pero
   `ci.yml` solo corre `deno check`. El gate existe a medias: la regla está
   declarada y nadie la verifica.
4. **Borrar las ocho ramas ya integradas** del remoto. Mientras sigan ahí, cada
   una es un candidato a que alguien la retome creyendo que tiene trabajo vivo.
5. **`README.md`** sigue siendo la plantilla de Lovable, con
   `REPLACE_WITH_PROJECT_ID`.
