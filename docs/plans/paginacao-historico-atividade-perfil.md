# Plano aceito: Paginação do histórico de atividades do perfil

**Status:** ACEITO  
**Escopo:** backend/API e frontend  
**Data:** sessão de planejamento atual

## Objetivo

Adicionar paginação de 20 itens ao histórico de atividades exibido no perfil do usuário, mantendo o merge de eventos de conta e check-ins, sincronizando a página com a URL e exibindo controles numerados na aba **Atividade**.

## Decisões

- Usar paginação offset com `page`, iniciando em 1.
- Manter `pageSize = 20` fixo no servidor.
- Expor `events` e `pagination` no endpoint autenticado `GET /users/me/activity?page=N`.
- Retornar `page`, `pageSize`, `total` e `totalPages`.
- Ordenar globalmente por data decrescente e `id` decrescente como desempate estável.
- Retornar `200` com lista vazia para páginas além do total.
- Manter o endpoint administrativo sem paginação pública.
- Sincronizar `page` na URL do perfil e reutilizar `NumberedPagination`.

## Execução

1. **Paginar o read path do backend:** atualizar port, caso de uso, DAOs Prisma/in-memory e consumidores administrativos, com testes de offset, total, ordenação e páginas vazias.
2. **Publicar o contrato HTTP:** atualizar controller autenticado, schema OpenAPI, business-flow e regenerar `@repo/api-types`.
3. **Atualizar a experiência do perfil:** adaptar hook, query key, URL, `ActivityTab`, `ProfilePage` e consumidores administrativos, com estados de loading, erro, vazio e paginação responsiva.

O detalhamento executável está em:

- `docs/superpowers/paginacao-historico-atividade-perfil/plans/tasks-paginacao-historico-atividade-perfil.md`
- `docs/superpowers/paginacao-historico-atividade-perfil/plans/task-01.md`
- `docs/superpowers/paginacao-historico-atividade-perfil/plans/task-02.md`
- `docs/superpowers/paginacao-historico-atividade-perfil/plans/task-03.md`

## Rastreabilidade

- PRD: `docs/superpowers/paginacao-historico-atividade-perfil/prd/prd-paginacao-historico-atividade-perfil.md`
- Spec: `docs/superpowers/paginacao-historico-atividade-perfil/specs/paginacao-historico-atividade-perfil-design.md`
- Mockup aprovado: `docs/superpowers/paginacao-historico-atividade-perfil/specs/mockups/paginacao-historico-atividade-perfil-visual.md`

## Validação do plano

`validate-tasks.cjs` retornou `valid: true`, sem erros ou avisos, com todas as exigências `FR-001` a `FR-007` cobertas e três waves sequenciais.

## Barreira final

Após a implementação, executar:

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
