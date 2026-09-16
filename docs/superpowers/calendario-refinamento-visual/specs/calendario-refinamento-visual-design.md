---
created_at: "2026-09-16T19:07:13-03:00"
updated_at: "2026-09-16T19:07:13-03:00"
---

# Design: Refinamento visual da tela `/calendario`

## Visão Geral

A tela `/calendario` (feriados nacionais brasileiros) já passou por duas iterações
anteriores — `calendario-feriados` (fundação) e `calendario-layout-mes-unico` (visão de mês
único, navegação por setas, sidebar filtrada, já shippado e QA'd). O motivador desta mudança
é puramente visual: o usuário aponta cores genéricas, hierarquia confusa, sidebar mal
aproveitada e grid pouco expressivo como pontos de dor, mesmo com a estrutura de navegação já
validada.

Três direções foram apresentadas via visual companion (mockups comparativos); a Opção A —
"Foco em camadas" — foi escolhida. Ela mantém a estrutura de 2 colunas existente e resolve os
4 pontos de dor por meio de: uso exclusivo da cor primária para estados semânticos (hoje/
feriado), grid com células maiores, e reorganização da sidebar em timeline agrupada por
semana. Nenhuma mudança de backend, de biblioteca, ou de contrato de dados.

**Correção pós-mockup:** a pesquisa de código para o plano de implementação revelou que o
grid **não** destaca o dia atual hoje (nem `aria-current`, nem lógica de "hoje" existem no
componente — só o feriado é destacado). O mockup aprovado tratou o destaque de "hoje" como
comportamento a preservar; na verdade é uma funcionalidade nova, pequena, mantida no escopo
por decisão do usuário.

## Características Arquiteturais

**Priorizadas (top 2):**

| Característica | Por quê (preocupação de domínio) | Critério mensurável |
|---|---|---|
| Usabilidade/Legibilidade | Tela consultada rapidamente para checar feriados; hierarquia confusa hoje atrasa a leitura | Usuário identifica o feriado mais próximo em ≤ 2s visualmente (revisão manual, sem métrica automatizada) |
| Acessibilidade | Já existem padrões de acessibilidade compartilhados (`acessibilidade-frontend` D2) que não podem regredir, e o novo destaque de "hoje" precisa nascer acessível | `role="grid"`/`gridcell`, `aria-live` e anel de foco duplo permanecem presentes e testados; `aria-current="date"` é adicionado (novo) ao dia atual |

**Consideradas, não priorizadas:** performance (dataset de feriados é pequeno, sem impacto),
escalabilidade (fora de escopo — mesmo volume de dados de sempre).

## Especificação Visual

**Artefato curado:** `mockups/calendario-refinamento-visual-visual.md`

**Fonte de design original:** nenhuma — direção definida via heurísticas de UI/UX e mockup do
visual companion.

**Decisões visuais (norte, não pixel-final):**
- Mantém layout de 2 colunas (`PageContainer width="wide"`), sem mudança estrutural de alto
  nível.
- Cor primária (`--color-primary #39e58c`) reservada exclusivamente para "hoje" e "feriado"
  no grid.
- Grid com células maiores (`min-h-14`), texto do feriado permanece fora da célula.
- Sidebar reorganizada em timeline agrupada por "semana do mês", com divisor visual entre
  grupos.

**Fidelidade:** o mockup é um norte; fidelidade pixel-final construída na implementação,
reaproveitando `Card`, `Button` e os tokens já existentes.

## Estrutura de Componentes

Nenhum componente novo. Mudanças dentro da feature `calendario-feriados`:

- `apps/frontend/src/features/calendario-feriados/ui/monthly-calendar.tsx` — ajuste de
  `min-h` das células; adição de detecção do dia atual (comparação de data local, sem lib
  nova) com `aria-current="date"` e a mesma classe de destaque (`border-primary bg-primary/10`)
  usada no feriado, mutuamente exclusivos; garantir que `--color-primary` não apareça em
  nenhum outro estado do grid.
- `apps/frontend/src/features/calendario-feriados/ui/holiday-list.tsx` — reestruturação para
  renderizar grupos por semana (divisor + itens), em vez de lista plana.
- `apps/frontend/src/features/calendario-feriados/lib/` — novo helper puro
  `getWeekOfMonth(date: Date): number`, usado para agrupar os feriados por semana no
  `HolidayList`. Cálculo local e determinístico, sem chamada de rede nova.

Nenhuma mudança em `page.tsx` além de repassar os dados já existentes; nenhuma mudança em
`useFeriadosQuery`, `queryKey`, endpoints, ou `AuthenticatedShell`.

## Decisões Arquiteturais

| Decisão | Justificativa | Trade-off aceito |
|---|---|---|
| Introduzir destaque do dia atual (`aria-current="date"` + cor primária) como funcionalidade nova, comparando a data local com `feriado.date`/o dia renderizado — sem lib de data | Corrige a divergência entre o mockup aprovado (que assumia isso como existente) e o código real; mantém "sem lib nova" já decidido para o projeto | Detecção de "hoje" depende do relógio/timezone do navegador; precisa de teste com data mockada para ser determinístico |
| Agrupar feriados por semana via helper local (`getSemanaDoMes`), sem nova chamada de API | Mantém decisão fechada de `calendario-feriados` D1 (sem backend próprio); cálculo é derivável dos dados já carregados | Lógica de "semana do mês" fica no frontend; precisa de teste unitário dedicado para casos de borda (semana que cruza o fim do mês) |
| Reservar `--color-primary` só para hoje/feriado no grid | Resolve o ponto de dor "cores genéricas" sem introduzir token novo nem quebrar a marca VOLT | Qualquer novo estado visual futuro (ex.: feriado selecionado) precisa de um token secundário — não reutilizar a cor primária para evitar diluir o significado |
| Manter estrutura de 2 colunas em vez de reabrir layout (Opções B/C descartadas) | Menor risco: não mexe em `PageContainer`, não introduz novo agrupamento de dados por tipo de feriado (que o domínio atual não sustenta) | Abre mão de ganhos de densidade que a Opção C traria em telas menores — mitigado pelo comportamento responsivo já existente (sidebar desce abaixo do grid) |

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| `getSemanaDoMes` calcular semana errada em transições de mês (ex.: dia 1 cai no meio de uma semana) | 2 | 2 | 4 🟡 | Teste unitário cobrindo início/fim de mês em diferentes dias da semana |
| Detecção de "hoje" não determinística em teste (depende do relógio real) ou incorreta por fuso horário | 2 | 2 | 4 🟡 | Injetar/mockar a data "atual" no teste (`vi.setSystemTime` ou equivalente já usado no projeto); comparar por data local, não UTC |
| Ajuste de cor remover contraste em algum estado não mapeado no mockup (ex.: hover) | 1 | 2 | 2 🟢 | Revisão visual manual pós-implementação contra o mockup curado |

## Testes

- Test runner: Vitest (`pnpm --filter frontend test -- --run`), conforme
  `apps/frontend/AGENTS.md`.
- Testes em português com `test` (não `it`), conforme convenção do repositório.
- Novo teste unitário para `getSemanaDoMes` (casos de borda: primeiro dia do mês em cada dia
  da semana, mês com 28/29/30/31 dias).
- Novo teste para o destaque do dia atual em `monthly-calendar.test.tsx`, com a data do
  sistema mockada.
- Atualização dos testes existentes de `monthly-calendar` (`monthly-calendar.test.tsx`) e da
  integração da página (`page.test.tsx`, único ponto de cobertura da `HolidayList` hoje) para
  refletir a nova estrutura de agrupamento e o uso restrito da cor primária.
- Verificação manual de acessibilidade (foco por teclado, `aria-live`, contraste) contra o
  mockup curado, já que não há regressão de padrão esperada.
