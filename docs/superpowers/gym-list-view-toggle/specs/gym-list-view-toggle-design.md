---
created_at: "2026-07-27T21:00:26-03:00"
updated_at: "2026-07-27T21:00:26-03:00"
---

# Design — Toggle de Visualização em Linhas para Academias

## Visão Geral

Adicionar à tela `/academias` uma segunda forma de visualizar os resultados: além do grid de cards atual, uma **visualização em linhas** (lista compacta, um item por linha). Um toggle na linha de busca permite alternar entre as duas visualizações; a escolha é **persistida em cookie** e sobrevive a reloads/novas sessões.

Escopo fechado em brainstorming:
- Toggle estilo **segmented control com ícones** (`LayoutGrid`/`List`), aprovado via mockup ("Opção A").
- `GymResults` decide, por item, se renderiza `GymCard` ou o novo `GymRow`.
- Persistência via **cookie** (`gym_view`), mesmo padrão do toggle de sidebar já existente no projeto.
- Hidratação **client-only** (sem split server/client de `page.tsx`) — aceitando um possível flash de 1 frame na view padrão, dado que `GymResults` já busca dados assincronamente atrás de skeleton.

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Por quê (preocupação de domínio) | Critério mensurável |
|---|---|---|
| Usabilidade | O ganho da view em linhas só vale se a alternância for direta e a preferência persistir | Toggle muda a view em 1 clique; preferência sobrevive a reload de página |
| Paridade de conteúdo | `GymRow` precisa expor as mesmas informações e ações que `GymCard`, só que em layout diferente | Nenhum campo/CTA presente no card ausente na linha (disponibilidade, localização, telefone/"Ver detalhes", check-in, edição admin) |
| Manutenibilidade | O padrão de store+cookie já existe no projeto (sidebar); reusá-lo evita divergência de convenção | `gym-view-store.ts`/`gym-view-cookie.ts` seguem a mesma API shape de `sidebar-collapse-store.ts`/`sidebar-collapse-cookie.ts` |

**Consideradas, não priorizadas:** performance (a lista já é paginada e o volume por página é pequeno; trocar de view não implica nova busca de dados).

## Estrutura de Componentes

- **`GymViewStore`** (Zustand) — `apps/frontend/src/lib/ui-state/gym-view-store.ts`. *Mantém `view: "cards" | "rows"` em memória e expõe `toggle()`, `setView(view)`, `hydrate(view)`.* Depende de: nada. Dependido por: `GymResults`, `AcademiasContent` (hidratação), toggle na UI.
- **Cookie de preferência de visualização** — `apps/frontend/src/lib/ui-state/gym-view-cookie.ts`. *Lê/escreve o cookie `gym_view` no cliente (`document.cookie`).* Depende de: nada. Dependido por: `GymViewStore.toggle()`/`setView()` (escrita), `AcademiasContent` (leitura na hidratação).
- **`GymRow`** — `apps/frontend/src/features/gyms/components/gym-row.tsx`. *Renderiza um item de academia em layout horizontal, com paridade total de conteúdo com `GymCard`.* Depende de: `resolveLocation` (extraído), dados de `Gym`. Dependido por: `GymResults` (quando `view === "rows"`).
- **`resolveLocation`** — `apps/frontend/src/features/gyms/lib/resolve-location.ts` (extração de helper hoje privado em `gym-card.tsx`). *Formata a localização de uma academia para exibição.* Depende de: nada. Dependido por: `GymCard`, `GymRow`.
- **Toggle de visualização** — dentro de `AcademiasContent` (`academias/page.tsx`), reusando `SegmentedControl`. *Dispara `GymViewStore.setView()` por clique.* Depende de: `GymViewStore`.
- **`GymResults` (modificado)** — passa a ler `view` do `GymViewStore` e escolher `GymCard` ou `GymRow` por item, trocando `grid` por `flex flex-col` no container quando `view === "rows"`.

## Especificação Visual

**Artefato curado:** mockup renderizado no companion visual desta sessão (`toggle-layout.html`), com as duas opções de toggle e as visualizações em cards e em linhas lado a lado.

**Fonte de design original:** Nenhuma ferramenta externa; layout definido via mockup do companion, ancorado nos tokens reais do projeto (`--v-accent` `#39e58c`, raios `6/8/14/22/9999px`, `Space Grotesk` para display).

**Decisões visuais (norte, não pixel-final):**
- Toggle: segmented control com dois botões ícone-apenas (`LayoutGrid` ativo por padrão, `List` para linhas), reusando o componente `SegmentedControl` existente (não o layout quadrado 34×34px exato do mockup — ver D1 abaixo).
- Linha (`GymRow`): thumbnail pequena à esquerda, nome + localização ao centro, CTA de check-in à direita — mesma hierarquia de conteúdo do `GymCard`, sem a imagem grande de topo nem o hover/scale spring do card.
- Visualização em linhas usa lista vertical com borda entre itens, mesmo raio de borda externo do grid de cards.

**Fidelidade:** o mockup é um *norte*; a fidelidade final do toggle será construída na task de implementação, ajustando padding/border-radius do `SegmentedControl` reusado para se aproximar do visual quadrado do mockup sem criar um componente novo.

## Decisões Arquiteturais

