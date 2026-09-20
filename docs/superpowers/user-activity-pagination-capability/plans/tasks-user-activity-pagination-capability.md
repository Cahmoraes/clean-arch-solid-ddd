# Tarefas: tamanho variável na paginação de atividades do perfil

**Spec:** `../specs/user-activity-pagination-capability-design.md`
**PRD:** `../prd/prd-user-activity-pagination-capability.md`

**Tech Stack:** Node · Fastify 5 · Next.js 16/React 19 · Vitest · TanStack Query · openapi-fetch · TypeScript

---

## Tarefas

- [x] 1. Parametrizar o endpoint de atividade do próprio usuário [FR-002, FR-008, FR-009, FR-010, FR-011] → `task-01.md`
- [x] 2. Integrar pageSize ao estado da URL e ao cache da atividade [FR-002, FR-004, FR-005, FR-007] → `task-02.md`
- [x] 3. Adicionar seletor visual de itens por página [FR-001, FR-003, FR-006] → `task-03.md`

## Foco de Revisão

- Query direta com `pageSize` ausente deve manter exatamente 20 e não alterar o contrato administrativo → `task-01`
- Valor inválido na URL do perfil deve ser canonicalizado sem loop de `router.replace` → `task-02`
- Troca rápida entre tamanhos não deve exibir dados de uma query anterior → `task-02`
- Controle visual deve permanecer acessível e indicar claramente a opção selecionada → `task-03`

## Ondas de Execução

- **Wave 1** (sequential): 1
- **Wave 2** (sequential): 2
- **Wave 3** (sequential): 3

## Verificação Completa

Executar os comandos específicos da mudança e, antes da conclusão, os gates
obrigatórios do repositório:

```bash
pnpm generate:types
pnpm --filter backend biome:fix
pnpm --filter backend tsc:check
pnpm --filter backend test:run
pnpm --filter backend test:business-flow
pnpm --filter backend build
pnpm --filter frontend lint:fix
pnpm --filter frontend tsc:check
pnpm --filter frontend test -- --run
pnpm --filter frontend build
pnpm biome:fix
pnpm tsc:check
pnpm test:run
pnpm build
```
