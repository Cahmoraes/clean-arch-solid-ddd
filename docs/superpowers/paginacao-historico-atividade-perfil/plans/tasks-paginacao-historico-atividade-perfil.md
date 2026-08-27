# Tarefas: Paginação do histórico de atividades do perfil

**Spec:** `../specs/paginacao-historico-atividade-perfil-design.md`
**PRD:** `../prd/prd-paginacao-historico-atividade-perfil.md`

**Goal:** Permitir navegar pelo histórico de atividades do próprio perfil em páginas de 20 itens, com metadados, URL reproduzível e paginação visual consistente.

**Architecture:** A paginação será aplicada no read path existente do bounded context User. O backend mantém o merge de eventos de conta e check-ins, retorna a página solicitada e o total; o frontend consome os tipos OpenAPI gerados, sincroniza `page` na URL e reutiliza `NumberedPagination`.

**Tech Stack:** TypeScript, Fastify, Zod/OpenAPI, Prisma, Inversify, Next.js, React, TanStack Query, `openapi-fetch`, Vitest, MSW e Testing Library.

---

## Tarefas

- [x] 1. Paginar o caso de uso e as fontes de atividades [FR-002, FR-004] → `task-01.md`
- [ ] 2. Publicar e gerar o contrato HTTP paginado [FR-001, FR-003, FR-007] → `task-02.md`
- [ ] 3. Navegar páginas no perfil e renderizar os estados da lista [FR-005, FR-006] → `task-03.md`

## Ondas de Execução

- **Wave 1** (sequential): 1
- **Wave 2** (sequential): 2
- **Wave 3** (sequential): 3

## Barreira de Verificação

Após cada onda, executar os testes direcionados da task. Antes do handoff final, executar a cadeia completa aplicável ao monorepo:

```bash
pnpm generate:types
pnpm --filter backend biome:fix
pnpm --filter backend tsc:check
pnpm --filter backend test:run
pnpm --filter backend test:business-flow
pnpm --filter backend test:contract
pnpm --filter backend test:fitness
pnpm --filter backend test:e2e:prisma
pnpm --filter backend build
pnpm --filter frontend lint:fix
pnpm --filter frontend tsc:check
pnpm --filter frontend test -- --run
pnpm --filter frontend build
pnpm build
```
