---
created_at: "2026-06-03T11:30:55-03:00"
updated_at: "2026-06-03T11:30:55-03:00"
---

# Design Spec — Content Width Standardization

## Visão Geral

Padronizar a **largura do conteúdo** das telas autenticadas do frontend VOLT. Hoje, cada página vive dentro do frame do shell (`max-w-[1180px] px-8`), mas **redefine sua própria `max-w` e a centraliza** (`mx-auto`), além de re-aplicar padding horizontal (`px-4 sm:px-6`). O resultado: a borda esquerda do conteúdo "pula" até **242px** ao navegar entre telas (Dashboard começa em x=300px; Cadastrar academia em x=542px), e as larguras variam sem sistema (672 → 768 → 1024 → 1152 → 1172px).

**Estratégia escolhida (A — borda esquerda fixa):** o frame do shell define a borda esquerda; todo conteúdo é **alinhado à esquerda** (sem `mx-auto`) e apenas limita a largura à direita conforme o tier. A borda esquerda nunca se move.

**Contexto:** O `DESIGN.md` do VOLT já indica *"Body content centers in ~960–1100px"*, mas essa guia nunca foi aplicada de forma sistemática — tanto `design-system-migration` quanto `volt-redesign` deixaram "redesign de layout de página" explicitamente fora de escopo. Esta spec preenche essa lacuna.

**Escopo:**

| Incluso | Excluído |
|---|---|
| Componente `PageContainer` com 3 tiers de largura | Telas públicas de auth (`public-shell`, card centralizado) |
| Migração das telas autenticadas para o componente | Mudança de cores, tipografia, espaçamento vertical interno dos cards |
| Remoção do `mx-auto` + padding horizontal duplicado das páginas | Redesign de conteúdo/layout interno das telas |
| Borda esquerda fixa em todas as telas autenticadas | Novos endpoints, mudanças de API/backend |

---

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Por quê (preocupação de domínio) | Critério mensurável |
|---|---|---|
| **Consistência visual** | É o objetivo central — a borda do conteúdo não pode "dançar" ao navegar | Borda esquerda do `<h1>` idêntica (±2px) em 100% das telas autenticadas, mesmo viewport |
| **Manutenibilidade** | Larguras hoje espalhadas em ~11 arquivos geram drift; um ponto único previne regressão | Toda largura de página passa por `PageContainer`; zero `max-w-*` ad-hoc no wrapper raiz das páginas |
| **Legibilidade (UX)** | Linha de leitura longa demais cansa; estreita demais desperdiça espaço em telas data-dense | Cada tela no tier adequado: forms ≤ 672px; listas ≤ 896px; grids até ~1100px |

**Consideradas, não priorizadas:** acessibilidade (não há mudança de semântica/ARIA, só largura), performance (puramente CSS, impacto nulo).

---

## Sistema de Tiers

Todos os tiers são **alinhados à esquerda** do frame do shell (sem `mx-auto`). Ter múltiplos tiers não desestabiliza a borda — ela é sempre a mesma; o tier só define o limite à direita.

| Tier | Largura | Classe | Telas |
|---|---|---|---|
| **`wide`** | preenche o frame (~1100px) | sem `max-w` (largura total do frame) | Dashboard, Academias (grid), Admin Usuários (master-detail) |
| **`default`** | 896px | `max-w-4xl` | Check-ins (membro), Admin Check-ins, Perfil, Assinatura, Detalhe de academia, Perfil público |
| **`narrow`** | 672px | `max-w-2xl` | Cadastrar academia, Editar perfil, Trocar senha |

**Racional dos tiers:**
- **`wide`** — layouts com grid ou colunas internas que *usam* a largura. O Dashboard já roda assim.
- **`default`** — listas de coluna única e telas de detalhe. A 1100px o conteúdo de uma linha de lista (nome … data … botão) fica esparso demais, prejudicando a varredura; 896px mantém os elementos próximos.
- **`narrow`** — formulários e leitura focada. Linha curta confortável; campos lado-a-lado (ex: latitude/longitude) ainda cabem.

---

## Componentes

Derivado por responsabilidade única.

### `PageContainer`

- **Responsabilidade:** envolver o conteúdo de uma página autenticada, aplicando a largura do tier e o alinhamento à esquerda de forma consistente, sem re-aplicar o padding horizontal que o shell já fornece.
- **Interface (props):**
  - `width?: "wide" | "default" | "narrow"` — default: `"default"`.
  - `className?: string` — para o layout interno da página (ex: `flex flex-col gap-8`).
  - `children: ReactNode`
- **Comportamento:** renderiza um wrapper com a `max-w` do tier (ou nenhuma, para `wide`), **sem** `mx-auto`, **sem** `px-*` (herdado do shell) e com `py` de ritmo vertical padronizado.
- **Depende de:** `cn` (clsx + tailwind-merge, já existente).
- **Depende-se de:** todas as páginas autenticadas (`app/(authenticated)/**/page.tsx`).
- **Arquivo:** `apps/frontend/src/components/layout/page-container.tsx`

