import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // `supabase/functions/` corre en Deno, no en el browser: otro runtime, otro
  // linter. Este ESLint es el del frontend y no entiende los pragmas
  // `// deno-lint-ignore`, por lo que los reportaba como errores propios. El CI
  // type-checkea esas funciones con `deno check` (job `edge-functions`).
  //
  // `.claude/worktrees/<nombre>/` son worktrees de Claude Code: viven DENTRO de
  // la raíz del repo y contienen una copia completa de `src/`. Sin esta
  // exclusión, `eslint .` desde la raíz lintea una copia extra del código por
  // cada worktree abierto, y el conteo sale inflado y distinto en cada corrida
  // según qué rama tenga cada uno. El CI no lo nota —`actions/checkout` da un
  // árbol limpio— pero cualquiera que lintee en local sí. `.gitignore` ya tiene
  // `.claude/*`, pero ESLint no lee `.gitignore` para esto.
  { ignores: ["dist", ".claude/**", "supabase/functions/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // Primitivas generadas por shadcn: las reglas del repo prohíben editarlas a
    // mano (se regeneran). Sus `interface X extends Y {}` son el patrón que
    // emite el generador, no deuda nuestra.
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
);
