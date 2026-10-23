# Checklist de producción — backend Ontenna

Requerimientos estándar para un backend en producción (basados en **OWASP API Security Top 10**,
**12-Factor App** y **production-readiness** tipo Google SRE), verificados contra el proyecto
**`ycfrjvnuepfkeffsqxgm`** el **2026-07-14**.

Leyenda: ✅ cumple · ⚠️ parcial · ❌ falta · 🔲 verificar en dashboard (no introspectable por API)

---

## 1. Seguridad — Autenticación y autorización
| # | Requerimiento | Estado | Evidencia / nota |
|---|---|---|---|
| 1.1 | RLS habilitado en **todas** las tablas | ✅ | 15/15 tablas con `rowsecurity=true` y ≥1 política (verificado) |
| 1.2 | Sin escalada de privilegios en signup | ✅ | `handle_new_user` fuerza `end_user`; probado: metadata `super_admin` → queda `end_user` |
| 1.3 | Usuario no puede auto-otorgarse entitlement | ✅ | políticas de escritura de `subscriptions` eliminadas |
| 1.4 | Políticas UPDATE con `WITH CHECK` | ✅ | `profiles` con WITH CHECK + `REVOKE` de columnas sensibles |
| 1.5 | Autz propia en funciones `verify_jwt=false` | ⚠️ | `mobile-me/subscription` validan token; falta rate-limit uniforme |
| 1.6 | Rate limiting / anti fuerza bruta | ✅ | código de verificación (5 intentos, móvil+web), cooldown de envío, **`mobile-login` lockout** (8/15min → 429, probado) |
| 1.7 | Protección de bots (CAPTCHA) | ❌ | pendiente — Auth → Attack Protection (dashboard) |
| 1.8 | Firma de webhooks verificada | ✅ | `stripe-webhook` la **exige**; `STRIPE_WEBHOOK_SECRET` seteado; probado: sin firma → 400 |
| 1.9 | CORS restringido a orígenes conocidos | ⚠️ | hoy `*`; endurecer en funciones browser (checkout/portal/delete-user) |
| 1.10 | Sin secretos en el código/repo | ✅ | secrets en Supabase; `.env` desindexado + `.env.example`; anon key (pública) OK |
| 1.11 | Rotación de secretos + runbook | ❌ | **`service_role` expuesta en sesión → rotar**; sin cadencia documentada |
| 1.12 | Errores sin fugas de internals | ⚠️ | estandarizado en funciones tocadas; resto aún filtra `error.message` |

## 2. Fiabilidad y datos
| # | Requerimiento | Estado | Evidencia / nota |
|---|---|---|---|
| 2.1 | Idempotencia en el camino del dinero | ✅ | `UNIQUE(stripe_event_id)` + guard de dedup en el webhook |
| 2.2 | Restricciones de integridad/unicidad | ✅ | `idx_profiles_email_lower`, `billing_events_stripe_event_id_key` |
| 2.3 | Signup no se rompe por side-effects | ✅ | los **3** triggers de `auth.users` (`handle_new_user`, `_personal_account`, `grant_signup_trial`) con `EXCEPTION` guard |
| 2.4 | Retención de datos sensibles | ✅ | `pg_cron` `verification_codes_cleanup` (03:17 diario) |
| 2.5 | Backups / PITR habilitado | 🔲 | verificar plan y PITR en el dashboard |
| 2.6 | Plan de DR + restore drill | ❌ | no documentado / no ejecutado |
| 2.7 | Borrado de cuenta consistente | ✅ | `delete-user` usa RPC transaccional `delete_user_data` + limpia `personal_accounts` + borra el customer de Stripe |

