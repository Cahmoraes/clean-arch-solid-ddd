# Visual — Theme Toggle Icon Only

Screen único: o `ThemeToggle` no header autenticado (`apps/frontend/src/components/layout/authenticated-shell.tsx`).

## Decisão aprovada

Variante **A — Pill deslizante compacto**, entre 3 opções apresentadas no companion visual (rotação+crossfade e morph+bounce foram descartadas). Escolhida por manter a mecânica de animação já existente no componente (`transition-[left] duration-300`), reduzindo o risco de implementação e mantendo consistência com o padrão visual atual.

## Decisões visuais (norte, não pixel-final)

- Layout: pill único, sem textos "Claro"/"Escuro" — sem breakpoint especial (hoje colapsa só abaixo de 860px; a partir de agora é sempre compacto).
- Dimensão: pill reduz de `w-[128px]` para algo próximo de `w-16` (64px), mantendo `h-[38px]`.
- Thumb: mantém o comportamento de slide (`left` transition, ~300ms), círculo interno (`~28px`) com o ícone ativo (`Sun`/`Moon` do `lucide-react`).
- Transição do ícone: além do slide do thumb, o próprio ícone recebe uma transição leve (fade/rotate curto, ~150-200ms) ao trocar — não é uma troca abrupta.
- Acessibilidade: como o texto visível é removido, o nome acessível do botão (`aria-label`) passa a ser a única forma de comunicar o estado para leitores de tela — deve ser preservado/reforçado.

## Núcleo HTML de referência (variante aprovada)

```html
<div class="toggle-pill">
  <div class="pill-thumb">
    <!-- ícone ativo (Sun ou Moon), com transição própria -->
  </div>
</div>
```

```css
.toggle-pill {
  position: relative;
  width: 64px; /* era 128px */
  height: 38px;
  border-radius: 9999px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
  padding: 5px;
}
.toggle-pill .pill-thumb {
  position: absolute;
  left: 5px; /* desliza para ~33px no estado dark */
  top: 5px;
  width: 26px;
  height: 26px;
  border-radius: 9999px;
  background: var(--color-accent);
  transition: left .3s cubic-bezier(.4,0,.2,1);
}
```

## Fonte de design original

Nenhuma; layout definido apenas via mockup do companion (comparação entre 3 variantes de animação, gerada nesta sessão de brainstorming).

## Fidelidade

O mockup é um *norte* — cores/tokens aproximados do design system do projeto (extraídos de `globals.css`/`button.tsx` via subagente). A fidelidade final (tamanhos exatos, easing, tokens Tailwind) é construída na task de implementação, ajustando o componente real `theme-toggle.tsx`.
