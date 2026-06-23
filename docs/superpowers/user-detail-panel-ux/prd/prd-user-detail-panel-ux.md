---
created_at: "2026-06-23T10:40:05-03:00"
updated_at: "2026-06-23T10:40:05-03:00"
---

# PRD: Redesign UX do Painel de Detalhes do Usuário

## Visão Geral

A tela de administração de usuários (`/admin/usuarios`) exibe uma lista de usuários à esquerda e um painel de detalhes à direita. Hoje, o painel de detalhes cresce verticalmente para corresponder à altura da lista, deixando um espaço vazio expressivo que piora a percepção de qualidade da interface. Além disso, os quatro botões de ação (`Editar dados`, `Inativar`, `Tornar Admin`, `Excluir`) estão dispostos sem hierarquia visual de risco, aumentando a chance de cliques acidentais em ações destrutivas.

Este produto define as melhorias de UX que tornam o painel visualmente controlado e as ações administrativas organizadas por nível de risco.

## Objetivos

- Eliminar o espaço vazio no painel de detalhes: painel deve ter altura limitada pelo viewport, sem crescer com a lista
- Manter o painel de detalhes sempre visível enquanto o admin navega pela lista (sticky)
- Reduzir risco de clique acidental em ações destrutivas: ações de alto impacto agrupadas em menu contextual com hierarquia de cor
- Preservar completamente o comportamento mobile existente (Dialog)

## Histórias de Usuário

- **US-01** — Como admin navegando pela lista de usuários, eu quero que o painel de detalhes permaneça visível no viewport enquanto rolo a lista para que eu possa consultar informações e executar ações sem precisar rolar de volta
- **US-02** — Como admin, eu quero que o painel de detalhes tenha uma altura visualmente coerente com o conteúdo exibido para que a tela não mostre um bloco vazio desnecessário abaixo das ações
- **US-03** — Como admin, eu quero acessar as ações de gerenciamento de um usuário em um menu organizado por nível de risco para que eu compreenda o impacto de cada ação antes de executá-la
- **US-04** — Como admin, eu quero que ações reversíveis de impacto (Inativar) e ações irreversíveis (Excluir) estejam visualmente diferenciadas para que eu não as confunda ou execute acidentalmente
- **US-05** — Como super admin, eu quero que o botão "Editar dados" apareça apenas quando tenho permissão de editar o usuário selecionado para que a interface reflita com precisão meus privilégios

## Funcionalidades Principais

### 1. Painel de detalhes sticky com altura controlada

O painel de detalhes (`UserDetailContainer`) deve ser ancorado no viewport durante o scroll da lista no breakpoint desktop.

**Por que importa:** sem essa âncora, o admin precisa rolar a página de volta ao topo para acessar o painel depois de navegar pela lista, interrompendo o fluxo de trabalho.

**Como funciona:** o painel permanece ancorado no viewport (sem sair da tela) enquanto a lista rola independentemente, com uma altura máxima definida pelo tamanho da janela.

Requisitos funcionais:
- **FR-001** — O painel de detalhes deve estar visível no viewport em qualquer posição de scroll da lista, no breakpoint `md`+
- **FR-002** — O painel de detalhes não deve exceder a altura do viewport no breakpoint `md`+
- **FR-003** — O painel de detalhes não deve exibir espaço vazio abaixo da área de ações quando a lista for mais alta que o conteúdo do painel
- **FR-004** — O comportamento mobile (Dialog) não deve ser afetado pelas mudanças de layout

### 2. Menu contextual `MoreActionsMenu` com hierarquia de risco

As ações de gerenciamento do usuário (exceto "Editar dados") são movidas para um dropdown `DropdownMenu` shadcn, com itens organizados por nível de risco e sinalização visual por cor.

**Por que importa:** quatro botões de mesmo peso visual colocam "Excluir" no mesmo nível perceptivo que "Editar dados", aumentando o risco de clique acidental.

**Como funciona:** a ação primária "Editar dados" permanece como botão exposto; as demais ações são agrupadas no dropdown "Mais ações", com separadores entre grupos de risco e cores distintas por nível de impacto.

