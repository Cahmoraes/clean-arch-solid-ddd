# Especificação Técnica — Migração para Monorepo

## Resumo Executivo

A migração converte o repositório de um backend isolado em um monorepo gerenciado por **pnpm
workspaces** e orquestrado pelo **Turborepo**. O código backend existente é movido para
`apps/backend/`, um novo app Next.js é criado em `apps/frontend/`, e um pacote interno
`packages/api-types` distribui os tipos TypeScript gerados do OpenAPI para o frontend via
`@repo/api-types`.

A maior mudança técnica é o ajuste dos caminhos de resolução de módulos, scripts npm e configuração
do Biome para que cada workspace seja autocontido, enquanto o `turbo.json` na raiz coordena a
execução de tarefas com caching incremental.

## Arquitetura do Sistema

### Visão Geral dos Componentes

| Componente | Responsabilidade | Status |
|---|---|---|
| `pnpm-workspace.yaml` (raiz) | Declara workspaces `apps/*` e `packages/*` | Modificado |
| `package.json` (raiz) | Scripts raiz (`dev`, `build`, `test`, `lint`, `generate:types`) | Novo |
| `turbo.json` (raiz) | Pipeline de tarefas com dependências e caching | Novo |
| `apps/backend/` | Código backend atual movido da raiz | Movido |
| `apps/frontend/` | App Next.js 15 com App Router e TanStack Query | Novo |
| `packages/api-types/` | Pacote `@repo/api-types` com tipos gerados do OpenAPI | Novo |
| `apps/backend/scripts/generate-client.ts` | Atualizado: output aponta para `packages/api-types/` | Modificado |

**Fluxo de dados dos tipos:**

```
apps/backend (Fastify sobe)
  → docs/openapi-spec.json
  → scripts/generate-client.ts
  → packages/api-types/index.d.ts
  → apps/frontend importa @repo/api-types
```

## Design de Implementação

### Interfaces Principais

**`packages/api-types/package.json`**

```json
{
  "name": "@repo/api-types",
  "version": "0.0.1",
  "exports": { ".": "./index.d.ts" },
  "types": "./index.d.ts"
}
```

**`apps/frontend` — cliente HTTP tipado**

```typescript
import createClient from "openapi-fetch"
import type { paths } from "@repo/api-types"

export const api = createClient<paths>({ baseUrl: process.env.NEXT_PUBLIC_API_URL })
```

**`turbo.json` (raiz)**

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build":   { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**", "build/**"] },
    "dev":     { "persistent": true, "cache": false },
    "test":    { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "lint":    { "outputs": [] },
    "generate:types": { "cache": false }
  }
}
```

**`pnpm-workspace.yaml` (raiz)**

```yaml
packages:
  - "apps/*"
  - "packages/*"
onlyBuiltDependencies:
  - "@prisma/client"
  - "@prisma/engines"
  - esbuild
  - prisma
  - unrs-resolver
  - better-sqlite3
