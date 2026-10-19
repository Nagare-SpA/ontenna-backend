# ontenna-backend

SPA en Vite + React + TS + shadcn/ui. El backend son las edge functions y
migraciones de Supabase. Pese al nombre del repo, `src/` es frontend.

## Reglas

@.claude/rules/git-workflow.md
@.claude/rules/deploy-protocol.md
@.claude/rules/scope-limits.md

## No negociable

- **Todo desarrollo termina en commit.** `git status --porcelain` sin salida
  antes de dar una tarea por terminada. Trabajo sin commitear se pierde.
- **Antes de push, merge o deploy:** `./scripts/check-main-sync.sh` → exit 0.

## Avisos

- `ontenna.org` lo sirve **Vercel**: cada push a `main` publica en producción. Sin staging.
- Supabase tiene **un solo proyecto**: `db push` y `functions deploy` tocan producción.
- `Dockerfile`/`Caddyfile` son para un cutover a Railway **aún no ejecutado**.

`npm run dev` · `npm run build` · `npm run lint`
