#!/usr/bin/env bash
# =====================================================================
# Crea una cuenta y le otorga 1 año de membresía "complimentary".
#
# Uso:
#   export SUPABASE_SERVICE_ROLE_KEY="eyJ...."   # tu service_role key
#   ./scripts/grant-membership.sh dani.cabello1709@gmail.com
#
# Qué hace:
#   1. Crea el usuario en auth.users (email ya confirmado).
#   2. Le da 1 año de acceso vía subscriptions.free_until
#      (el trigger lo sincroniza a personal_accounts -> la app lo ve).
#   3. Envía correo de invitación para que fije su propia contraseña.
#
# No requiere que el proyecto esté "linked" ni la contraseña de la BD.
# La service_role key se lee de la variable de entorno; no se guarda.
# =====================================================================
set -euo pipefail

PROJECT_REF="ycfrjvnuepfkeffsqxgm"
BASE="https://${PROJECT_REF}.supabase.co"
EMAIL="${1:?Falta el email. Uso: ./grant-membership.sh correo@ejemplo.com}"
KEY="${SUPABASE_SERVICE_ROLE_KEY:?Exporta SUPABASE_SERVICE_ROLE_KEY primero}"
FREE_UNTIL="$(date -u -v+1y '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -d '+1 year' '+%Y-%m-%dT%H:%M:%SZ')"

auth_hdr=(-H "apikey: ${KEY}" -H "Authorization: Bearer ${KEY}" -H "Content-Type: application/json")

echo "→ 1/4  Creando usuario ${EMAIL} ..."
create_resp="$(curl -sS -X POST "${BASE}/auth/v1/admin/users" "${auth_hdr[@]}" \
  -d "{\"email\":\"${EMAIL}\",\"email_confirm\":true}")"
user_id="$(printf '%s' "$create_resp" | grep -o '"id":"[0-9a-f-]\{36\}"' | head -1 | cut -d'"' -f4)"

if [ -z "${user_id}" ]; then
  # Puede que ya exista: búscalo.
  echo "   (no se creó; buscando si ya existe...)"
  list_resp="$(curl -sS "${BASE}/auth/v1/admin/users?email=${EMAIL}" "${auth_hdr[@]}")"
  user_id="$(printf '%s' "$list_resp" | grep -o '"id":"[0-9a-f-]\{36\}"' | head -1 | cut -d'"' -f4)"
fi
[ -n "${user_id}" ] || { echo "✗ No pude obtener el user_id. Respuesta:"; echo "$create_resp"; exit 1; }
echo "   user_id = ${user_id}"

echo "→ 2/4  Buscando plan 'pro' ..."
plan_id="$(curl -sS "${BASE}/rest/v1/plans?tier=eq.pro&select=id" "${auth_hdr[@]}" \
  | grep -o '"id":"[0-9a-f-]\{36\}"' | head -1 | cut -d'"' -f4)"
[ -n "${plan_id}" ] || { echo "✗ No encontré el plan 'pro'."; exit 1; }
echo "   plan_id = ${plan_id}"

echo "→ 3/4  Otorgando 1 año (free_until=${FREE_UNTIL}) ..."
# El trigger grant_signup_trial ya creó una suscripción de trial al crear el
# usuario, y subscriptions tiene UNIQUE(user_id). Por eso hacemos upsert con
# on_conflict=user_id (un POST simple chocaría con 409 y no aplicaría el año).
curl -sS -X POST "${BASE}/rest/v1/subscriptions?on_conflict=user_id" "${auth_hdr[@]}" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  -d "{\"user_id\":\"${user_id}\",\"plan_id\":\"${plan_id}\",\"status\":\"active\",\"free_until\":\"${FREE_UNTIL}\",\"admin_notes\":\"Grant manual 1 año\"}" \
  >/dev/null
echo "   ✓ suscripción creada/actualizada"

echo "→ 4/4  Enviando invitación para fijar contraseña ..."
curl -sS -X POST "${BASE}/auth/v1/invite" "${auth_hdr[@]}" \
  -d "{\"email\":\"${EMAIL}\"}" >/dev/null || \
  echo "   (si falla, manda un 'reset password' desde el panel)"

echo ""
echo "✅ Listo. ${EMAIL} tiene 1 año de acceso hasta ${FREE_UNTIL}."
echo "   Recibirá un correo para crear su contraseña."
