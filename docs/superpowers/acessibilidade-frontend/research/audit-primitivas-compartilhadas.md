---
created_at: "2026-08-26T14:57:46-03:00"
updated_at: "2026-08-26T14:57:46-03:00"
---

# Auditoria WCAG 2.2 — Componentes UI Compartilhados (shadcn/ui)

**Escopo auditado:** `apps/frontend/src/components/ui/{button,input,label,form-field,field-shell,checkbox,card,pagination}.tsx`
**Critérios em escopo (restritos pelo pedido):** `1.1.1` `2.1.1` `2.4.6` `2.4.7` `1.4.11` `2.5.3` `2.5.8` `3.3.2` `4.1.2` — os demais 46 critérios do WCAG 2.2 **não foram avaliados** por instrução explícita do escopo (não são "N/A", são fora do pedido).

## Correções ao contexto informado (confirmadas no código antes de auditar)

1. **O padrão de campo obrigatório (traço + `aria-required` + `sr-only`) já está presente** em `form-field.tsx` (linhas 41-49, 54) e `field-shell.tsx` (linhas 42-50). Não é um gap a preencher — foi introduzido pelos commits `5569553c` (`feat: indicador de obrigatoriedade e foco reforcado no formulario de contato`) e `e871d826`, que **tocaram sim** esses arquivos compartilhados, ao contrário do que constava no contexto. O que falta são refinamentos pontuais (ver `3.3.2` abaixo), não o padrão em si.
2. **O token global `*:focus-visible` (globals.css:177-180) não é "forte" nos dois temas.** Calculado por luminância relativa WCAG: `color-mix(..., var(--color-ring) 55%, transparent)` sobre o fundo claro (`#f1f1ec`) mede **~1.27-1.35:1** — muito abaixo do mínimo de 3:1 exigido por `1.4.11`. No tema escuro mede ~4.1-4.2:1 (adequado). Isso importa porque os 4 componentes interativos do escopo **substituem** esse token por um anel local (`ring-*`) com o mesmo problema — ver `2.4.7`/`1.4.11`.

---

## Falhas encontradas (8 itens, 21 problemas)

### 1.1.1 — Conteúdo Não Textual · A · 🔴 Crítico (base) · 1 problema

| Ocorrência | Local | Correção sugerida |
|---|---|---|
| `Ícone funcional sem nome acessível.` (risco estrutural — `Button` não exige/valida nome acessível quando `size="icon"` e o único filho é um ícone) | `button.tsx:36-41` (variante `size`), componente completo em `button.tsx:56-68` | Adicionar guarda de tipo (ex.: `ButtonProps` com `aria-label` obrigatório quando não há `children` textual) ou, no mínimo, documentar no componente que uso `size="icon"` exige `aria-label`/`aria-labelledby` |

Nota: não há instância ativa de botão ícone-only sem nome dentro dos 8 arquivos — é um risco de fundação, relevante porque `Input`/`Button` serão adotados amplamente.

### 2.1.1 — Teclado · A · 🔴 Crítico (base) · 1 problema

| Ocorrência | Local | Correção sugerida |
|---|---|---|
| `PaginationLinkProps` não exige `href` (`AnchorHTMLAttributes<HTMLAnchorElement>` com `href` opcional) — `<a>` sem `href` não entra na ordem de tabulação nem funciona como link real | `pagination.tsx:44-54` | Tornar `href: string` obrigatório no tipo de `PaginationLinkProps`, forçando o consumidor a sempre fornecer destino real |

Sev. rebaixada para 🟡 Médio: é um risco de tipo, não uma falha confirmada nos usos atuais (fora do escopo dos 8 arquivos).

### 2.4.6 — Cabeçalhos e Rótulos · AA · 🟡 Médio (base) · 1 problema

| Ocorrência | Local | Correção sugerida |
|---|---|---|
| `CardTitle` renderiza `<div>` em vez de elemento de heading semântico (h1–h6) — conteúdo usado como título de seção não é exposto como heading na árvore de acessibilidade, quebrando navegação por atalho de cabeçalhos | `card.tsx:31-39` | Renderizar `<h3>` por padrão (ajustável ao contexto de aninhamento) ou aceitar prop `asChild`/`as` para permitir que o consumidor escolha o nível de heading correto |

### 2.4.7 — Foco Visível · AA · 🟠 Alto (base) · 4 problemas

| Ocorrência | Local | Correção sugerida |
|---|---|---|
| `Indicador de foco potencialmente sutil (outline fino/transparente).` — anel `ring-2 ring-ring/50` mede ~1.3:1 contra fundos claros (ver `1.4.11`) | `button.tsx:15` | Ver correção consolidada abaixo |
| `Indicador de foco potencialmente sutil` — anel reduzido para `ring-1`/`ring-offset-1` (era `ring-2`/`ring-offset-2` até o commit `e871d826`), mais fino que `Button` (2px) e `Checkbox` (3px), além do mesmo problema de contraste | `input.tsx:16` | Restaurar `ring-2`/`ring-offset-2` (consistência com os demais primitivos) e corrigir contraste (ver abaixo) |
| `Indicador de foco potencialmente sutil` — mesmo padrão `ring-ring/50` | `checkbox.tsx:17` | Ver correção consolidada abaixo |
| `Indicador de foco potencialmente sutil` — herdado de `buttonVariants` via `PaginationLink` | `pagination.tsx:56-67` | Resolvido automaticamente ao corrigir `button.tsx` (fonte do estilo) |

