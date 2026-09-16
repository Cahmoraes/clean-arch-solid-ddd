---
created_at: "2026-09-16T19:07:13-03:00"
updated_at: "2026-09-16T19:07:13-03:00"
---

# Mockup — Redesenho visual da tela `/calendario` (Opção A: "Foco em camadas")

Direção aprovada entre 3 propostas apresentadas via visual companion. Este artefato é um
**norte** (direção de design), não a tela final — a fidelidade de pixel é construída na
implementação.

## Fonte de design original

Nenhuma referência externa. Layout definido a partir de heurísticas gerais de UI/UX para
telas de calendário (hierarquia visual, uso de cor, densidade de informação, acessibilidade)
e do mockup gerado no visual companion durante o brainstorming.

## Decisões visuais

- **Layout:** mantém a estrutura de 2 colunas já existente (`PageContainer width="wide"`) —
  grid do mês à esquerda (área principal), lista de feriados à direita (sidebar de 320px).
  Nenhuma mudança estrutural de alto nível.
- **Hierarquia por contraste, não por cor nova:** a cor primária (`--color-primary #39e58c`,
  token VOLT) passa a ser usada exclusivamente para dois estados no grid — dia **hoje**
  (borda sólida) e **feriado** (fundo `primary/10` + borda) — em vez de aparecer de forma
  genérica em outros elementos decorativos da tela. **Nota:** o destaque de "hoje" não existe
  na implementação atual (só o feriado é destacado hoje) — é introduzido como parte deste
  redesenho, reaproveitando a mesma classe visual já usada no feriado.
- **Grid do mês mais expressivo:** células maiores (`min-h-14`, hoje `min-h-10`), mantendo
  `rounded-md` e o texto do feriado fora da célula (clipped, como hoje) — o nome completo do
  feriado permanece na sidebar, nunca espremido dentro da célula.
- **Sidebar reorganizada em timeline por semana:** a lista de feriados do mês, hoje uma lista
  plana, passa a ser agrupada por "semana do mês" com um divisor visual sutil (`border-t` +
  rótulo "semana N"). Cada item mantém o badge de data em `font-mono` e o layout de card já
  existente.
- **Spacing/escala:** mantém a escala Tailwind atual (`gap-3` entre itens, `gap-6` entre
  regiões), `rounded-lg` (22px) nos cards, `rounded-sm`/`rounded-md` em elementos internos.
- **Tipografia:** Space Grotesk nos títulos (mês, "Feriados de [mês]"), Inter no corpo,
  JetBrains Mono nos badges de data — inalterado, apenas reforçado como regra explícita.

## Núcleo HTML/JSX representativo

Estrutura de referência da célula do grid e do item agrupado da sidebar (direção, não código
final):

```html
<!-- Célula do grid: hoje / feriado usam a MESMA cor primária, nada mais usa -->
<div class="grid-cell" data-state="feriado">
  <!-- rounded-md, min-h-14, border-primary bg-primary/10 quando feriado -->
  <span class="day-number">3</span>
</div>

<!-- Sidebar: item agrupado por semana -->
<div class="week-group">
  <div class="week-divider">Semana 1</div>
  <ul class="holiday-items">
    <li class="holiday-item">
      <!-- bg-muted, rounded-md(14px), padding p-3 — igual ao card atual -->
      <span class="date-badge">03</span>
      <div>
        <strong class="holiday-name">Carnaval</strong>
        <span class="holiday-sub">nacional · terça-feira</span>
      </div>
    </li>
  </ul>
</div>
```

## Tokens de projeto aplicados

| Token | Valor | Uso |
|---|---|---|
| `--color-primary` | `#39e58c` | Estado "hoje" e "feriado" no grid (uso exclusivo) |
| `--color-muted-bg` | `#1d1d1d` (dark) / `#f7f7f3` (light) | Fundo dos itens da sidebar |
| `--radius-lg` | `22px` | Cards principais (grid, sidebar) |
| `--radius-sm` | `8px` | Badge de data, elementos internos |
| Fonte display | Space Grotesk | Títulos |
| Fonte sans | Inter | Corpo de texto |
| Fonte mono | JetBrains Mono | Datas |

## Fidelidade

Este documento é um *norte*: define hierarquia, agrupamento e regra de uso de cor. A
fidelidade pixel-final (espaçamentos exatos, estados de hover/focus completos) é construída
na task de implementação, reaproveitando os componentes `Card`, `Button` e os tokens já
existentes no projeto.
