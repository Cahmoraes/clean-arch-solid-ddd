# Design — Melhorias de UX: menu lateral sticky e paginação numerada

**Data:** 2026-07-03
**Status:** Aprovado (brainstorming)

## Contexto

Duas inconsistências de UX identificadas pelo usuário:

1. O menu lateral (`aside`) não permanece fixo durante o scroll em telas com rolagem
   vertical longa (ex.: `/admin/usuarios`), obrigando o usuário a rolar para cima
   para acessar a navegação.
2. A paginação é inconsistente entre telas: `/admin/usuarios` já mostra números de
   página clicáveis com salto direto para a página desejada; `/academias` e
   `/check-ins` mostram apenas o texto/número da página atual, sem permitir pular
   entre páginas.

## Seção 1 — Menu lateral (correção de causa raiz)

**Causa raiz:** em `authenticated-shell.tsx`, o wrapper flex
(`<div className="flex min-w-0 flex-col">`) que envolve `header` + `main` não possui
`min-h-0`. Sem essa propriedade, o item flex não encolhe abaixo do tamanho do seu
conteúdo — quando o conteúdo da página é maior que a viewport, o `main` cresce em vez
de rolar internamente (`overflow-y-auto` não tem efeito), empurrando o documento
inteiro e arrastando o `aside` junto no scroll. Ocorre tanto em desktop quanto mobile,
pois é um comportamento intrínseco de flexbox, não uma questão de breakpoint.

**Correção:** adicionar `min-h-0` no wrapper flex e no `main`, restaurando o scroll
isolado que o grid `h-screen` já foi desenhado para ter. Sem `position: fixed`, sem
mudança estrutural, sem impacto na animação de colapso do menu.

**Arquivo afetado:** `apps/frontend/src/components/layout/authenticated-shell.tsx`
(única mudança).

**Teste:** validação visual/manual pós-implementação; não é prático simular scroll
real em jsdom para uma mudança de classe CSS.

## Seção 2 — Paginação numerada (componente compartilhado)

### 2a. Componente compartilhado (frontend)

Extrair a lógica de `UsersPagination` (hoje inline em
`admin/usuarios/page.tsx`) para um componente reutilizável em
`src/components/ui/numbered-pagination.tsx`, exportando `NumberedPagination` e a
função pura `pageNumbers(currentPage, totalPages)` (janela deslizante de até 5
números, mesma regra já usada em admin/usuarios).

Consumo:
- `admin/usuarios/page.tsx`: passa a importar o componente compartilhado (remove
  duplicação, sem mudança de comportamento observável).
- `CheckInsPager`: troca o link único (`isActive`) pelo range numerado — `total`/
  `pages` já vêm do backend, é só trocar a renderização.
- `GymPagination`: passa a receber `totalPages` (novo) em vez de
  `hasPrevious`/`hasNext`, usando o mesmo componente compartilhado.

Testes: ajustar `pagination.test.tsx`, `check-ins-pager.test.tsx` e os testes de
`gym-pagination` para refletir a nova prop `totalPages` e o range numerado.

### 2b. Backend — total de academias

Padrão a seguir: o mesmo já usado em `CheckInRepository.findMany`
(`{ items, total }`), aplicado agora em `GymRepository.fetchGyms`.

Mudanças:
- `GymRepository.fetchGyms`: assinatura passa de `Promise<Gym[]>` para
  `Promise<{ items: Gym[]; total: number }>`.
- `PrismaGymRepository.fetchGyms`: usa `Promise.all([findMany, count])` com o mesmo
  `where`, mantendo `env.ITEMS_PER_PAGE`.
- `InMemoryGymRepository.fetchGyms`: ajustado para retornar `{ items, total }`
  (usado nos testes de use case).
- `FetchAllGymsUseCase` e `SearchGymUseCase`: passam a retornar
  `{ items: DTO[], total: number }`.
- Controllers (`fetch-all-gyms`, `search-gym`): resposta HTTP inclui `total`
  (schema OpenAPI atualizado); rodar `pnpm generate:types` na raiz do monorepo
  para propagar tipos ao frontend.
- Frontend: `useAllGyms`/`useGymsByName` passam a expor `total`;
  `academias/page.tsx` calcula `totalPages` e repassa ao `GymPagination`.

Testes: ajustar testes unitários dos use cases (`fetch-all-gyms`, `search-gym`),
`in-memory-gym-repository.test.ts`, e os `business-flow-test.ts` de
`fetch-all-gyms`/`search-gym` para validar o campo `total` na resposta.

## Abordagens consideradas e descartadas

- **Menu lateral:** usar `position: fixed`/`sticky` no `aside` como alternativa —
  descartada por ser redundante (a arquitetura de grid já suporta scroll isolado) e
  por complicar a animação de `grid-template-columns` do colapso do menu.
- **Paginação:** duplicar a lógica de números de página em cada componente sem
  extrair abstração compartilhada — descartada por já existirem 3 usos concretos
  (não é abstração especulativa), o que justifica a extração agora.
- **Academias:** manter paginação só com `hasPrevious`/`hasNext` sem total real —
  descartada; usuário optou por estender o backend para paridade completa com as
  demais telas.

## Próximos passos

Seguir para `criar-prd` e depois `criar-techspec` para detalhar a implementação.