**Validação (teste de responsabilidade):** "O `PageContainer` decide a largura e o alinhamento horizontal do conteúdo de uma página, e nada mais." — passa (não gerencia dados, estado, nem padding do shell).

---

## Fluxo

```
AuthenticatedShell (frame: mx-auto max-w-[1180px] px-8 pt-9 pb-20)
  └─ <main>
       └─ PageContainer width="default|wide|narrow"  ← borda esquerda = px-8 do shell
            └─ conteúdo da página (flex flex-col gap-*)
```

A borda esquerda do conteúdo é sempre a borda interna do `px-8` do shell. O tier altera apenas onde o conteúdo termina à direita.

---

## Decisões Arquiteturais (ADR-lite)

### ADR-1 — Alinhamento à esquerda (sem `mx-auto`) em vez de tiers centralizados

- **Decisão:** conteúdo alinhado à esquerda do frame; remove `mx-auto` das páginas.
- **Alternativas:** (B) tiers centralizados — valores limpos mas a borda ainda desloca entre tiers; (C) largura única para tudo — simples mas formulários ficam largos demais.
- **Trade-off:** ganha-se borda esquerda 100% estável; **custo:** formulários (`narrow`) passam a ter espaço vazio à direita em vez de centralizado. Aceito — a estabilidade da borda vale mais que a simetria de um form isolado.

### ADR-2 — Três tiers em vez de dois

- **Decisão:** `wide` / `default` / `narrow`.
- **Alternativa:** dois tiers (fill + form) — todas as não-forms preencheriam ~1100px.
- **Trade-off:** ganha-se legibilidade em listas de coluna única (Check-ins) que ficariam esparsas a 1100px; **custo:** uma definição de tier a mais. Aceito — o tier intermediário não compromete a borda fixa (tudo é left-aligned) e resolve um problema real de varredura.

### ADR-3 — Componente `PageContainer` em vez de classes utilitárias inline

- **Decisão:** encapsular a largura/alinhamento num componente.
- **Alternativa:** manter classes Tailwind inline padronizadas em cada página.
- **Trade-off:** ganha-se ponto único de verdade (previne drift, que foi exatamente a causa do problema atual); **custo:** uma indireção a mais e um arquivo novo. Aceito — o padrão inline já provou gerar divergência ao longo de várias features.

### ADR-4 — Telas públicas de auth fora de escopo

- **Decisão:** não alterar `public-shell` nem login/cadastro/recuperar-senha.
- **Racional:** usam card centralizado vertical e horizontalmente — um padrão deliberado e distinto do shell autenticado com sidebar. Aplicar a borda-fixa ali quebraria o design intencional.

---

## Riscos

| Risco | Severidade | Mitigação |
|---|---|---|
| Remover `px-4 sm:px-6` das páginas pode reduzir padding em telas que dependiam dele (sem o `px` do shell em algum caso) | 🟡 | O shell garante `px-8` (`max-[560px]:px-[18px]`); `PageContainer` não re-aplica `px`. Verificar visualmente cada tela migrada em desktop e mobile. |
| Páginas com padding/gap divergentes (ex: `assinatura` e `senha` não tinham `px`/`py`) podem mudar de espaçamento vertical | 🟡 | `PageContainer` padroniza o ritmo vertical (`py`); revisar essas telas especificamente após migração. |
| Tela com layout interno que assumia largura específica (ex: grid do dashboard a 1172px) pode reflowar a ~1100px | 🟢 | `wide` preenche o frame (~1100–1116px); diferença pequena. Conferir o grid de KPIs do dashboard. |
| Perfil (2 colunas) estreita de 1024 → 896px | 🟢 | Layout `[1.6fr_1fr]` continua confortável a 896px; validar visualmente. |

---

## Error Handling

Não aplicável — mudança puramente de layout/CSS, sem novos caminhos de erro, dados ou chamadas de rede.

---

## Testing

- **Visual / manual (Playwright):** capturar screenshots de cada tela autenticada em viewport desktop (1440px) e mobile (375px) antes/depois; confirmar que a borda esquerda do `<h1>` é idêntica entre telas (medição via `getBoundingClientRect().left`).
- **Unit (Vitest + Testing Library):** teste do `PageContainer` verificando que cada `width` aplica a classe de `max-w` correta (ou nenhuma para `wide`), não aplica `mx-auto`, e repassa `className`/`children`.
- **Regressão:** os testes existentes das páginas devem continuar passando (mudança não altera comportamento, dados nem semântica).
- **Gate do projeto:** `pnpm --filter frontend lint:fix` + `tsc:check` + `test` + `build` 100%.
