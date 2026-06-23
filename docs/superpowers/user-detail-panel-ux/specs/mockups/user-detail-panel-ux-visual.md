---
created_at: "2026-06-23T10:32:47-03:00"
updated_at: "2026-06-23T10:32:47-03:00"
---

# Especificação Visual — Redesign UX do Painel de Detalhes

## Fonte de design

Screenshot fornecida pelo usuário mostrando o painel atual com espaço vazio (marcado em vermelho) abaixo dos botões de ação. Mockups interativos gerados no visual companion durante brainstorming.

## Decisões visuais aprovadas

### 1. Layout sticky do painel

O wrapper desktop de `UserDetailContainer` passa de crescimento irrestrito para painel sticky com altura limitada ao viewport:

```tsx
// Antes
<div className="rounded-lg border border-border bg-card p-5">

// Depois
<div className="rounded-lg border border-border bg-card p-5
                md:self-start md:sticky md:top-4 md:max-h-[calc(100vh-2rem)] md:overflow-y-auto">
```

- `md:self-start` — desativa o stretch automático do CSS Grid (causa raiz do espaço vazio)
- `md:sticky md:top-4` — painel fica preso 1rem abaixo do topo do viewport enquanto a lista rola
- `md:max-h-[calc(100vh-2rem)]` — garante que nunca ultrapasse o viewport
- `md:overflow-y-auto` — conteúdo interno rola se necessário
- Prefixo `md:` — mobile continua renderizando via `Dialog`, sem interferência

### 2. Footer de ações — layout

```
┌────────────────────────────────────────────────────┐
│ [Editar dados ▊] [Mais ações ▼]                   │  ← canEdit = true
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ [Mais ações ▼]                                     │  ← canEdit = false
└────────────────────────────────────────────────────┘
```

- `Editar dados`: `bg-accent (#39e58c)`, `text-accent-foreground (#0a0a0a)`, `h-11 rounded-md px-4 font-semibold`
- `Mais ações ▼`: `variant="outline"`, ícone `ChevronDown` (lucide-react), `h-11 rounded-md px-4 font-semibold`

### 3. `MoreActionsMenu` — hierarquia visual do dropdown

```
┌──────────────────────┐
│  Tornar Admin        │  ← cor: foreground (neutra)
│  ──────────────────  │  ← DropdownMenuSeparator
│  ⚠ Inativar          │  ← cor: text-warning (#ffb443)
│  ──────────────────  │  ← DropdownMenuSeparator
│  🗑 Excluir           │  ← cor: text-destructive (#ff5a4d)
└──────────────────────┘

Variante "Ativar" (user inativo):
┌──────────────────────┐
│  Remover Admin       │  ← cor: foreground (neutra)
│  ──────────────────  │
│  ✓ Ativar            │  ← cor: text-success (#2fcf80)
│  ──────────────────  │
│  🗑 Excluir           │  ← cor: text-destructive (#ff5a4d)
└──────────────────────┘
```

### 4. Tokens de design aplicados

| Token | Valor (dark mode) | Uso |
|---|---|---|
| `--color-accent` | `#39e58c` | Background do botão "Editar dados" |
| `--color-accent-fg` | `#0a0a0a` | Texto do botão "Editar dados" |
| `--color-warning` | `#ffb443` | Cor do item "Inativar" no dropdown |
| `--color-success` | `#2fcf80` | Cor do item "Ativar"/"Desbloquear" |
| `--color-destructive` | `#ff5a4d` | Cor do item "Excluir" |
| `--color-border` | `#2a2a2a` | Border do botão outline e separador do footer |
| `--radius-xs` | `6px` | Border-radius dos itens internos do dropdown |
| `--radius-sm` | `8px` | Border-radius do `DropdownMenuContent` |

## Notas de implementação

- `DropdownMenuSeparator` entre grupos de risco diferente; omitir separador quando o grupo acima ou abaixo não tem itens visíveis (evitar separadores duplos ou no início/fim).
- `DropdownMenuContent align="start"` — alinha a borda esquerda do menu com o trigger.
- Itens do dropdown usam `className` para cor (e.g. `className="text-warning focus:text-warning"`) — não `variant` (DropdownMenuItem não tem variantes de cor).
- O `AlertDialog` abre após fechar o dropdown (comportamento nativo do Radix quando o trigger dispara o `onSelect` do item).