**Correção consolidada (raiz comum):** trocar `ring-ring/50` pela técnica de **anel duplo** decidida na Seção 1 do design (gap na cor do fundo + contorno escuro por fora), em vez de anel verde translúcido.

### 1.4.11 — Contraste Não-Textual · AA · 🟠 Alto (base) · 9 problemas

Cálculo por luminância relativa WCAG (aproximação em sRGB; Tailwind v4 mistura em `oklab`, então o valor final pode variar ligeiramente, mas a ordem de grandeza é robusta):

| Par | Contraste calculado | Limiar |
|---|---|---|
| `border-input` (`#e4e4dc`) vs `bg-background` (`#f1f1ec`), tema claro | **1.13:1** | 3:1 |
| `border-input` (`#2a2a2a`) vs `bg-background` (`#080808`), tema escuro | **1.40:1** | 3:1 |
| `ring-ring/50` sobre fundo claro (`#f1f1ec`) | **1.24:1** | 3:1 |
| `ring-ring/50` sobre fundo escuro (`#080808`) | 3.58:1 (aprovado, no limite) | 3:1 |

| Ocorrência | Local | Correção sugerida |
|---|---|---|
| `outline:none sem indicador de foco alternativo – foco pode não ter contraste 3:1.` — anel de foco ~1.24-1.32:1 em tema claro | `button.tsx:15` | Ver correção do anel acima (anel duplo) |
| idem, agravado pela espessura reduzida (`ring-1`) | `input.tsx:16` | Ver correção do anel acima |
| idem | `checkbox.tsx:17` | Ver correção do anel acima |
| idem (herdado) | `pagination.tsx:56-67` | Resolvido junto de `button.tsx` |
| `Input sem borda visível – pode não ter contraste 3:1 contra fundo.` — `border-input` mede ~1.1-1.4:1 nos dois temas | `input.tsx:13` | Definir token de borda mais escuro/claro o suficiente para ≥3:1 (ex.: próximo de `#767676` em fundo claro, conforme exemplo de referência do WCAG); `border-strong` (`#d3d3c9`) também **não resolve** — mede 1.33:1 |
| mesma borda `border-input` no estado não marcado | `checkbox.tsx:17` | Mesma correção de token |
| `Ícone SVG funcional com fill='none' pode não ter contraste 3:1.` — `CheckIcon` (lucide) usa `fill="none"`/`stroke="currentColor"` por padrão; detector não avalia o `stroke` | `checkbox.tsx:26` | Confirmar contraste real do `stroke` herdado (`text-current` sobre `bg-primary`) e adicionar `aria-hidden="true"` (ícone é redundante ao `data-state` já exposto pelo Radix) |
| mesmo padrão — `ChevronLeft` | `pagination.tsx:81` | Confirmar contraste herdado (`text-foreground`/`text-card-foreground`); já tem nome via `aria-label` no `<a>` pai, mas falta `aria-hidden="true"` no ícone |
| mesmo padrão — `ChevronRight` | `pagination.tsx:97` | Idem |

### 2.5.8 — Tamanho Mínimo do Alvo · AA · 🟢 Baixo (base) · 1 problema

| Ocorrência | Local | Correção sugerida |
|---|---|---|
| `Componente customizado com alvo < 24px (w=16, h=16).` — `size-4` sem padding compensatório | `checkbox.tsx:17` | Envolver o `Root` em wrapper com `min-h-6 min-w-6` (24×24px) centralizando o quadrado de 16px, ou aumentar `padding` do próprio elemento mantendo o ícone visual em 16px |

### 3.3.2 — Rótulos ou Instruções · A · 🔴 Crítico (base) · 3 problemas

| Ocorrência | Local | Correção sugerida |
|---|---|---|
| Indicador visual de obrigatoriedade é um traço decorativo (`h-0.5 w-3.5 bg-primary`, `aria-hidden`) sem símbolo (`*`) nem texto visível — pode não ser reconhecível como "obrigatório" por usuário sem contexto/legenda | `form-field.tsx:44-47` | Adicionar símbolo convencional (`*`) visível junto ao traço, ou manter o traço mas documentar/exibir legenda "* campos obrigatórios" no formulário consumidor |
| Mesmo padrão de traço decorativo sem símbolo/texto visível | `field-shell.tsx:45-48` | Idem |
| `showRequiredIndicator` não propaga `aria-required`/`required` para o input filho — diferente de `FormField`, que aplica `aria-required` diretamente no `Input` (linha 54); em `FieldShell` a semântica de obrigatoriedade depende só do texto `sr-only` dentro do `<label>` | `field-shell.tsx:22-59` (ausência de wiring) | Documentar explicitamente que o consumidor deve aplicar `aria-required`/`required` no elemento filho, já que `FieldShell` não tem acesso a ele; ou aceitar prop de callback/render-prop que force essa passagem |

