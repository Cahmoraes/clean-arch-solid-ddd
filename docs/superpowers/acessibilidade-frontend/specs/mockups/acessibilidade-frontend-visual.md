---
created_at: "2026-08-26T14:57:46-03:00"
updated_at: "2026-08-26T14:57:46-03:00"
---

# Especificação Visual — Anel de Foco (Acessibilidade Frontend)

**Decisão validada:** técnica de "anel duplo" para o indicador de foco (`:focus-visible`), substituindo o `outline`/`ring` verde translúcido atual (`--color-ring`), que falha contraste 3:1 (WCAG 1.4.11) contra qualquer fundo claro do app.

**Fonte de design original:** Nenhuma; opções geradas a partir dos tokens reais do projeto (`globals.css`, `button.tsx`, `input.tsx`) e comparadas lado a lado no visual companion.

## Decisões visuais (norte, não pixel-final)

- **Técnica:** `box-shadow` de duas camadas — um "gap" na cor de fundo (`var(--color-background)`) seguido de um contorno sólido escuro (`var(--color-foreground)`), em vez de `outline`/`ring` na cor primária.
- **Por que não apenas escurecer o verde:** testadas variações de opacidade (55% → 100%) e o tom mais escuro da paleta (`--color-primary-strong`, `#22c976`) — nenhuma atinge 3:1 contra os fundos claros do produto. O problema é de matiz/luminosidade da paleta, não de opacidade.
- **Onde se aplica:** token global `*:focus-visible` (`globals.css`) e os overrides locais em `button.tsx`, `input.tsx`, `checkbox.tsx` (que hoje substituem o token global por um `ring-*` próprio com o mesmo problema).
- **Comportamento por tema:** a técnica de anel duplo não depende de `--color-ring`, então funciona igual nos dois temas sem precisar de valores diferentes por tema (diferente da alternativa "anel escuro sólido", que também foi comparada mas tem contraste ligeiramente menor, ~16.7:1 vs. ~16:1+ do anel duplo, e não se adapta tão bem a fundos coloridos como o anel duplo).
- **Fidelidade:** este é um *norte* de direção (a técnica e a lógica de cor), não o valor pixel-final — a espessura exata do gap/contorno é ajustada na implementação, validando contraste real nos dois temas.

## Núcleo do mockup comparado (HTML/CSS representativo)

```css
/* Opção escolhida — anel duplo */
.foco-duplo {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-background), 0 0 0 6px var(--color-foreground);
}
```

Comparado lado a lado, sobre um botão (`bg-primary`) e um input (`bg-background`, `border-input`) reais do design system, contra:
- **Atual** (`outline: 2px solid color-mix(in srgb, var(--color-ring) 55%, transparent)`) — ~1.3:1, reprovado.
- **Anel escuro sólido** (`outline: 3px solid var(--color-foreground)`) — ~16.7:1, aprovado, mas não se adapta a fundos coloridos sem ajuste.
- **Anel duplo** (escolhido) — ≥16:1 em qualquer fundo, sem recalibração por variante.

## Fidelidade

Este mockup foi renderizado com os tokens reais do tema claro (`--color-background: #f1f1ec`, `--color-foreground: #111110`, `--color-primary: #39e58c`, `radius-md: 14px`). A implementação deve reconfirmar o contraste renderizado (Tailwind v4 mistura cores em `oklab`, não `srgb`) nos dois temas antes de considerar o achado `1.4.11`/`2.4.7` fechado.
