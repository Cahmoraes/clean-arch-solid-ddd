---
created_at: "2026-05-30T20:45:14-03:00"
updated_at: "2026-05-30T20:45:14-03:00"
---

# Design Spec — Painel de Detalhes do Usuário (Admin)

## Contexto

A página de administração de usuários (`apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`)
hoje lista usuários em linhas (`UserRow`) com filtros (`UserFilterBar`) e estatísticas (`UserStats`).
Ao clicar em um usuário, queremos exibir seus detalhes completos e oferecer as ações administrativas.

Esta spec define o **Layout C — Split-View Inline** como a forma de exibir esses detalhes, com um
fallback de `Dialog` (bottom-sheet) em telas pequenas.

## Objetivo

Permitir que um administrador, a partir da lista de usuários, visualize os detalhes completos de um
usuário e execute ações administrativas (editar, suspender/reativar, promover/revogar admin, excluir)
sem perder o contexto da lista, com navegação fluida entre usuários no desktop.

## Decisão de Layout

**Split-View Inline** (escolhido entre Dialog Centralizado, Sheet Lateral e Split-View):

- **Desktop (≥ 768px):** a página divide-se em duas colunas dentro do mesmo card:
  - **Coluna esquerda (~36%, mín. 220px):** a lista de usuários (linhas com avatar, nome, email, badge
    de role/status). A linha ativa recebe destaque (fundo indigo + borda esquerda).
  - **Coluna direita (~64%):** o painel de detalhes do usuário selecionado, com header fixo, tabs e
    rodapé de ações.
  - Não há overlay. Clicar em outra linha troca o conteúdo do painel — navegação direta entre usuários.

- **Mobile / tablet (< 768px):** o split-view é desmontado. A lista ocupa 100% da largura. Clicar em uma
  linha abre um **`Dialog` bottom-sheet** (ancorado na base da tela) com exatamente o mesmo conteúdo
  (header, tabs, ações). Fecha por swipe, botão "✕" ou backdrop.

**Breakpoint:** `md` (768px), seguindo a convenção Tailwind já usada no projeto.

## Componentes

### `UserDetailPanel` (componente compartilhado — coração da feature)

Componente puro que recebe um `AdminUser` e renderiza header + tabs + ações. **Não conhece** se está
dentro de um split-view (desktop) ou de um `Dialog` (mobile) — essa decisão é do container. Isso garante
zero divergência de conteúdo entre as duas apresentações e uma única fonte de lógica.

Estrutura interna:

- **Header fixo:** avatar (iniciais com fallback), nome, email, badges (status + role), botão primário
  "Editar" e menu "⋯" (ações secundárias).
- **Tabs:** `Detalhes`, `Permissões`, `Atividade`.
- **Rodapé de ações:** Editar dados · Suspender/Reativar · Revogar/Promover Admin · Excluir (destrutivo,
  alinhado à direita).

### Container de apresentação

- **Desktop:** `UserDetailPanel` renderizado diretamente na coluna direita do split-view.
- **Mobile:** `UserDetailPanel` renderizado dentro de um `Dialog` (shadcn). A escolha desktop-vs-mobile
  é feita por um único ponto (hook de media query ou CSS responsivo + renderização condicional),
  evitando duplicação de lógica.

### Ajuste na página de lista

A página `usuarios/page.tsx` passa a gerenciar o estado de "usuário selecionado" e a renderizar o
split-view (desktop) ou a lista + `Dialog` (mobile). A `UserRow` ganha um handler de clique que define
o usuário selecionado.

## Tabs — Conteúdo

### Tab `Detalhes`
- **Informações pessoais:** Nome completo, E-mail.
- **Conta:** User ID (`mono`), Status (badge), Role (badge), Membro desde (data de criação),
  Último acesso.

> Os campos disponíveis hoje no `AdminUser` (via `@repo/api-types`) são: `id`, `name`, `email`,
> `role` (`MEMBER` | `ADMIN`), `status` (`activated` | `suspended` | `locked`), `createdAt`.
> "Último acesso" e o histórico de atividade (tab `Atividade`) dependem de dados ainda não expostos
> pela API — ver **Dependências de Dados** abaixo.

