---
created_at: "2026-07-03T10:39:38-03:00"
updated_at: "2026-07-03T10:39:38-03:00"
---

# Design: Normalizar menu lateral fixo e paginação numerada

**Modo:** caminho leve (bug pontual + normalização de UI, sem nova arquitetura).

## Contexto

Dois problemas de UX reportados:

1. Em telas com conteúdo vertical longo (ex: `/admin/usuarios`), o menu lateral não
   permanece fixo — o usuário precisa rolar para cima para acessá-lo.
2. As telas `/academias` e `/check-ins` mostram paginação apenas textual ("Página 1"
   ou número atual sem range), diferente de `/admin/usuarios`, que já tem paginação
   numerada com salto direto para qualquer página.

## Causa raiz — menu lateral

`AuthenticatedShell` (`src/components/layout/authenticated-shell.tsx`) já usa um grid
`h-screen` com scroll interno independente entre `<aside>` e `<main>` — a estrutura
está correta em intenção. Falta, porém, `min-h-0` na cadeia flex do container de
conteúdo (`<div className="flex min-w-0 flex-col">` que envolve header + `<main
className="flex-1 overflow-y-auto">`). Sem `min-h-0`, o item flex cresce para caber
todo o conteúdo em vez de respeitar a altura do container pai, e o documento inteiro
passa a rolar (arrastando o menu) em páginas com conteúdo mais alto que a viewport.

## Causa raiz — paginação

- `/admin/usuarios`: já tem `total`/`totalPages` vindos da API e um componente local
  (`UsersPagination`) com números de página clicáveis.
- `/check-ins`: já recebe `total` da API (`useMyCheckIns`), mas `CheckInsPager` só
  renderiza o número da página atual — a informação existe, falta só a UI.
- `/academias`: os endpoints `GET /gyms` e `GET /gyms/search/:name` retornam hoje um
  array puro, sem contagem total. Não há como calcular `totalPages` sem alterar o
  backend.

## Decisão

Alterar o backend para que `/gyms` e `/gyms/search/:name` sigam o mesmo padrão já
usado em `fetch-users.controller.ts` (`{ users, pagination: { total, page, limit } }`)
e em `prisma-notification.repository.ts` (contagem via `Promise.all([findMany, count])`).
Isso é uma mudança de contrato (array puro → objeto paginado), mas segue um padrão já
estabelecido no código, não introduz uma nova unidade arquitetural, e é reversível.

Extrair a lógica de paginação numerada de `UsersPagination` para um componente
compartilhado `NumberedPagination` (`components/ui/`), consumido pelas três telas.

## Componentes afetados

**Backend (`apps/backend`):**
- `PrismaGymRepository.fetchGyms` — retorna `{ gyms: Gym[], total: number }` via
  `Promise.all([findMany, count])`.
- `GymRepository` (interface) — assinatura atualizada.
- `FetchAllGymsUseCase` / `SearchGymUseCase` — repassam `total`.
- `FetchAllGymsController` / `SearchGymController` — corpo de resposta passa a ser
  `{ gyms: Gym[], pagination: { total, page, limit } }`; schemas Zod/Swagger atualizados.

**Frontend (`apps/frontend`):**
- `pnpm generate:types` após a mudança de backend (regenera `@repo/api-types`).
- `useAllGyms` / `useGymsByName` (`features/gyms/api/index.ts`) — passam a expor
  `{ items, total }` (ou equivalente) em vez de `Gym[]` puro.
- Novo `components/ui/numbered-pagination.tsx` — componente `NumberedPagination`
  (props: `page`, `totalPages`, `onChange`), extraído de `UsersPagination`.
- `admin/usuarios/page.tsx` — `UsersPagination` local removida, passa a usar
  `NumberedPagination`.
- `GymPagination` (`features/gyms/components/gym-pagination.tsx`) — passa a usar
  `NumberedPagination` com `totalPages` vindo do backend.
- `CheckInsPager` (`features/check-ins/components/check-ins-pager.tsx`) — passa a
  usar `NumberedPagination` (já tem `pages` disponível).
- `authenticated-shell.tsx` — adicionar `min-h-0` na cadeia flex do container de
  conteúdo.

## Testes

- Backend: testes unitários do use case e do repository (contagem/total), teste de
  contrato do controller (novo formato de resposta).
- Frontend: testes unitários de `NumberedPagination`, atualização dos testes
  existentes de `gym-pagination` e `check-ins-pager` (MSW mocka novo formato paginado),
  teste do fix de scroll do `authenticated-shell` (se houver teste de layout) ou
  verificação manual assistida por Playwright.

## Riscos

- 🔴 Mudança de contrato do backend quebra qualquer teste/mocks existentes que
  esperam array puro em `/gyms` — mitigado por TDD, atualizando todos os testes
  afetados na mesma tarefa da mudança de backend.
- 🟡 Extrair `NumberedPagination` pode introduzir regressão visual sutil em
  `/admin/usuarios` (já em produção) — mitigado mantendo os mesmos `data-testid`
  onde possível e rodando os testes existentes dessa tela.

## Fora de escopo

- Nenhuma mudança de arquitetura, nova entidade de domínio ou novo bounded context.
- Paginação "infinite scroll" ou virtualização — fora do pedido original.
