---
created_at: "2026-09-16T19:09:25-03:00"
updated_at: "2026-09-16T19:09:25-03:00"
---

# PRD: Refinamento visual da tela `/calendario`

## Visão Geral

A tela `/calendario` exibe os feriados nacionais brasileiros em um grid mensal com uma lista
lateral de detalhes. Apesar de a navegação (mês único, setas, swipe/teclado) já ter sido
redesenhada e validada recentemente, usuários relatam que a superfície visual — cores,
hierarquia e organização da lista lateral — está genérica e pouco expressiva, dificultando a
identificação rápida de feriados relevantes. Este PRD cobre um refinamento visual da tela,
sem alterar sua estrutura de navegação ou sua origem de dados.

## Objetivos

- Reduzir a percepção de "hierarquia confusa": o dia atual e os feriados devem ser
  identificáveis à primeira vista, sem concorrência visual de outros elementos.
- Eliminar o uso genérico da cor de marca (VOLT green) fora de estados com significado
  (hoje/feriado).
- Tornar a lista lateral de feriados mais fácil de escanear, agrupando-a por semana.
- Preservar 100% dos atributos de acessibilidade já validados (`role="grid"`/`gridcell`,
  `aria-live`, `aria-current`, anel de foco duplo) — nenhuma regressão.

## Histórias de Usuário

- **US-01** — Como usuário autenticado, eu quero ver o dia atual e os feriados destacados de forma inequívoca no grid do mês para identificar rapidamente feriados relevantes · **UI:** sim
- **US-02** — Como usuário autenticado, eu quero ver os feriados do mês agrupados por semana na lista lateral para localizar um feriado específico sem escanear uma lista longa e uniforme · **UI:** sim
- **US-03** — Como usuário que navega por teclado ou usa leitor de tela, eu quero que a navegação e os destaques do calendário continuem totalmente acessíveis após a mudança visual, para não perder capacidade de uso · **UI:** sim

## Funcionalidades Principais

**Destaque semântico de cor no grid do mês**
- O que faz: introduz o destaque visual do dia atual (hoje) — que não existe na implementação atual — e reserva a cor primária do tema exclusivamente para os estados "hoje" e "feriado".
- Por que importa: hoje o grid só destaca feriados e usa a cor de marca sem critério em outros elementos, diluindo a hierarquia visual e deixando o usuário sem uma referência visual do dia atual.
- Como funciona (alto nível): detecção do dia atual por comparação de data local (sem biblioteca nova), aplicando a mesma classe visual já usada no feriado, de forma mutuamente exclusiva.

- **FR-001** (US-01) — O sistema deve destacar visualmente o dia atual (novo) e os dias de feriado (já existente) no grid do mês usando exclusivamente a cor primária do tema, sem aplicá-la a outros elementos do grid.
- **FR-002** (US-01) — O sistema deve exibir as células do grid do mês com altura mínima maior que a implementação atual, mantendo o nome do feriado fora da célula (sem alterar o comportamento de truncamento de texto).

**Lista de feriados agrupada por semana**
- O que faz: reorganiza a lista lateral de feriados do mês em grupos, um por semana, com um divisor visual entre eles.
- Por que importa: a lista plana atual não comunica em que parte do mês cada feriado está, dificultando a leitura rápida.
- Como funciona (alto nível): a semana de cada feriado é derivada localmente a partir da própria data já carregada, sem nova chamada de API.

- **FR-003** (US-02) — O sistema deve agrupar os feriados exibidos na lista lateral por semana do mês, com um divisor visual identificando cada grupo.
- **FR-004** (US-02) — O sistema deve calcular a semana do mês de cada feriado a partir da data já disponível no cliente, sem depender de um novo endpoint ou parâmetro de API.

**Preservação de acessibilidade e estrutura**
- O que faz: garante que o redesenho visual não regrida os padrões de acessibilidade e a estrutura de layout já validados.
- Por que importa: `/calendario` já segue um padrão de acessibilidade compartilhado com outras telas do produto; regressão aqui teria custo além desta feature.
- Como funciona (alto nível): os atributos de acessibilidade e a estrutura de duas colunas são mantidos como estão; só a apresentação visual interna muda.

- **FR-005** (US-03) — O sistema deve manter, sem alteração, os atributos de acessibilidade já existentes (`role="grid"`/`gridcell` no grid, `aria-live` no cabeçalho do mês, anel de foco duplo em todos os elementos focáveis) e deve aplicar `aria-current="date"` (novo) ao dia atual introduzido por FR-001.
- **FR-006** (US-01, US-02) — O sistema deve manter a estrutura de layout de duas colunas (grid principal + lista lateral) e o comportamento responsivo existente, em que a lista lateral é exibida abaixo do grid em telas pequenas.

## Experiência do Usuário

O layout de duas colunas é preservado (grid do mês à esquerda, lista de feriados à direita).
A mudança concentra-se em hierarquia visual e agrupamento: a cor de destaque passa a
significar exclusivamente "hoje" ou "feriado" no grid, e a lista lateral passa a exibir
divisores por semana em vez de uma sequência plana de itens. Nenhum novo fluxo de interação
é introduzido — navegação por mês, teclado e swipe permanecem como estão. A direção visual
completa (incluindo tokens de cor, tipografia e a estrutura de referência do HTML) está
documentada no artefato curado `docs/superpowers/calendario-refinamento-visual/specs/mockups/calendario-refinamento-visual-visual.md`.

## Restrições Técnicas de Alto Nível

- **Usabilidade/Legibilidade:** o dia atual e os feriados devem ser identificáveis
  visualmente em poucos segundos (critério validado por revisão manual, sem instrumentação
  automatizada).
- **Acessibilidade:** nenhuma regressão nos padrões já estabelecidos (`role`, `aria-*`, anel
  de foco duplo compartilhado com outras telas do produto).
- **Sem mudança de dados/backend:** feriados continuam vindo da integração frontend-only já
  existente; nenhum novo endpoint, parâmetro ou contrato de API.
- **Sem novas dependências:** nenhuma biblioteca de calendário externa, nenhuma dependência
  de animação nova (animações continuam CSS-only, respeitando `prefers-reduced-motion`).

## Fora de Escopo

- Introduzir categorização de feriados por tipo (nacional/estadual/opcional) e cor por tipo —
  o domínio de dados atual só sustenta feriados nacionais.
- Fundir o grid e a lista lateral em uma única superfície (opção de design descartada nesta
  rodada).
- Qualquer mudança em `AuthenticatedShell`, no drawer/menu mobile, ou em navegação fora de
  `/calendario`.
- Qualquer mudança em `queryKey`, cache, endpoints ou na integração com a fonte de feriados.
- Trocar a implementação atual por uma biblioteca externa de calendário.
