# Task 14: Generate shared API types [RF-003, RF-025]

**Status:** PENDING
**PRD:** `../prd/prd-realtime-notification-system.md`
**Spec:** `../specs/realtime-notification-system-design.md`
**Depends on:** task-13

## Visão Geral

Gerar os tipos TypeScript do OpenAPI do backend (que agora inclui os endpoints de notificação) no pacote `@repo/api-types`, para que o frontend possa consumir os novos endpoints com type safety completa.

## Arquivos

- Modify: `packages/api-types/` (gerado automaticamente por `pnpm generate:types`)

### Conformidade com as Skills Padrão

- Nenhum código manual nesta task — só comandos de geração

## Passos

### Passo 1: Build do backend para expor a spec OpenAPI

```bash
cd apps/backend
pnpm build
```

Esperado: build completo sem erros de TypeScript. O arquivo `dist/` é criado.

### Passo 2: Gerar os tipos compartilhados

Na raiz do monorepo:

```bash
pnpm generate:types
```

Esperado: `packages/api-types/src/` atualizado com os novos endpoints de notificação.

### Passo 3: Verificar que os novos tipos existem

```bash
grep -r "notifications" packages/api-types/src/ | grep "paths\|GET\|PATCH" | head -10
```

Esperado: linhas referenciando `/api/v1/notifications`, `/api/v1/notifications/unread-count`, `/api/v1/notifications/{id}/read`, `/api/v1/notifications/read-all`, `/api/v1/notifications/stream`.

### Passo 4: Type-check do frontend para verificar compatibilidade

```bash
pnpm --filter frontend tsc:check
```

Esperado: zero erros. Se o frontend ainda não usa os novos tipos, não há erros novos.

### Passo 5: Commit

```bash
git add packages/api-types/
git commit -m "feat(api-types): regenerate types including notification endpoints"
```

## Critérios de Sucesso

- `packages/api-types` contém tipos para todos os 5 endpoints de notificação [RF-003, RF-025]
- `pnpm --filter frontend tsc:check` passa sem erros
- Tipos disponíveis para import via `@repo/api-types` no frontend
