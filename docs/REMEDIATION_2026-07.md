# Remediación de producción — 2026-07-14

Trabajo derivado de la auditoría de production-readiness. Rama: `hardening/prod-readiness`.
Estado de cada ítem: **DESPLEGADO** (ya en producción), **APLICAR** (archivo listo, requiere
acción), o **DASHBOARD** (solo panel Supabase / credenciales — no automatizable desde el repo).

---

## ✅ DESPLEGADO ya en producción (edge functions, verificado en vivo)

| Función | Fix | Verificación |
|---|---|---|
| `stripe-webhook` | Firma **obligatoria** (quitado el fallback que confiaba en JSON sin firmar) + guard de idempotencia por `stripe_event_id` | POST sin firma → **HTTP 400** ✓ |
| `mobile-login` | **Fail-closed**: perfil ausente o error de lectura ya NO concede acceso | login válido sigue OK ✓ |
| `mobile-me` / `mobile-subscription` | Entitlement de **fuente única**: honra `free_until` + `granted_free_until`; expone `is_entitled`; `current_period_end` = fecha efectiva | devuelve `is_entitled:true` ✓ |
| `send-verification-code` | Código con `crypto` (no `Math.random`); **cooldown 45 s** anti email-bomb; inspecciona error de Resend (502 si falla); no loguea PII | desplegada ✓ |
| `send-password-reset` | Inspecciona error de Resend; no filtra `error.message` ni loguea respuesta completa | desplegada ✓ |
| `mobile-forgot-password` | Reenvía `redirectUrl` (fix del reset roto) | desplegada ✓ |

---

## ✅ APLICADO — migraciones SQL (vía Management API, verificadas en vivo 2026-07-14)

1. **`20260714120000_security_lockdown.sql`** — 🔴 CRÍTICO — **APLICADO ✓**
   - Políticas RLS de auto-`subscriptions` eliminadas · `profiles` UPDATE con `WITH CHECK` + `REVOKE` de columnas sensibles.
   - `handle_new_user` con rol **`end_user`** hardcodeado + guard + `ON CONFLICT`.
   - Verificado: signup normal OK; intento de `account_type:super_admin` → queda `end_user` (perfil y rol).
2. **`20260714120100_integrity_idempotency.sql`** — **APLICADO ✓**
   - `billing_events_stripe_event_id_key` (idempotencia webhook) · `idx_profiles_email_lower` (0 duplicados) · `verification_codes.attempts` · `pg_cron` `verification_codes_cleanup` (03:17 diario).
3. **`20260714120200_entitlement_sync_fix.sql`** — **APLICADO ✓**
   - Sync ya no sobreescribe/borra `granted_free_until` (verificado en la definición de la función).

## ✅ DESPLEGADO tras la migración 2

- **`mobile-verify-email`** — protección de fuerza bruta (invalida el código tras 5 intentos). **Desplegado ✓**
  E2E verificado: código malo → `invalid_code` + `attempts++`; código bueno → `email_verified`; login → OK.
- Pendiente (follow-up): replicar la lógica de intentos en `verify-code` (path web).

## ⏳ APLICAR — otros archivos del repo

- **`supabase/config.toml`** — nuevo bloque `[auth]` (site_url, redirect allow-list, `enable_confirmations=false`,
  rate limits, SMTP de Resend). El `pass` del SMTP va por secret `SUPABASE_AUTH_SMTP_PASS`, **no** en git.
- **`src/pages/Signup.tsx`** — el signup web ahora llama a `mobile-signup` (un solo correo, sin el de Supabase).
  Se activa con el próximo build/deploy del sitio.
- **`.env`** — desindexado de git + `.env.example` agregado.

---

## 🔧 DASHBOARD / credenciales (no automatizable — requiere el panel)

1. **SMTP propio (Resend)** en Auth → SMTP Settings (esto es lo que arregla el incidente de raíz).
   Setear el secret `SUPABASE_AUTH_SMTP_PASS` = API key de Resend.
2. **Rotar la `service_role` key** (quedó expuesta en sesión) + por higiene Resend/Stripe.
3. **`STRIPE_WEBHOOK_SECRET`** confirmado como secret del proyecto (el webhook ahora lo exige).
4. **Verificar dominio `app.ontenna.org`** en Resend (SPF/DKIM/DMARC) + confirmar plan/cuota para cohortes.
5. **Redirect URLs allow-list** en Auth = las de `config.toml`.
6. **CAPTCHA / attack protection** en Auth (anti bot en signup).
7. **PITR / backups** confirmados + restore drill.

---

## Follow-ups P2 (hardening, no bloqueantes)
Hashear los códigos (no solo `attempts`), CORS restringido a orígenes conocidos, normalizar emails (citext),
`delete-user` transaccional + cancelación de customer Stripe, versionar el subsistema OTA (`firmware-check`),
squash de migraciones destructivas, observabilidad (Sentry) + alertas.
