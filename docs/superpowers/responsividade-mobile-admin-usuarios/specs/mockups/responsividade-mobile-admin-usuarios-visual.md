# Responsividade Mobile — Usuários (Admin) — Mockup Visual

Artefato curado a partir da sessão de brainstorming (companion visual local). Não é a tela final — é o norte de layout/spacing aprovado.

## Fonte de design original

Nenhuma. Layout definido apenas via mockup do companion visual desta sessão (comparação lado a lado atual vs. proposto, em frame de 414px), a partir de screenshots reais do app enviados pelo usuário.

## Decisões visuais aprovadas

**Header (<560px):**
- A barra de busca completa (`SearchBar`) some abaixo de 560px hoje, sem substituto — decisão: manter escondida, mas adicionar um botão só-ícone (lupa, ~38px, `rounded-md border border-border bg-surface`) no lugar, abrindo o mesmo Command Palette (`onActivate`).
- O `ThemeToggle` (hoje pill `w-16 h-[38px]` com thumb deslizante) ganha uma variante compacta abaixo de 560px: botão redondo (~36px, `rounded-full`, fundo `--color-accent`), ícone único sol/lua, alterna tema em um toque, sem posições esquerda/direita.
- Ambas as trocas (busca e tema) seguem o padrão já usado pelo projeto: duas instâncias do componente alternadas via CSS (`max-[560px]:hidden` / `hidden max-[560px]:flex`), sem hook de media query novo.
- Bell (`NotificationBell`, 38-42px) e `Avatar` (32-36px) mantêm tamanho atual em qualquer largura.

**Modal de usuário (qualquer largura pequena):**
- O `DialogContent` base hoje usa `w-full` sem margem lateral — em telas ≤ ~480px o card encosta nas bordas.
- Decisão: substituir `w-full` por `w-[calc(100%-2rem)]` no componente base (`dialog.tsx`), dando 16px de respiro de cada lado sempre que a viewport for menor que o `max-w-*` de cada consumidor; nenhuma mudança em telas onde `max-w-*` já é o fator limitante.

## Core HTML/CSS de referência (trecho representativo do mockup aprovado)

```html
<!-- Header proposto (<560px) -->
<header class="app-header"><!-- border-b border-border bg-background/80 px-4 -->
  <button class="search-icon-btn"><!-- w-[38px] h-[38px] rounded-md border border-border bg-surface --></button>
  <div class="header-actions"><!-- ml-auto flex items-center gap-2 -->
    <button class="theme-toggle-round"><!-- w-9 h-9 rounded-full bg-accent text-accent-foreground --></button>
    <button class="bell-btn"><!-- existente, sem mudança --></button>
    <div class="avatar-sm"><!-- existente, sem mudança --></div>
  </div>
</header>

<!-- Modal proposto -->
<div class="modal-card margin"><!-- w-[calc(100%-2rem)] mx-auto rounded-xl border border-border bg-card p-6 --></div>
```

## Tokens aplicados (tema escuro, `apps/frontend/src/app/globals.css`)

- `--color-accent: #39e58c` / `--color-accent-foreground: #0a0a0a`
- `--color-surface-2: #1d1d1d` (trilho do toggle completo)
- `--color-border: #2a2a2a`
- `--color-card: #161616`
- `--radius-xl` (dialog/card) / `rounded-full` (avatar, toggle compacto)

## Fidelidade

Norte de layout e spacing, não pixel-final. Tamanhos exatos do botão redondo do tema e do ícone de busca são ajustados na implementação, reaproveitando os componentes reais (`ThemeToggle`, `SearchBar`, `NotificationBell`, `Avatar`) e seus tokens já existentes — o mockup usou aproximações visuais (emojis como placeholder de ícone) apenas para comunicar posição e tamanho relativo.