### Tab `Permissões`
- Role atual (Administrador / Membro) com indicação visual.
- Ação rápida de promover/revogar admin, com `AlertDialog` de confirmação.

### Tab `Atividade`
- Histórico de eventos do usuário (login, mudança de role, alteração de senha, criação de conta), com
  data, hora e — quando disponível — IP. Depende de dados de auditoria (ver Dependências de Dados).

## Ações Administrativas

Todas as ações destrutivas/sensíveis usam `AlertDialog` (shadcn) para confirmação antes de executar,
seguindo o padrão já existente no `UserDetailModal` atual.

| Ação | Hook existente | Confirmação |
|------|----------------|-------------|
| Editar dados | formulário de edição (modal/form dedicado) | — |
| Suspender / Reativar | `useSuspendUser` / `useActivateUser` | `AlertDialog` |
| Promover a admin | `usePromoteToAdmin` | `AlertDialog` |
| Revogar admin | `useDemoteFromAdmin` | `AlertDialog` |
| Excluir usuário | hook de exclusão — **depende de endpoint** (ver Dependências de Dados) | `AlertDialog` |

As ações são contextuais ao estado do usuário: por exemplo, "Suspender" aparece para usuários ativos e
"Reativar" para suspensos; "Promover" para membros e "Revogar" para admins.

## Estados Visuais

- **Nenhum usuário selecionado (desktop):** a coluna direita exibe um `EmptyState` ("Selecione um usuário
  para ver os detalhes").
- **Carregando detalhes:** `Skeleton` no painel enquanto dados adicionais são buscados (se houver fetch
  sob demanda além do que já vem na lista).
- **Linha ativa:** destaque visual na lista (fundo indigo + borda esquerda).
- **Ação em andamento:** botão com `aria-busy` durante mutações.

## Dependências de Dados

A spec assume que dois conjuntos de dados podem **ainda não existir** na API atual:

1. **Último acesso (`lastLoginAt`)** — exibido na tab `Detalhes`.
2. **Histórico de atividade/auditoria** — base da tab `Atividade`.
3. **Endpoint de exclusão de usuário** — os hooks atuais (`useActivateUser`, `useSuspendUser`,
   `usePromoteToAdmin`, `useDemoteFromAdmin`) não incluem exclusão. A ação "Excluir" depende de um
   endpoint de DELETE no backend e do hook correspondente.

**Decisão:** estes campos/ações são desejáveis mas não bloqueiam a feature de visualização. Caso a API
não exponha esses dados no momento da implementação, a tab `Atividade` e o campo "Último acesso" exibem
um estado vazio gracioso ("Sem dados de atividade disponíveis") e a ação "Excluir" fica oculta/desabilitada
até o endpoint existir. A definição do escopo exato (incluir backend de auditoria e/ou exclusão, ou
adiá-los) será refinada na PRD.

## Acessibilidade

- Navegação por teclado entre as linhas da lista (desktop) — setas ↑/↓ movem a seleção, atualizando o
  painel.
- O `Dialog` mobile segue o padrão de foco/escape do shadcn (foco preso, fecha com `Esc`).
- Tabs navegáveis por teclado; `aria-selected` no tab ativo.
- Badges de status com texto, não apenas cor.

## Fora de Escopo

- Edição inline de campos diretamente no painel (a edição abre um formulário/modal separado).
- Ações em massa (multi-seleção).
- Implementação do backend de auditoria/atividade — se necessário, será uma feature dependente.
- Exportação de dados do usuário individual.

## Testing

- **Unit (Vitest):** `UserDetailPanel` renderiza corretamente cada tab; ações disparam os hooks certos;
  ações contextuais aparecem conforme `status`/`role`.
- **Responsividade:** verificar que abaixo de `md` o painel renderiza como `Dialog` e acima como coluna.
- **E2E (Playwright):** fluxo de clicar em um usuário → ver detalhes → executar uma ação com confirmação.
- **Confirmação de ações:** `AlertDialog` aparece antes de toda ação destrutiva.

## Referências Visuais

Mockups produzidos durante o brainstorming (visual companion):
- `layout-c-refined.html` — desktop (split-view com tabs e rodapé de ações)
- `layout-c-mobile.html` — mobile (lista em tela cheia + Dialog bottom-sheet)
