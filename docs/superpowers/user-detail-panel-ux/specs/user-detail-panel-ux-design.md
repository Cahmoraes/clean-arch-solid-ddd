---
created_at: "2026-06-23T10:32:47-03:00"
updated_at: "2026-06-23T10:32:47-03:00"
---

# Design Spec — Redesign UX do Painel de Detalhes do Usuário

## Visão Geral

O painel de detalhes do usuário (`UserDetailContainer`) hoje cresce verticalmente para corresponder à altura da lista de usuários à esquerda, deixando um espaço vazio expressivo quando há poucos itens na lista. Além disso, os quatro botões de ação (`Editar dados`, `Inativar`, `Tornar Admin`, `Excluir`) ficam todos expostos na mesma linha sem hierarquia de risco visual.

Este spec define duas melhorias coordenadas:

1. **Layout sticky com altura limitada** — o painel deixa de esticar com a lista e passa a ficar preso no viewport (sticky), com altura máxima controlada pelo viewport, enquanto a lista rola independentemente.
2. **`MoreActionsMenu` — dropdown contextual** — a ação primária `Editar dados` permanece exposta; as demais ações são movidas para um `DropdownMenu` shadcn com hierarquia visual de risco (neutro → warning → destructive).

Escopo: apenas `apps/frontend`. Nenhuma mudança no backend.

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Por quê (preocupação de domínio) | Critério mensurável |
|---|---|---|
| Usabilidade | Admin trabalha com a lista e o painel simultaneamente; painel sumindo da tela interrompe o fluxo | Painel visível no viewport em qualquer tamanho de lista (≥ 1 item selecionado, breakpoint `md`+); Inativar e Excluir disparam `AlertDialog` antes de executar |
| Segurança de uso | Ações irreversíveis (Excluir) e de alto impacto (Inativar, Tornar/Remover Admin) adjacentes a ações seguras aumentam risco de clique acidental | Zero ações contextualmente perigosas executam sem confirmação no `AlertDialog` |
| Manutenibilidade | `UserActionsFooter` acumula lógica de visibilidade, risco e layout — difícil de testar e estender | `MoreActionsMenu` testável em isolamento; `UserActionsFooter` reduzido a shell de layout sem lógica de risco |

**Consideradas, não priorizadas:** performance (mudanças CSS puras, sem impacto), escalabilidade (volume de usuários não afeta layout CSS).

## Especificação Visual

**Artefato curado:** [`mockups/user-detail-panel-ux-visual.md`](mockups/user-detail-panel-ux-visual.md)

**Fonte de design original:** Screenshot fornecida pelo usuário mostrando o painel com região de espaço vazio marcada em vermelho; mockups gerados no visual companion durante o brainstorming.

**Decisões visuais (norte, não pixel-final):**
- Painel direito: `self-start sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto` no wrapper desktop de `UserDetailContainer`
- Footer: `[Editar dados (btn-accent fill)]` + `[Mais ações ▼ (btn-outline)]` em linha única
- Dropdown: Tornar/Remover Admin (cor neutra) → `DropdownMenuSeparator` → Inativar/Ativar (warning `#ffb443` / success `#2fcf80`) → `DropdownMenuSeparator` → Excluir (destructive `#ff5a4d`)
- Tokens aplicados: `--color-accent #39e58c`, `--color-warning #ffb443`, `--color-destructive #ff5a4d`, `--radius-xs 6px`
- Mobile: sem mudança — `UserDetailContainer` já renderiza `Dialog` em `< md`; sticky e max-height ficam condicionados ao breakpoint `md:` via Tailwind

**Fidelidade:** o mockup é um norte. A fidelidade final é construída na implementação usando os tokens do `globals.css` (Tailwind v4 `@theme`).

## Estrutura de Componentes

### Alterações em componentes existentes

**`UserDetailContainer`** (`features/admin/components/user-detail/user-detail-container.tsx`)
- Wrapper desktop recebe `self-start sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto`
- Breakpoint: classes prefixadas com `md:` para não afetar o comportamento mobile (Dialog)
- Nenhuma mudança de props ou lógica

**`UserActionsFooter`** (`features/admin/components/user-detail/user-actions-footer.tsx`)
- Remove a construção de `buildContextualActions()` (ou a mantém apenas para delegar ao `MoreActionsMenu`)
- Layout simplificado: `flex items-center gap-2 border-t border-border pt-4`
- Renderiza: `{canEdit && <Button>Editar dados</Button>}` + `<MoreActionsMenu />`

### Novo componente

**`MoreActionsMenu`** (`features/admin/components/user-detail/more-actions-menu.tsx`)

Responsabilidade: renderizar o `DropdownMenu` com os itens contextuais de ação do usuário, respeitando permissões e estado atual.

Props:
```ts
interface MoreActionsMenuProps {
  permissions: UserDetailPermissions
  flags: ActionFlags
  onActivate: () => void
  onOpenSuspend: () => void
  onOpenPromote: () => void
  onOpenDemote: () => void
  onOpenDelete: () => void
}
```

Lógica de itens (contextual por estado do usuário):