### 4.1.2 — Nome, Função, Valor · A · 🔴 Crítico (base) · 1 problema

| Ocorrência | Local | Correção sugerida |
|---|---|---|
| Risco estrutural cascata com `1.1.1`: `Button` `size="icon"` não garante nome acessível quando usado só com ícone | `button.tsx:36-41` | Mesma correção do item `1.1.1` acima |

---

## N/A justificados

- **`2.5.3` (Rótulo no Nome) — sem achados em nenhum dos 8 arquivos.** `FormField`/`FieldShell` usam `<label>` nativo com texto visível igual ao conteúdo (sem `aria-label` divergente) → `PASSOU`. `PaginationPrevious`/`Next`/`Checkbox` não têm texto visível próprio (ícone-only) → critério não se aplica a controles sem rótulo visível. `Label` (shadcn) não introduz divergência própria.
- **`1.1.1`/`2.4.6`/`3.3.2`/`4.1.2`/`2.5.8` em `card.tsx`** — não há elementos interativos, ícones funcionais ou campos de formulário no componente (exceto o achado de heading já registrado em `2.4.6`).
- **`1.1.1`/`2.4.6`/`3.3.2`/`4.1.2` em `label.tsx`** — primitivo genérico (Radix `Label`) sem conteúdo/ícone próprio; associação via `htmlFor` é responsabilidade do consumidor e não introduz risco no próprio arquivo.
- **`2.1.1`/`2.4.7` em `card.tsx` e `label.tsx`** — nenhum dos dois define foco ou controle próprio.
- **`3.3.2` em `button.tsx`, `checkbox.tsx`, `pagination.tsx`** — não são campos de formulário.
- **`2.4.6` em `button.tsx`, `input.tsx`, `checkbox.tsx`, `pagination.tsx`, `label.tsx`** — nenhum título/cabeçalho envolvido.
- **`1.4.11` (indicador de input) em `checkbox.tsx` já coberto** sob o achado de borda comum a `input.tsx`; não duplicado como cenário distinto.

## Pendente de runtime

- **Contraste real do anel de foco (`ring-ring/50`)** — os valores calculados (~1.24-1.35:1 claro / ~3.58-3.61:1 escuro) usam aproximação de blend em sRGB; Tailwind v4 usa `color-mix(in oklab, ...)` para modificadores de opacidade, então o valor final pode divergir em décimos. Confirmar via DevTools (`getComputedStyle` do `box-shadow` renderizado) em `button.tsx`, `input.tsx`, `checkbox.tsx`, `pagination.tsx`, nos dois temas. Limiar: ≥3:1.
- **Contraste herdado dos ícones (`CheckIcon`, `ChevronLeft`, `ChevronRight`, `MoreHorizontal`)** — usam `currentColor`/`stroke`, herdando tokens já calibrados para texto (`text-foreground`, `text-primary-foreground`), o que sugere risco baixo, mas o detector estático não avalia `stroke`. Medir contraste renderizado do traço do ícone contra o fundo de cada variante de `Button` usada (`ghost`, `outline`, `secondary`, `primary`).
- **Tamanho real do alvo de toque do `Checkbox` (16×16px declarado)** em uso real — fora do escopo desta auditoria (só os 8 arquivos de `ui/`), mas relevante para decidir se o consumidor já compensa com padding externo (`user-row.tsx`, `admin/usuarios/page.tsx`, ambos fora do escopo).
- **Uso real de `PaginationLink` sem `href`** — confirmar se algum consumidor atual (fora do escopo) já renderiza sem `href`, para decidir se o achado de `2.1.1` é risco estrutural ou falha ativa.

## Onde encontrar as correções no repositório

- `apps/frontend/src/components/ui/button.tsx` — anel de foco (linha 15), tamanho `icon` (linhas 36-41)
- `apps/frontend/src/components/ui/input.tsx` — borda (linha 13), anel de foco (linha 16)
- `apps/frontend/src/components/ui/checkbox.tsx` — borda/anel (linha 17), `CheckIcon` (linha 26)
- `apps/frontend/src/components/ui/card.tsx` — `CardTitle` (linhas 31-39)
- `apps/frontend/src/components/ui/pagination.tsx` — `PaginationLinkProps`/`PaginationLink` (linhas 44-67), ícones (linhas 81, 97)
- `apps/frontend/src/components/ui/form-field.tsx` — indicador de obrigatoriedade (linhas 41-49)
- `apps/frontend/src/components/ui/field-shell.tsx` — indicador de obrigatoriedade (linhas 42-50), ausência de wiring de `aria-required` (componente completo)
- `apps/frontend/src/app/globals.css` — token global `*:focus-visible` (linhas 177-180) e tokens de cor `--color-input`/`--color-ring` (linhas 26, 51-53, 86, 109-110)
