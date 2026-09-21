# Notification delete: item do bell (norte visual)

Artefato curado do mockup aprovado (opção B). É um norte, não o pixel final.

**Fonte de design original:** nenhuma; layout definido via mockup do companion, com tokens reais do app (`apps/frontend/src/app/globals.css`, sistema "VOLT", shadcn new-york, Tailwind v4).

## Intenção de design

- O item do bell mantém o layout atual. O botão de excluir aparece apenas no hover ou foco da linha e ocupa o lugar da hora (`tm`), que fica invisível enquanto o botão está visível.
- Em dispositivos sem hover (`@media (hover: none)`) o botão fica sempre visível.
- O ponto de não lida permanece na extremidade direita da coluna principal.
- O botão não é filho do botão principal da linha (que marca como lida): o `<li>` vira um contêiner flex com dois botões irmãos.
- Linhas lidas usam `opacity-60` apenas no botão principal; o botão de excluir fica fora da atenuação.

## Estados do botão de excluir

| Estado | Aparência |
|---|---|
| Repouso (oculto) | `opacity-0`, sem foco de teclado perdido: aparece com `focus-within` e `focus-visible` |
| Visível | 32px (`h-8 w-8`), `rounded-md` (14px), ícone `Trash2` 16px, `text-muted-foreground`, fundo `card`, borda `border` |
| Hover do botão | `bg-destructive-soft text-destructive` (padrão de `check-in-actions.tsx`) |
| Foco | duplo anel global (`focus-ring-duplo`) |

Posição: `absolute right-3 top-2` dentro do `<li>` (`relative`), sobre o espaço da hora.

## Core HTML (referência de estrutura)

```html
<li class="relative flex items-start gap-3 border-b border-border px-4 py-3 last:border-b-0 group">
  <button type="button" class="flex flex-1 items-start gap-3 text-left" /* marca como lida */>
    <div class="h-10 w-10 rounded-full bg-success-soft text-success flex items-center justify-center">
      <!-- ícone por tipo (lucide, h-4 w-4) -->
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex justify-between gap-3">
        <span class="line-clamp-1 text-sm font-semibold text-foreground">Título</span>
        <span class="text-xs text-muted-foreground group-hover:invisible group-focus-within:invisible">5m atrás</span>
      </div>
      <p class="mt-1 text-sm text-muted-foreground">Mensagem</p>
    </div>
    <span class="mt-1 h-2.5 w-2.5 rounded-full bg-accent"></span> <!-- só não lida -->
  </button>
  <button type="button" aria-label="Excluir notificação"
          class="absolute right-3 top-2 h-8 w-8 rounded-md border border-border bg-card text-muted-foreground
                 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100
                 hover:bg-destructive-soft hover:text-destructive [@media(hover:none)]:opacity-100">
    <!-- Trash2 h-4 w-4 -->
  </button>
</li>
```

## Tokens aplicados (tema escuro padrão, claro alternativo)

| Token | Escuro | Claro |
|---|---|---|
| card | `#161616` | `#ffffff` |
| surface-2 | `#1d1d1d` | `#f7f7f3` |
| border | `#2a2a2a` | `#e4e4dc` |
| muted-foreground | `#a3a39c` | `#57574f` |
| foreground | `#f6f6f4` | `#111110` |
| accent / primary | `#39e58c` | `#39e58c` |
| destructive | `#ff5a4d` | `#ff5a4d` |
| destructive-soft | `rgba(255,90,77,.14)` | `rgba(255,90,77,.14)` |
| success-soft | `rgba(47,207,128,.14)` | `rgba(47,207,128,.14)` |
| warning-soft | `rgba(255,180,67,.16)` | `rgba(255,180,67,.16)` |

Raio: botões `rounded-md` (14px), dropdown `rounded-xl` (22px). Fonte Inter 15px. Ícones `lucide-react`.

## Fidelidade

O mockup é um norte. A fidelidade final é construída na task de implementação, contra os componentes reais (`notification-item.tsx`, `ui/button.tsx`).
