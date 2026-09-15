---
created_at: "2026-09-15T19:27:45-03:00"
updated_at: "2026-09-15T19:27:45-03:00"
---

# Design: Modernização do layout de usuários

## Visão Geral

Modernizar a rota autenticada de usuários mantendo os contratos de dados, as mutations e
as regras de autorização existentes. A direção aprovada é um layout master-detail: lista
persistente à esquerda, painel de detalhe à direita no desktop e drawer reutilizando o
mesmo conteúdo em telas menores.

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Por quê | Critério mensurável |
|---|---|---|
| Usabilidade | Admin precisa localizar e inspecionar usuários sem trocar de contexto | Busca, seleção e abertura do detalhe ocorrem sem navegação de página |
| Acessibilidade | A tela possui lista, filtros, estados e ações administrativas | Fluxo completo operável por teclado, com foco visível e anúncio de contagem |
| Responsividade | O mesmo fluxo precisa funcionar em desktop, tablet e mobile | Split-view em desktop e detalhe navegável como drawer em viewport menor |

**Consideradas, não priorizadas:** alteração de domínio, novos filtros de negócio, ações em
massa e edição inline permanecem fora de escopo.

## Arquitetura e Fluxo

O fluxo continua usando `useUsers`, `useUserStats` e as mutations existentes do módulo
admin. `UserFilterBar` atualiza o filtro e a busca server-side com debounce, resetando a
paginação. A seleção de um `UserRow` atualiza o usuário exibido em
`UserDetailContainer`. No mobile, `MobileUserDetailDrawer` apresenta o mesmo conteúdo do
painel desktop e preserva o usuário selecionado ao fechar e reabrir.

## Estrutura de Componentes

- **PageHeader:** título, contagem e ação primária da página.
- **UserFilterBar:** segmented control semântico para filtros da mesma lista, busca e
  filtros adicionais.
- **UserListPanel:** lista, seleção, navegação por teclado, loading, empty state e paginação.
- **UserDetailContainer:** cabeçalho do usuário, ação de edição, menu secundário e abas de
  visão geral, atividade e permissões.
- **MobileUserDetailDrawer:** apresentação responsiva do detalhe, sem duplicar regras ou
  conteúdo.

Nenhum componente novo deve assumir autorização: visibilidade no frontend continua sendo
uma conveniência; o backend permanece a autoridade para ações permitidas.

## Especificação Visual

**Artefato curado:** `mockups/user-management-layout-visual.md`.

**Fonte de design original:** Nenhuma; layout definido com o mockup do companion.

**Decisões visuais:**

- Split desktop com lista em aproximadamente 40% e detalhe em 60%.
- Painel de detalhe `sticky`, com rolagem independente e altura limitada ao viewport.
- Tipos de usuário tratados como segmented control, pois filtram a mesma lista; não usar
  semântica de tabs para esse controle.
- Detalhe com abas internas para `Visão geral`, `Atividade` e `Permissões`.
- Tokens visuais alinhados ao tema existente: fundo escuro, superfície elevada, bordas
  discretas, destaque verde para seleção/status e radius médio/grande.
- Em mobile, lista ocupa a tela e o detalhe abre como drawer ou página de detalhe.

O mockup é um norte visual, não uma especificação pixel-final.

## Decisões Arquiteturais

### D1. Split-view persistente no desktop

- **Contexto:** lista e detalhe precisam ser consultados em sequência, com pouco contexto
  perdido.
- **Decisão:** manter os dois painéis visíveis a partir do breakpoint desktop, com relação
  aproximada 40/60.
- **Justificativa técnica:** reutiliza o grid existente e mantém a seleção fora da
  navegação de página.
- **Justificativa de negócio:** reduz o tempo para revisar vários usuários.
- **Trade-offs aceitos:** em larguras intermediárias o detalhe pode ocupar pouco espaço;
  nesses casos, usar drawer em vez de comprimir o conteúdo.

### D2. Segmented control para tipos de usuário

- **Contexto:** os tipos alteram o filtro da mesma lista, não trocam o contexto inteiro.
- **Decisão:** usar controle segmentado com uma opção ativa e contadores.
- **Justificativa técnica:** semântica e interação correspondem a filtro de estado.
- **Justificativa de negócio:** torna a segmentação rápida e compreensível.
- **Trade-offs aceitos:** filtros avançados continuam em popover/sheet para não poluir o
  topo.

### D3. Conteúdo de detalhe compartilhado entre desktop e mobile

- **Contexto:** painel lateral e drawer não devem divergir em dados ou ações.
- **Decisão:** compor uma única responsabilidade de conteúdo dentro de duas apresentações.
- **Justificativa técnica:** reduz duplicação e mantém os mesmos estados de carregamento,
  erro e autorização.
- **Justificativa de negócio:** evita inconsistência entre plataformas.
- **Trade-offs aceitos:** algumas regras de foco e fechamento precisam ser adaptadas à
  apresentação.

## Riscos

| Risco | Impacto | Probabilidade | Score | Mitigação |
|---|---:|---:|---:|---|
| Painel comprimido em tablet | 2 | 2 | 4 | Ativar drawer abaixo do breakpoint definido e testar 768px/1024px |
| Perda de foco ao abrir ou fechar drawer | 2 | 2 | 4 | Testar foco inicial, retorno ao `UserRow` e navegação por teclado |
| Contagem de resultados não anunciada | 2 | 2 | 4 | Usar região `aria-live` e teste de acessibilidade |
| Divergência entre detalhe desktop e mobile | 2 | 1 | 2 | Reutilizar o mesmo conteúdo e cobrir ambos os presenters |

## Testes

Os testes existentes do frontend devem continuar usando Vitest com MSW para dados e
Playwright para fluxos E2E. Cobrir:

- seleção de usuário e persistência do detalhe;
- filtros, busca com debounce e reset da paginação;
- navegação por teclado e foco visível;
- drawer mobile abrindo, fechando e devolvendo foco;
- estados loading, erro, vazio e contagem anunciada;
- manutenção das permissões e ações destrutivas já existentes.

## Fora de Escopo

Não alterar endpoints, modelo de usuário, matriz de autorização, ações em massa, edição
inline, novos filtros de negócio ou a estratégia de cache do TanStack Query.