```

### Modelos de Dados

Não há novos modelos de dados. Os tipos existentes do backend (`api-types.d.ts`) são redistribuídos
como `@repo/api-types` sem transformação.

### Endpoints de API

Nenhum endpoint novo. O frontend consome os endpoints existentes do backend via `openapi-fetch`.

## Pontos de Integração

### Script `generate:types` (raiz)

```json
"generate:types": "pnpm --filter backend openapi:export && pnpm --filter backend openapi:generate-client"
```

O script `apps/backend/scripts/generate-client.ts` terá o `OUTPUT_FILE` atualizado para usar
caminho relativo ao `__dirname` apontando para `packages/api-types/index.d.ts`.

### Biome (workspace compartilhado)

O `biome.json` existente permanece em `apps/backend/`. O frontend recebe seu próprio `biome.json`
com as mesmas regras. O `package.json` raiz expõe `"lint": "turbo lint"`.

### Dependência `@repo/api-types` no frontend

```json
// apps/frontend/package.json
"dependencies": {
  "@repo/api-types": "workspace:*"
}
```

O Turborepo resolve o caminho interno via pnpm workspace protocol — sem build step necessário para
o pacote de tipos (apenas `.d.ts`).

## Abordagem de Testes

### Testes Unidade

- Os testes existentes do backend (`*.test.ts`) continuam em `apps/backend/test/` sem alteração
- Os configs Vitest (`test/vite.config.*.ts`) permanecem relativos ao backend workspace
- `pnpm test` na raiz executa `turbo test`, que delega para `pnpm --filter backend test:run`

### Testes de Integração

- `test:business-flow` e `test:e2e:prisma` permanecem exclusivos do backend workspace
- Acessíveis via `pnpm --filter backend test:business-flow`

### Testes de E2E

- Fora do escopo desta entrega (frontend não terá features implementadas)
- Quando implementado: Playwright em `apps/frontend/` com `turbo e2e`

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Atualizar `pnpm-workspace.yaml`** — habilita workspaces antes de mover qualquer arquivo
2. **Criar `turbo.json` e `package.json` raiz** — pipeline antes de mover apps
3. **Mover backend para `apps/backend/`** — preservar `.git` history via `git mv`
4. **Criar `packages/api-types/`** — pacote mínimo (`package.json` + `.gitkeep`)
5. **Atualizar `generate-client.ts`** — redirecionar output para `packages/api-types/`
6. **Validar backend** — `pnpm --filter backend test:run` e `pnpm --filter backend build`
7. **Criar `apps/frontend/`** — `pnpm create next-app` com TypeScript, App Router, Biome
8. **Adicionar dependências do frontend** — `openapi-fetch`, `@tanstack/react-query`, `@repo/api-types`
9. **Validar monorepo completo** — `pnpm install` na raiz + `pnpm build` + `pnpm test`

### Dependências Técnicas

- `turbo` deve estar instalado como devDependency na raiz antes do passo 3
- `packages/api-types/index.d.ts` gerado antes de `pnpm --filter frontend build`
- Docker (PostgreSQL, Redis, RabbitMQ) disponível para testes do backend

## Monitoramento e Observabilidade

Nenhuma mudança de observabilidade nesta entrega. O backend mantém seus logs Winston existentes.
O Turborepo gera logs por workspace em `.turbo/` automaticamente.

## Considerações Técnicas

### Decisões Principais

| Decisão | Escolha | Justificativa |
|---|---|---|
| Estrutura de pastas | `apps/*` + `packages/*` | Convenção oficial Turborepo; facilita adição de novos apps |
| Linter do frontend | Biome | Unifica tooling; evita duas configurações de linting |
| Tipos compartilhados | Pacote `@repo/api-types` (`.d.ts` puro) | Sem build step; zero overhead de bundle |
| HTTP client frontend | `openapi-fetch` | Já é devDependency do backend; mesma lib, zero curva |
| Regeneração de tipos | Script único na raiz (`generate:types`) | Elimina dois comandos manuais |

### Riscos Conhecidos

| Risco | Mitigação |
|---|---|
| Paths quebrados no backend após `git mv` | Validar `pnpm --filter backend tsc:check` após mover |
| `process.cwd()` no `generate-client.ts` muda com workspace | Usar `__dirname` ou `import.meta.dirname` para calcular caminho absoluto |
| `biome.json` ignora `apps/frontend/` se `includes` não for atualizado | Criar `biome.json` local no frontend ou atualizar o da raiz |
| `pnpm-workspace.yaml` `onlyBuiltDependencies` precisa ser na raiz | Mover a seção do backend para o `pnpm-workspace.yaml` raiz |

### Conformidade com Skills Padrões

- **`tanstack-query-best-practices`** — aplicável ao setup do TanStack Query no frontend
- **`tanstack-router-best-practices`** — aplicável se roteamento avançado for necessário no frontend
- **`no-workarounds`** — aplicável em qualquer ajuste de paths ou resolução de módulos
- **`vitest`** — aplicável para configurar testes no workspace frontend quando implementado

### Arquivos Relevantes e Dependentes

| Arquivo | Ação |
|---|---|
| `pnpm-workspace.yaml` | Modificado — adicionar `apps/*`, `packages/*` |
| `package.json` (raiz) | Novo — scripts raiz + `turbo` devDependency |
| `turbo.json` | Novo |
| `apps/backend/` | Movido da raiz (todos os arquivos atuais) |
| `apps/backend/scripts/generate-client.ts` | Modificado — atualizar `OUTPUT_FILE` |
| `apps/backend/package.json` | Modificado — adicionar `name: "backend"` |
| `packages/api-types/package.json` | Novo |
| `packages/api-types/index.d.ts` | Gerado pelo script |
| `apps/frontend/package.json` | Novo |
| `apps/frontend/next.config.ts` | Novo |
| `apps/frontend/tsconfig.json` | Novo |
| `apps/frontend/biome.json` | Novo |
