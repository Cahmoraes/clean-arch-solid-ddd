# Task 4: Instalar React Email e configurar suporte a TSX

**Status:** PENDING
**PRD:** `../prd/prd-user-email-notifications.md`
**Spec:** `../specs/user-email-notifications-design.md`

## Visão Geral

Instalar as dependências do React Email (`@react-email/components`, `@react-email/render`, `react`, `react-dom`) e configurar TypeScript + Vitest para compilar arquivos `.tsx` com a transform automática do React JSX. Sem este passo, as tasks 5 e 6 não compilam.

## Arquivos

- Modify: `apps/backend/package.json` (via pnpm add)
- Modify: `apps/backend/tsconfig.json`
- Modify: `apps/backend/test/vite.config.shared.ts`

### Conformidade com as Skills Padrão

- no-workarounds: configurar JSX corretamente via tsconfig em vez de usar `React.createElement` em arquivos `.ts`

## Passos

- [ ] **Step 1: Instalar as dependências**

```bash
cd apps/backend
pnpm add @react-email/components @react-email/render react react-dom
pnpm add -D @types/react @types/react-dom
```

Esperado: dependências instaladas sem erros. Verificar que `package.json` foi atualizado.

- [ ] **Step 2: Adicionar suporte a JSX no `tsconfig.json`**

Adicionar `"jsx"` e `"jsxImportSource"` ao bloco `compilerOptions` de `apps/backend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "useDefineForClassFields": false,
    "target": "esnext",
    "lib": ["ES2022", "dom"],
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "paths": {
      "@/*": ["./src/*"],
      "test/*": ["./test/*"]
    },
    "types": ["reflect-metadata", "vitest/globals"],
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

- [ ] **Step 3: Configurar Vitest para JSX automático**

Substituir o conteúdo de `apps/backend/test/vite.config.shared.ts`:

```typescript
import { defineConfig } from "vitest/config"

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    setupFiles: "./test/setup-test.ts",
    globals: true,
    sequence: {
      concurrent: false,
    },
  },
})
```

- [ ] **Step 4: Verificar que a checagem de tipos passa**

```bash
cd apps/backend && pnpm tsc:check
```

Esperado: zero erros TypeScript

- [ ] **Step 5: Verificar que os testes ainda passam**

```bash
cd apps/backend && pnpm test:run
```

Esperado: todos os testes passando (nenhuma regressão)

- [ ] **Step 6: Commit**

```bash
cd apps/backend && git add package.json tsconfig.json test/vite.config.shared.ts ../../pnpm-lock.yaml
git commit -m "chore: install React Email and configure TSX support

- Add @react-email/components, @react-email/render, react, react-dom
- Add @types/react, @types/react-dom as devDependencies
- Configure tsconfig.json with jsx: react-jsx and jsxImportSource: react
- Configure Vitest esbuild for automatic JSX transform

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `pnpm tsc:check` passa sem erros com arquivos `.tsx`
- `pnpm test:run` continua passando sem regressões
- `@react-email/render` e `@react-email/components` disponíveis no `node_modules`