## 3. Observabilidad y operación
| # | Requerimiento | Estado | Evidencia / nota |
|---|---|---|---|
| 3.1 | Logging estructurado | ⚠️ | solo `console.log/error`; sin correlación |
| 3.2 | Error tracking (Sentry o equiv.) | ❌ | no integrado |
| 3.3 | Alertas (envío de correo / webhook / pagos) | ❌ | sin alertas |
| 3.4 | Métricas / queries lentas | ⚠️ | `pg_stat_statements` disponible; sin dashboard |
| 3.5 | Health check / smoke automatizado | ✅ | `scripts/smoke.sh` (7 checks, auto-limpiante) — ver [TESTING_STRATEGY](TESTING_STRATEGY.md) |

## 4. Email / deliverability (causa del incidente de los 40)
| # | Requerimiento | Estado | Evidencia / nota |
|---|---|---|---|
| 4.1 | SMTP propio (no el mailer de juguete) | ❌ | **no hay `SUPABASE_AUTH_SMTP_PASS`** — el arreglo de raíz sigue pendiente |
| 4.2 | Dominio verificado (SPF/DKIM/DMARC) | 🔲 | confirmar `app.ontenna.org` en Resend |
| 4.3 | Sin correos redundantes en signup | ✅ | móvil y web usan `admin.createUser` (sin correo de Supabase) |
| 4.4 | Fallos de envío detectables | ✅ | `send-*` inspeccionan el error de Resend (502 si falla) |
| 4.5 | Rate limits de Auth adecuados | ⚠️ | `config.toml` sube a 100/h; aplicar en el proyecto vivo |

## 5. Config y despliegue (12-Factor)
| # | Requerimiento | Estado | Evidencia / nota |
|---|---|---|---|
| 5.1 | Config por entorno en secrets, no en código | ✅ | env + Supabase secrets |
| 5.2 | Paridad dev/staging/prod | ❌ | **no hay staging — se testea en prod** (lo resuelve TESTING_STRATEGY) |
| 5.3 | Migraciones versionadas e idempotentes | ⚠️ | nuevas ✅; históricas con `DELETE` destructivo sin guarda |
| 5.4 | CI (typecheck / lint / tests) | ⚠️ | `.github/workflows/ci.yml` agregado (lint + tsc + deno check + smoke); falta configurar secrets de staging |
| 5.5 | Rollback / recuperación de deploy | ⚠️ | funciones versionadas en Supabase; sin proceso escrito |

## 6. Privacidad / cumplimiento
| # | Requerimiento | Estado | Evidencia / nota |
|---|---|---|---|
| 6.1 | Cifrado en tránsito y reposo | ✅ | HTTPS obligatorio + cifrado at-rest de Supabase |
| 6.2 | Minimización de PII | ⚠️ | códigos en texto plano (hashing pendiente, `pgcrypto` ya disponible) |
| 6.3 | Borrado GDPR completo (incl. procesadores) | ❌ | `delete-user` no borra en Stripe/Resend |
| 6.4 | Retención documentada | ⚠️ | limpieza de códigos ✅; política general por escribir |

---

## Resumen ejecutivo
- **Cerrado y verificado:** los agujeros críticos de acceso (RLS, super_admin, auto-suscripción), la firma+idempotencia del webhook, y las migraciones de integridad. El flujo signup→verify→login→entitlement pasa el smoke test.
- **Bloqueadores restantes para "listo para vender", casi todos de dashboard:**
  1. **SMTP propio (Resend)** — 4.1 (raíz del incidente)
  2. **Rotar `service_role`** — 1.11
  3. **PITR/backups + restore drill** — 2.5/2.6
  4. **Staging + CI** — 5.2/5.4 (para no volver a tocar prod a mano)
- **Cerrado en la última tanda:** lockout de login, guardas en los 3 triggers, `delete-user` transaccional + Stripe, brute-force en `verify-code` (web), `subscription_data.metadata` en checkout, CI, CORS de `delete-user`, fugas de error en las funciones tocadas.
- **Endurecimiento (P2) que queda:** CAPTCHA (dashboard), hashing de códigos (requiere transición cuidadosa por códigos en vuelo), CORS de `stripe-checkout`/`stripe-portal`, fugas de `error.message` en `start-trial`/`stripe-portal`/`stripe-subscription`, observabilidad/alertas (Sentry).
