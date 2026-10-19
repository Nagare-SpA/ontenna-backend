#!/usr/bin/env bash
#
# check-main-sync.sh — guardarraíl determinista pre-push / pre-merge / pre-deploy.
#
# Verifica que el checkout actual esté sincronizado con la rama base remota
# ANTES de cualquier acción que dispare un build o toque producción.
#
#   Uso:   ./scripts/check-main-sync.sh [base]       (default: origin/main)
#   Env:   BASE_REF=origin/main   ALLOW_DIRTY=0   SKIP_FETCH=0
#
#   Códigos de salida (todos los fallos son != 0):
#     0  OK        → en sync, o adelante con árbol limpio. Autorizado.
#     1  BEHIND    → faltan commits de la base. NO desplegar.
#     2  DIVERGED  → historias divergentes. NO desplegar.
#     3  DIRTY     → cambios sin commitear. NO desplegar.
#     4  ENV       → no es repo git / falta remoto / fetch falló.
#
# Worktree-safe: todas las rutas derivan de `git rev-parse`, nunca absolutas.

set -euo pipefail

BASE_REF="${1:-${BASE_REF:-origin/main}}"
ALLOW_DIRTY="${ALLOW_DIRTY:-0}"
SKIP_FETCH="${SKIP_FETCH:-0}"

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  R=$'\033[31m'; G=$'\033[32m'; Y=$'\033[33m'; B=$'\033[1m'; X=$'\033[0m'
else
  R=''; G=''; Y=''; B=''; X=''
fi

die() { printf '%s✗ %s%s\n' "$R" "$1" "$X" >&2; exit "$2"; }
ok()  { printf '%s✓ %s%s\n' "$G" "$1" "$X"; }
note(){ printf '  %s\n' "$1"; }

# --- 0. Entorno -------------------------------------------------------------
git rev-parse --git-dir >/dev/null 2>&1 \
  || die "No es un repositorio git." 4

ROOT="$(git rev-parse --show-toplevel)"
REMOTE="${BASE_REF%%/*}"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

printf '%sSync check%s  worktree=%s  branch=%s  base=%s\n' \
  "$B" "$X" "${ROOT##*/}" "$BRANCH" "$BASE_REF"

git remote get-url "$REMOTE" >/dev/null 2>&1 \
  || die "El remoto '$REMOTE' no existe." 4

# --- 1. Fetch (única operación de red) --------------------------------------
if [ "$SKIP_FETCH" = "1" ]; then
  note "fetch omitido (SKIP_FETCH=1)"
else
  git fetch --quiet "$REMOTE" "${BASE_REF#*/}" 2>/dev/null \
    || die "No se pudo hacer fetch de $BASE_REF. ¿Sin red o sin permisos?" 4
fi

git rev-parse --verify --quiet "$BASE_REF^{commit}" >/dev/null \
  || die "La referencia base '$BASE_REF' no existe tras el fetch." 4

LOCAL="$(git rev-parse HEAD)"
BASE="$(git rev-parse "$BASE_REF")"

# --- 2. Árbol de trabajo limpio ---------------------------------------------
if [ -n "$(git status --porcelain)" ]; then
  if [ "$ALLOW_DIRTY" = "1" ]; then
    printf '%s! árbol sucio, continuando por ALLOW_DIRTY=1%s\n' "$Y" "$X"
  else
    printf '%s✗ Árbol de trabajo sucio — commitea o descarta antes de desplegar.%s\n' "$R" "$X" >&2
    git status --short >&2
    exit 3
  fi
else
  ok "árbol de trabajo limpio"
fi

# --- 3. Comparación de SHAs --------------------------------------------------
if [ "$LOCAL" = "$BASE" ]; then
  ok "HEAD == $BASE_REF (${LOCAL:0:7})"
  printf '%s✓ AUTORIZADO%s — sincronizado con %s\n' "$G$B" "$X" "$BASE_REF"
  exit 0
fi

AHEAD="$(git rev-list --count "$BASE_REF..HEAD")"
BEHIND="$(git rev-list --count "HEAD..$BASE_REF")"

note "local=${LOCAL:0:7}  base=${BASE:0:7}  ahead=$AHEAD  behind=$BEHIND"

if [ "$BEHIND" -gt 0 ] && [ "$AHEAD" -gt 0 ]; then
  printf '%s✗ DIVERGIDO%s — %s commits locales y %s remotos sin ancestro común reciente.\n' \
    "$R$B" "$X" "$AHEAD" "$BEHIND" >&2
  note "Resolver con:  git rebase $BASE_REF"
  exit 2
fi

if [ "$BEHIND" -gt 0 ]; then
  printf '%s✗ DESACTUALIZADO%s — faltan %s commits de %s.\n' "$R$B" "$X" "$BEHIND" "$BASE_REF" >&2
  MISSING="$(git log --oneline --no-decorate -n 5 "HEAD..$BASE_REF")"
  printf '%s\n' "$MISSING" >&2
  if [ "$BEHIND" -gt 5 ]; then
    note "… y $((BEHIND - 5)) commit(s) más" >&2
  fi
  note "Resolver con:  git merge --ff-only $BASE_REF" >&2
  exit 1
fi

ok "$AHEAD commit(s) por delante de $BASE_REF, sin divergencia"
printf '%s✓ AUTORIZADO%s — listo para push/PR\n' "$G$B" "$X"
exit 0
