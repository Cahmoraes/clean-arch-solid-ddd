---
created_at: "2026-09-16T14:45:12-03:00"
updated_at: "2026-09-16T14:45:12-03:00"
---

# Mockup — Admin Users: badges, seleção e transição do sidebar

Curado a partir do preview visual interativo aprovado nesta sessão de brainstorming
(`.superpowers/brainstorm/2659264-1789579994/`). Direção (*norte*), não pixel-final.

## Fonte de design original

Nenhuma; layout definido apenas via mockup do companion, a partir de screenshots do app
real anexados pelo usuário (estado atual do problema).

## 1. Badges Membro/Status → faixa lateral de status

**Decisão aprovada:** o badge de status ("Ativo"/"Inativo"/"Bloqueado") deixa de ser um
segundo pill textual ao lado do badge de papel ("Membro"/"Administrador"). Vira uma faixa
colorida de 3px na borda esquerda do card (`border-left`), na cor de tom do status (verde
`success`/âmbar `warning`/vermelho `destructive`), preservando um texto acessível
(`aria-label`/texto para leitor de tela) já que a cor deixa de ser textual. O badge de
papel continua como o único pill visível, ganhando o espaço horizontal antes dividido
com o status.

```html
<li class="row" style="border-left: 3px solid var(--color-success)">
  <!-- avatar, nome/email, checkbox -->
  <span class="pill pill-role">Membro</span>
  <!-- StatusBadge textual removido daqui; status agora é só a borda + aria-label -->
</li>
```

Tom da faixa por status: `success` (#2fcf80) = Ativo, `warning` (#ffb443) = pendente/outro,
`destructive` (#ff5a4d) = Bloqueado/Inativo — reaproveita os tokens de tom já existentes em
`status-badge.tsx`, só muda a forma de aplicação (borda em vez de pill).

## 2. Cor de seleção — destaque vs. apenas marcado

**Decisão aprovada:** o item em destaque (aberto no painel de detalhes, `isSelected`)
mantém o verde de accent atual (`bg-accent/40`, `border-accent`). Os itens apenas
marcados no checkbox de seleção em massa (`checked`, sem estar abertos no painel) passam
a usar um **novo token neutro de superfície**, sem matiz de cor — nem o verde do destaque,
nem o índigo do `--color-primary` (achado: `--color-primary` e `--color-accent` são o
mesmo verde `#39e58c` neste tema, por isso reaproveitar "primary" não resolvia o
contraste).

```css
/* globals.css, dentro do bloco @theme (light e dark) */
--color-selected-tint: var(--color-surface-2); /* neutro, sem matiz — mesmo valor nos dois temas */
```

```html
<!-- destaque (aberto no painel) -->
<li class="row" style="background: rgba(57,229,140,.4); border-color: var(--color-accent)">

<!-- apenas marcado (checkbox, sem estar aberto) -->
<li class="row" style="background: var(--color-selected-tint); border-color: var(--color-border-strong)">
```

A faixa lateral de status (item 1) é preservada nas duas variações — a diferenciação de
seleção usa o fundo do card, nunca a borda esquerda, para não colidir com o significado de
status.

## 3. Contraste do e-mail sobre o destaque verde

**Decisão aprovada:** o texto do e-mail (`font-mono`, hoje `text-subtle` /
`--color-subtle` #6f6f68) sobe para `--color-muted-foreground` (#a3a39c/dark,
token já existente) **apenas quando o card está no estado de destaque**
(`isSelected`, fundo `bg-accent/40`). Nos demais estados (normal, apenas marcado) o
e-mail continua em `--color-subtle`, que já tem contraste suficiente contra o fundo
neutro.

## 4. Transição do sidebar de detalhes

**Decisão aprovada:**

- **Painel fixo do split-view (desktop, ≥1024px, `DesktopView`):** hoje monta/desmonta por
  render condicional puro, sem nenhuma classe de transição. Passa a animar com
  `opacity` + `transform: translateY(8px) scale(.98) → translateY(0) scale(1)`,
  **300ms, `ease-in-out`** — a mesma duração já usada pelo `Sheet` mobile, para manter a
  sensação consistente entre breakpoints. Não anima largura/layout (evita reflow); só
  `opacity`/`transform`, compositável por GPU.
- **Sheet mobile (`MobileView`, <1024px):** já usa `animate-in`/`animate-out` do Radix
  (fade + `slide-in-from-right`, 300ms abrindo / 500ms fechando) — confirmado no preview
  ao vivo que a transição já existe e já é adequada; **nenhuma mudança necessária aqui**,
  só a verificação de que o comportamento atual permanece.

```css
/* wrapper reutilizável do painel fixo (ex.: animated-panel.tsx) */
.panel-enter {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
  transition: opacity 300ms ease-in-out, transform 300ms ease-in-out;
}
.panel-enter.open {
  opacity: 1;
  transform: translateY(0) scale(1);
}
```

## Fidelidade

Este artefato é um *norte* de layout, cor e timing — não o pixel final. A implementação
deve usar os tokens reais do tema (`globals.css`) e os componentes já existentes
(`RoleBadge`, `StatusBadge`, `Checkbox`, `Sheet`) em vez de recriar marcação a partir do
HTML de exemplo acima, que serve só para comunicar a intenção visual.
