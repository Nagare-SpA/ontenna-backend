# Git workflow

## Ramas

- `main` es la rama de despliegue. Todo push a `main` **publica en producción**
  (ver [deploy-protocol.md](./deploy-protocol.md)). Nunca commitear directo sobre `main`.
- Trabajo en ramas con prefijo: `feat/`, `fix/`, `hardening/`, `chore/`, `docs/`.
- Toda rama parte de un `origin/main` recién sincronizado, nunca de un checkout viejo.
- Integración a `main` solo vía PR en GitHub (`Nagare-SpA/ontenna-backend`).

## Antes de cualquier push o PR

Ejecutar y obtener `exit 0`:

```bash
./scripts/check-main-sync.sh
```

Bloquea con código distinto por causa: `1` desactualizado, `2` divergido,
`3` árbol sucio, `4` error de entorno. **Un exit != 0 prohíbe el push.**
No usar `ALLOW_DIRTY=1` ni `SKIP_FETCH=1` para saltarse el gate: existen solo
para depurar el propio script.

Si está desactualizado:

```bash
git merge --ff-only origin/main   # o: git rebase origin/main si hay commits locales
```

Preferir `--ff-only` sobre `merge` a secas: falla ruidosamente en vez de crear
un merge commit silencioso.

## Git Worktrees

Cada worktree es una **instancia independiente en disco**. Reglas de aislamiento:

- **Nunca salir de la raíz del worktree activo.** Obtenerla siempre así:
  ```bash
  ROOT="$(git rev-parse --show-toplevel)"
  ```
- **Prohibidas las rutas absolutas** (`/Users/...`, `~/Documents/...`) en scripts,
  configuración, imports o comandos. Todo relativo a la raíz del worktree.
- **Prohibido `cd` fuera del worktree** para leer o escribir archivos de otro.
  Dos worktrees editando el mismo archivo es una race condition de I/O.
- Un worktree = una rama = una tarea. No reutilizar un worktree para otra tarea
  sin limpiarlo antes.
- El estado local (`SPEC.md`, `.claude/task-status.json`) es **por worktree** y
  está en `.gitignore`. No asumir que existe ni que es el mismo entre worktrees.
- `npm ci` es por worktree: `node_modules/` no se comparte.

Crear y retirar:

```bash
git worktree add ../ontenna-<tarea> -b feat/<tarea> origin/main
git worktree remove ../ontenna-<tarea>
```

## Cuándo commitear

**Todo desarrollo termina en commit. Dejar trabajo sin commitear no es un estado
válido de fin de tarea.**

- Al completar una unidad de trabajo coherente → commit, antes de pasar a la
  siguiente. No acumular varias features en el working tree.
- Al terminar una sesión de trabajo → el árbol queda limpio. Si algo queda a
  medias, commitear en la rama de trabajo con un asunto que lo diga (`wip: …`),
  no dejarlo suelto en disco.
- Antes de cambiar de rama o de worktree → commitear o `git stash`. Un árbol
  sucio al cambiar de contexto es cómo se pierde trabajo.

Por qué importa: el trabajo sin commitear no existe para nadie más, no sobrevive
a un `checkout` equivocado, y se vuelve irreconocible en semanas. Además bloquea
el gate de despliegue (`check-main-sync.sh` retorna `3` con árbol sucio), así que
un árbol sucio arrastrado es un deploy bloqueado más tarde.

Verificar al cerrar cualquier tarea:

```bash
git status --porcelain    # sin salida = correcto
```

## Cómo commitear

- Mensajes en imperativo, una línea de asunto; cuerpo solo si explica el *por qué*.
- Un commit = un cambio coherente. No mezclar refactor con feature con fix.
- No commitear secretos. `.env` está fuera de git y debe seguir así.
- No commitear estado de herramientas (`supabase/.temp/`, `.vercel/`, `dist/`).