| Item | Visível quando | Cor | Ação |
|---|---|---|---|
| Tornar Admin | `permissions.canPromote` | neutra | `onOpenPromote` → `AlertDialog` |
| Remover Admin | `permissions.canDemote` | neutra | `onOpenDemote` → `AlertDialog` |
| ─── | Sempre | — | `DropdownMenuSeparator` |
| Inativar | `permissions.canSuspend` | `text-warning` | `onOpenSuspend` → `AlertDialog` |
| Ativar | `permissions.canActivate` | `text-success` | `onActivate` (direto, sem dialog — ação reversa de baixo risco) |
| Desbloquear | `permissions.isLocked` | `text-success` | `onActivate` (direto) |
| ─── | Sempre | — | `DropdownMenuSeparator` |
| Excluir | `permissions.canDelete` | `text-destructive` | `onOpenDelete` → `AlertDialog` |

`DropdownMenuSeparator` entre grupos de risco diferente; separadores omitidos quando o grupo acima ou abaixo não tem itens visíveis.

## Decisões Arquiteturais

### D1. `position: sticky` em vez de `position: fixed` para o painel

- **Contexto:** Painel precisa permanecer visível enquanto a lista rola. Alternativas: `sticky` (fluxo natural), `fixed` (removido do fluxo), `max-height` puro (sem sticky).
- **Decisão:** `position: sticky` com `align-self: start` e `max-height: calc(100vh-2rem)`.
- **Justificativa técnica:** `fixed` exige cálculos manuais de largura e `z-index` gerenciado; `sticky` respeita o CSS Grid e não quebra o layout. `max-height` puro resolve o espaço vazio mas o painel sai do viewport ao rolar listas longas — pior UX.
- **Justificativa de negócio:** Admins navegam a lista enquanto consultam/editam o painel — painel sempre visível reduz cliques e contexto switching.
- **Trade-offs aceitos:** `sticky` é silenciosamente cancelado por qualquer ancestral com `overflow: hidden` — requer verificação durante implementação; se confirmado, fallback é `max-height` com `overflow-y: auto` sem sticky.

### D2. `MoreActionsMenu` como componente separado em vez de inline em `UserActionsFooter`

- **Contexto:** O dropdown poderia ser inlinado diretamente dentro de `UserActionsFooter`, evitando um arquivo extra.
- **Decisão:** Extrair como `MoreActionsMenu` independente.
- **Justificativa técnica:** Separação de responsabilidades — `UserActionsFooter` é layout puro; `MoreActionsMenu` encapsula toda a lógica de visibilidade de itens e hierarquia de risco. Testável em isolamento sem montar o footer inteiro.
- **Justificativa de negócio:** Facilita adicionar novas ações futuras sem tocar no layout do footer.
- **Trade-offs aceitos:** Um arquivo adicional; props drilling dos callbacks de `UserActionsFooter` → `MoreActionsMenu` (baixo impacto: tipos já definidos em `UserActionsFooterProps`).

### D3. `Ativar`/`Desbloquear` sem `AlertDialog`

- **Contexto:** Todas as ações contextualmente sensíveis têm `AlertDialog`. `Ativar` e `Desbloquear` são reversões de estado — ações de "desfazer" uma suspensão/lock.
- **Decisão:** `onActivate` é chamado diretamente, sem dialog de confirmação.
- **Justificativa:** Ação reversível, de baixo risco, com impacto positivo (re-habilita acesso). Adicionar dialog seria "modal fatigue" para ação corretiva.
- **Trade-offs aceitos:** Nenhum step extra de proteção, mas a ação é facilmente revertida via `Inativar`.

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| `sticky` cancelado por `overflow: hidden` em ancestral desconhecido | 2 | 2 | 4 🟡 | Verificar árvore completa com DevTools (Computed → overflow) antes de implementar; fallback documentado: remover `sticky`, manter apenas `max-height` + `self-start` |
| `DropdownMenu` fecha ao abrir `AlertDialog` (portais conflitantes Radix) | 2 | 1 | 2 🟢 | shadcn DropdownMenu e AlertDialog são ambos portais Radix — comportamento testado e compatível; chamar `onOpenDelete` fecha o dropdown antes de montar o dialog |
| Props drilling excessivo (`UserActionsFooter` → `MoreActionsMenu`) | 1 | 1 | 1 🟢 | Todos os callbacks já tipados em `UserActionsFooterProps`; reuso direto sem novas interfaces |

## Testes

### Unitários (`*.test.tsx`)

**`MoreActionsMenu`:**
- Renderiza "Tornar Admin" quando `canPromote = true`, omite quando `false`
- Renderiza "Remover Admin" quando `canDemote = true`
- Renderiza "Inativar" em `text-warning` quando `canSuspend = true`
- Renderiza "Ativar" em `text-success` quando `canActivate = true`
- Chama `onActivate` diretamente (sem dialog intermediário)
- Chama `onOpenDelete` ao clicar em "Excluir" (não executa deleção diretamente)
- `DropdownMenuSeparator` omitido quando grupo acima/abaixo está vazio

**`UserActionsFooter`:**
- Renderiza `MoreActionsMenu` em todos os casos
- Renderiza "Editar dados" apenas quando `canEdit = true`
- Passa todos os callbacks corretos para `MoreActionsMenu`

### Integração visual

- `UserDetailContainer` com `sticky` visível no viewport após rolar lista com 20+ itens (Playwright)
- Dropdown abre e fecha sem erros de portal ao clicar fora e ao selecionar item

### Regressão

- Comportamento mobile inalterado: `UserDetailContainer` continua renderizando `Dialog` em `< md`
- `AlertDialog` de suspensão, promoção e exclusão continua abrindo corretamente a partir do `MoreActionsMenu`