### D1. Reusar `SegmentedControl` genérico em vez de criar um toggle bespoke

- **Contexto:** O mockup aprovado ("Opção A") mostra dois botões quadrados 34×34px ícone-apenas; o `SegmentedControl` existente no design system usa botões em formato de pílula com padding de texto.
- **Decisão:** Reusar `SegmentedControl`, ampliando o tipo de `label` de `string` para `ReactNode` (mudança aditiva) para aceitar ícones no lugar de texto.
- **Justificativa técnica:** Evita duplicar lógica de seleção/estado ativo já resolvida pelo componente existente; a mudança de tipo não quebra nenhum uso atual.
- **Justificativa de negócio:** Menor superfície de código novo e maior consistência com o design system para um controle de uso pontual.
- **Trade-offs aceitos:** Pequena divergência visual do mockup (pílula vs. quadrado) — aceita explicitamente pelo usuário nesta sessão.

### D2. Hidratação client-only do cookie em vez de split server/client de `page.tsx`

- **Contexto:** O padrão de hidratação sem flicker usado no toggle de sidebar depende de um Server Component ancestral (`(authenticated)/layout.tsx`) lendo o cookie via `next/headers`. `academias/page.tsx` é inteiramente `"use client"`, sem boundary de servidor próprio; `(authenticated)/layout.tsx` envolve todas as rotas autenticadas, então ler o cookie `gym_view` ali vazaria estado específico desta feature para um layout compartilhado.
- **Decisão:** `AcademiasContent` lê `document.cookie` num `useEffect`/ref-guard ao montar (mesmo padrão de hidratação síncrona-por-ref do `AuthenticatedShell`, mas no cliente) e chama `store.hydrate(view)`.
- **Justificativa técnica:** Evita reestruturar `page.tsx` num split server/client fora do escopo desta feature (moveria `useSearchParams`, o `Suspense` boundary etc. para um componente filho).
- **Justificativa de negócio:** Menor custo de implementação para um ganho de UX marginal, já que o conteúdo de `GymResults` é buscado assincronamente atrás de skeleton independente da view escolhida.
- **Trade-offs aceitos:** Possível flash de 1 frame na view padrão (`cards`) antes da preferência salva ser aplicada — aceito explicitamente pelo usuário nesta sessão, dado o baixo impacto.

## Fluxo de Dados

1. `AcademiasContent` monta → `useEffect`/ref-guard lê o cookie `gym_view` → `GymViewStore.hydrate(view)`.
2. Usuário clica no toggle → `GymViewStore.setView(newView)` → escreve o cookie (`writeGymViewCookie`) e atualiza o estado em memória.
3. `GymResults` lê `view` do store (reativo) e, para cada item de `gyms`, renderiza `GymCard` ou `GymRow`; o container alterna `grid` ↔ `flex flex-col`.
4. Nenhum novo fetch de dados é disparado pela troca de view — `gyms` já está carregado via TanStack Query, independente da visualização.

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| Flash de 1 frame na view padrão antes da hidratação client-only | 1 | 2 | 2 🟢 | Aceito explicitamente pelo usuário; baixo impacto por `GymResults` já estar atrás de skeleton |
| Divergência de conteúdo entre `GymCard` e `GymRow` (paridade quebrada silenciosamente) | 2 | 2 | 4 🟡 | Extrair `resolveLocation` para uso compartilhado; teste de componente cobrindo os mesmos campos em ambos |
| Regressão visual no `SegmentedControl` ao ampliar `label` para `ReactNode` | 1 | 1 | 1 🟢 | Mudança aditiva; usos existentes continuam passando `string` |

## Tratamento de Erros / Edge Cases

- Cookie ausente/inválido → tratado como `cards` (default seguro, mesma convenção do cookie de sidebar).
- Toggle clicado antes da hidratação concluir (raro, mesmo tick) → `setView` sobrescreve qualquer valor pendente da hidratação, refletindo a última intenção do usuário.
- Lista vazia (nenhuma academia encontrada) → o estado vazio existente de `GymResults` é agnóstico à view; nenhum ajuste necessário.

## Testes

- **Unitários (Vitest + Testing Library, PT-BR, `test()`):**
  - `gym-view-store.ts`: `toggle` alterna entre `cards`/`rows`; `setView` define explicitamente; `hydrate` só aplica na primeira chamada.
  - `gym-view-cookie.ts`: escrita serializa a view; leitura interpreta ausência/valor inválido como `cards`.
  - `gym-row.tsx`: renderiza os mesmos campos que `gym-card.test.tsx` cobre hoje (disponibilidade, telefone/"Ver detalhes", pill de check-in, link de edição condicional para admin).
  - `gym-results.tsx`: alterna entre `GymCard`/`GymRow` conforme o valor do store.
- **Manual:** clicar no toggle em `/academias` alterna a visualização e persiste após reload de página (verifica o cookie).

## Definição de Pronto

- `pnpm --filter frontend lint:fix`, `tsc:check`, `test`, `build` — 100% de aprovação.
- Paridade de conteúdo entre `GymCard` e `GymRow` verificada visualmente no navegador (golden path: alternar toggle, navegar para detalhe de uma academia a partir da linha).
- Preferência de view persiste após reload de página.
