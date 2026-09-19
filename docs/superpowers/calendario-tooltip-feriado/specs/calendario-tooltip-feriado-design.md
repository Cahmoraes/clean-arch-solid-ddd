---
created_at: "2026-09-19T11:23:29-03:00"
updated_at: "2026-09-19T11:23:29-03:00"
---
# Calendário: tooltip de feriado e cor distinta para o dia atual

## Visão Geral

No calendário mensal (`apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.tsx`), o dia atual e o feriado usam hoje a mesma cor (`border-primary bg-primary/10`), então não se distinguem (ex.: dia 19 atual e dia 7 feriado, em setembro/2026). Esta mudança:

1. exibe um tooltip com o nome do feriado ao passar o mouse sobre o dia de feriado;
2. dá ao feriado uma cor própria (âmbar, token `warning`), mantendo o dia atual em verde (`primary`).

Escopo: um componente (`DayCell`) e seu teste. Sem backend, sem novo componente, sem novo token.

## Características Arquiteturais

**Priorizadas:**

| Característica | Por quê | Critério mensurável |
|---|---|---|
| Acessibilidade | Grid `role="grid"` já com `aria-label` por célula | `aria-label` e `aria-current="date"` inalterados; cor não é o único canal (o nome do feriado continua na célula) |
| Distinguibilidade visual | Bug reportado: hoje e feriado iguais | Teste afirma classes distintas para feriado e hoje |

**Consideradas, não priorizadas:** performance (no máximo ~3 tooltips por mês), i18n.

## Decisões Arquiteturais

### D1. `Tooltip` (hover) em vez de `Popover`

- **Contexto:** a spec `calendario-feriados` (D2) escolheu `Popover` para hover, clique e foco. O pedido atual é só um tooltip no hover.
- **Decisão:** envolver a célula de feriado com o `Tooltip` de `@/components/ui/tooltip` (Radix). Isso substitui D2 de `calendario-feriados` neste ponto.
- **Justificativa técnica:** o wrapper já existe e o `TooltipProvider` está montado em `providers.tsx` e em `test/render.tsx`, sem novo provider.
- **Justificativa de negócio:** pedido direto do usuário; menor custo.
- **Trade-offs aceitos:** a célula segue `tabIndex={-1}`, então usuário de teclado não abre o tooltip. O nome do feriado continua acessível pelo `aria-label` e pelo texto na célula. Revisitar se surgir requisito de teclado.

### D2. Cor do feriado: `warning` (âmbar), dia atual: `primary` (verde)

- **Contexto:** o token `secondary` (#1d1d1d no escuro) é quase invisível sobre o card (#161616). Escolha do usuário no preview: opção A.
- **Decisão:** feriado `border-warning bg-warning/10`; hoje `border-primary bg-primary/10`. Se o dia é feriado e hoje ao mesmo tempo, **hoje prevalece** (verde); o nome do feriado segue na célula e no tooltip.
- **Justificativa técnica:** `warning` já existe nos temas claro e escuro. Função pura `getDayCellStateClass(isHoliday, isToday)` mantém a complexidade cognitiva do `DayCell` dentro do limite 5 do Biome.
- **Justificativa de negócio:** distinguir o dia atual sem inventar token novo.
- **Trade-offs aceitos:** reverte a regra de `calendario-refinamento-visual` ("mesma classe de destaque"; primário reservado a hoje e feriado). Agora primário é só de hoje. O mockup antigo em `calendario-refinamento-visual/specs/mockups/` fica desatualizado neste ponto.

## Estrutura de Componentes

- `DayCell` (existente): monta a célula; para feriado, retorna `<Tooltip><TooltipTrigger asChild>{célula}</TooltipTrigger><TooltipContent>{nome}</TooltipContent></Tooltip>`; dia comum sem tooltip.
- `getDayCellStateClass` (nova função local): mapeia estado para classes (hoje > feriado > nenhum).
- Não adicionar `TooltipProvider` local: o global já cobre app e testes.
- `holiday-list.tsx`: fora de escopo, sem mudança.

## Especificação Visual

**Artefato curado:** `mockups/calendario-tooltip-feriado-visual.md`

**Fonte de design original:** nenhuma; layout definido via mockup do companion e print do usuário.

**Decisões visuais (norte, não pixel-final):**
- Feriado: borda e fundo âmbar suave (`warning` / `warning/10`). Hoje: verde (`primary` / `primary/10`).
- Tooltip: estilo padrão do `TooltipContent` (popover, borda `border`, `text-xs`), acima da célula.
- Sem mudança de tamanho, raio ou tipografia das células.

## Riscos

| Risco | Impacto | Prob. | Score | Mitigação |
|---|---|---|---|---|
| Contraste do âmbar sobre card claro | 1 | 2 | 2 🟢 | Conferir no tema claro na verificação visual |
| `hover` em teste jsdom não abrir tooltip | 1 | 2 | 2 🟢 | `userEvent.hover` e `findByRole("tooltip")` |

## Testes

Runner: Vitest + Testing Library (`pnpm test -- --run` em `apps/frontend`); descrições em PT-BR com `test`.
- feriado tem classes `border-warning bg-warning/10` e não `border-primary`; dia atual (relógio fixo com `vi.useFakeTimers({ toFake: ["Date"] })`) mantém `border-primary bg-primary/10`;
- dia que é feriado e hoje: classes de hoje, `aria-current="date"`;
- hover no feriado exibe `role="tooltip"` com o nome; dia comum não tem tooltip;
- o teste existente "mesma cor primária do feriado" é renomeado (o nome passa a ser falso).

Portões: `pnpm lint:fix`, `pnpm tsc:check`, `pnpm test -- --run`, `pnpm build` (frontend), sem exceção.

## Fora de escopo

Foco/teclado no tooltip, categorias de feriado por cor, mudanças em `holiday-list.tsx`, novos tokens de tema.