Requisitos funcionais:
- **FR-005** — A ação "Editar dados" deve ser exibida como botão primário visível apenas quando `canEdit = true` para o usuário selecionado
- **FR-006** — Quando `canEdit = false`, o footer deve exibir apenas o dropdown "Mais ações", sem o botão "Editar dados"
- **FR-007** — O dropdown deve exibir "Tornar Admin" quando o usuário selecionado é `MEMBER`, e "Remover Admin" quando é `ADMIN`
- **FR-008** — O dropdown deve exibir "Inativar" quando o usuário está ativo, "Ativar" quando está inativo, e "Desbloquear" quando está bloqueado
- **FR-009** — O dropdown deve exibir "Excluir" em todos os estados do usuário (quando `canDelete = true`)
- **FR-010** — O item "Inativar" deve ter cor de aviso (warning) para comunicar que é uma ação de impacto porém reversível
- **FR-011** — O item "Ativar" / "Desbloquear" deve ter cor de sucesso para comunicar que é uma ação corretiva de baixo risco
- **FR-012** — O item "Excluir" deve ter cor destrutiva para comunicar que é irreversível
- **FR-013** — Os itens de ação no dropdown devem ser separados por `DropdownMenuSeparator` entre grupos de risco diferente; separadores não devem aparecer quando o grupo adjacente está vazio

### 3. Confirmações de ação

Ações de alto impacto devem exigir confirmação explícita antes de executar.

Requisitos funcionais:
- **FR-014** — As ações "Tornar Admin", "Remover Admin" e "Inativar" devem exibir `AlertDialog` de confirmação antes de executar
- **FR-015** — A ação "Excluir" deve exibir `AlertDialog` de confirmação antes de executar
- **FR-016** — As ações "Ativar" e "Desbloquear" devem executar diretamente, sem `AlertDialog` (ações reversíveis de baixo risco)

## Experiência do Usuário

**Fluxo principal:**
1. Admin seleciona um usuário na lista
2. O painel de detalhes aparece à direita (ou como Dialog em mobile)
3. Ao rolar a lista para ver mais usuários, o painel permanece visível no viewport (sticky)
4. Para ações seguras: admin clica diretamente em "Editar dados" (quando visível)
5. Para demais ações: admin clica em "Mais ações ▼", vê o dropdown com itens coloridos por risco, clica no item desejado
6. Para ações com confirmação: `AlertDialog` solicita confirmação antes de executar
7. Para "Ativar" / "Desbloquear": ação executa diretamente após clique no item

**Considerações visuais** (detalhes em `specs/mockups/user-detail-panel-ux-visual.md`):
- Botão "Editar dados": preenchido com a cor de destaque primária do design system
- Botão "Mais ações ▼": contorno neutro com ícone indicador de dropdown
- Itens de risco: cor de aviso para "Inativar", cor destrutiva para "Excluir", cor de sucesso para "Ativar"/"Desbloquear"

## Restrições Técnicas de Alto Nível

Conforme Características Arquiteturais do design spec:

| Característica | Critério mensurável |
|---|---|
| Usabilidade | Painel visível no viewport em qualquer tamanho de lista (breakpoint `md`+); ações de impacto exibem `AlertDialog` antes de executar |
| Segurança de uso | Zero ações contextualmente perigosas (FR-014, FR-015) executam sem confirmação |
| Manutenibilidade | `MoreActionsMenu` testável em isolamento; `UserActionsFooter` sem lógica de risco inline |

Restrições adicionais:
- Escopo exclusivo `apps/frontend` — sem mudanças de backend ou API
- Apenas comportamento mobile inalterado: `UserDetailContainer` continua renderizando `Dialog` em `< md`
- Stack: React 19, Next.js 16, shadcn/ui (Radix), Tailwind CSS v4

## Fora de Escopo

- Mudanças na lógica de autorização RBAC (já implementada em `UserManagementPolicy`)
- Novos campos no formulário de edição inline (definido em spec separado `admin-edit-user-data`)
- Scroll interno independente por aba (abordagem 3 — descartada em brainstorming)
- Adição de novas ações ao dropdown além das quatro existentes
- Notificações toast por ação (não discutido nesta iteração)
- Keyboard shortcuts para o dropdown
- Tela de detalhes em mobile (Dialog): nenhuma mudança
