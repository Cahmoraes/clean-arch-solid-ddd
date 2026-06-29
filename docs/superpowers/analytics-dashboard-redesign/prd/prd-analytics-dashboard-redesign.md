---
created_at: "2026-06-29T10:46:07-03:00"
updated_at: "2026-06-29T10:46:07-03:00"
---

# PRD: Analytics Dashboard Redesign

## Visão Geral

A tela `/admin/analytics` exibe dados operacionais corretos, mas exige que o administrador expanda seções colapsáveis e role a página antes de ver o dado mais acionável — a lista de membros em risco de churn. Isso aumenta o esforço cognitivo e reduz a probabilidade de ação preventiva.

Este PRD define os requisitos para redesenhar a tela segundo o princípio de valor-primeiro: o dado mais acionável (membros at-risk) deve ser visível imediatamente, os KPI cards devem comunicar tendência sem gráficos separados, e nenhuma informação relevante deve estar atrás de uma interação de expansão.

## Objetivos

- Reduzir para **zero interações** necessárias para o administrador ver membros em risco de churn ao abrir o dashboard
- Eliminar o scroll obrigatório para acesso às métricas operacionais primárias
- Comunicar a saúde operacional da academia em ≤ 5 segundos a partir do carregamento inicial
- Simplificar a superfície da tela: remover 3 seções colapsáveis e todos os gráficos grandes, reduzindo o grafo de componentes de 8 para 4 componentes ativos

## Histórias de Usuário

- **US-01** — Como administrador, eu quero ver a lista de membros em risco de churn imediatamente ao abrir o dashboard para que eu possa agir (contatar o membro) antes que o cancelamento aconteça
- **US-02** — Como administrador, eu quero visualizar a tendência de cada KPI diretamente no card para que eu entenda se a métrica está melhorando ou piorando sem precisar expandir nenhuma seção
- **US-03** — Como administrador, eu quero que os números de membros ativos, inativos e taxa de churn estejam sempre visíveis na tela para que eu não precise interagir para acessar esses valores
- **US-04** — Como administrador, eu quero ver uma confirmação positiva explícita quando não há membros em risco para que eu saiba que o dashboard carregou corretamente e que a academia está saudável
- **US-05** — Como administrador, eu quero expandir a lista completa de membros at-risk sem sair da tela de analytics para que eu tenha acesso a todos os membros em risco quando necessário

## Funcionalidades Principais

### 1. At-Risk Alert Zone

Zona de atenção imediata posicionada logo abaixo do seletor de período, antes dos KPI cards. É o primeiro dado de conteúdo que o administrador vê ao abrir a tela.

**Por que importa:** A lista at-risk é o único dado da tela que exige uma ação imediata e tem janela de tempo limitada. Surfaceá-la ao topo maximiza a probabilidade de ação preventiva.

**Requisitos funcionais:**
- **FR-001** — A tela deve exibir uma zona de alerta contendo a lista de membros em risco imediatamente abaixo do seletor de período, sem nenhuma interação de expansão
- **FR-002** — A zona at-risk deve exibir os primeiros 3 membros por padrão, ordenados por número de dias sem check-in em ordem decrescente
- **FR-003** — Cada item da lista deve exibir o nome do membro e o número de dias desde o último check-in
- **FR-004** — Membros com 18 ou mais dias sem check-in devem ter o indicador de dias exibido em vermelho (crítico); abaixo desse valor, em âmbar
- **FR-005** — A zona deve oferecer uma ação "ver todos" que revela o restante da lista na mesma tela, sem navegação para outra página
- **FR-006** — Quando não há membros em risco, a zona de alerta deve ser substituída por uma zona de confirmação positiva com mensagem indicando que a academia está saudável

### 2. KPI Cards com Sparklines

Os 3 KPI cards existentes (check-ins totais, taxa de retenção, novos membros) ganham uma sparkline de tendência visual embutida, derivada dos dados do período selecionado já disponíveis nas queries existentes.

**Por que importa:** Elimina a necessidade de seções de gráfico separadas para comunicar tendência. O administrador lê o número e a direção da curva no mesmo card, sem scroll.

**Requisitos funcionais:**
- **FR-007** — Cada KPI card deve exibir uma sparkline de tendência embutida, passiva (sem interatividade), derivada dos dados do período selecionado
- **FR-008** — O KPI card de taxa de retenção deve ter tratamento visual destacado (borda e fundo tintados na cor primária do tema) para identificá-lo como a métrica-alvo do negócio
- **FR-009** — As sparklines devem refletir os mesmos dados controlados pelo seletor de período ativo

### 3. Retention Mini-Stats Row

Os valores numéricos de membros ativos, membros inativos e taxa de churn — atualmente dentro da seção colapsável de Retenção — passam a ser exibidos em um row compacto sempre visível abaixo dos KPI cards.

**Por que importa:** São números de suporte à leitura da taxa de retenção. Não exigem gráfico; um número com label é suficiente.

**Requisitos funcionais:**
- **FR-010** — Os valores de membros ativos, inativos e taxa de churn devem estar sempre visíveis abaixo dos KPI cards, sem necessidade de expansão
- **FR-011** — Os valores de membros inativos e taxa de churn devem ser apresentados em cor de destaque negativo (vermelho) para indicar seu caráter de atenção

### 4. Remoção das Seções Colapsáveis e Gráficos

As seções `CheckInMetrics`, `RetentionMetrics` e `GrowthMetrics` — com todos os seus gráficos de linha, barras e área — são removidas da tela.

**Por que importa:** As seções colapsáveis (2 delas fechadas por padrão) criam a falsa impressão de que a tela tem menos informação do que realmente possui, além de exigir scroll e interação para acessar dados relevantes. Com sparklines nos KPI cards e a at-risk zone surfaced, toda a informação operacional está acessível sem esses componentes.

**Requisitos funcionais:**
- **FR-012** — As seções colapsáveis de Check-ins, Retenção e Crescimento não devem estar presentes na tela após o redesign
- **FR-013** — Os gráficos de linha, barras e área previamente presentes nessas seções não devem ser exibidos na tela

### 5. Period Selector (mantido)

O seletor de período existente (7 dias, 30 dias, 3 meses, 12 meses) é mantido sem alteração.

**Requisitos funcionais:**
- **FR-014** — O seletor de período deve controlar todos os dados exibidos na tela: sparklines, KPI values, at-risk zone e retention mini-stats

## Experiência do Usuário

### Jornada principal — verificar saúde operacional

1. Administrador abre `/admin/analytics`
2. Vê imediatamente (above the fold, sem interação): seletor de período → zona at-risk (ou zona saudável) → 3 KPI cards com sparklines
3. Identifica membros em risco pelo nome e dias sem check-in
4. Se necessário, clica em "ver todos" para expandir a lista completa na mesma tela
5. Lê os valores de membros ativos/inativos/churn no row abaixo dos KPI cards
6. Altera o período se quiser comparar janelas temporais diferentes

### Jornada alternativa — academia saudável

1. Administrador abre `/admin/analytics`
2. Vê a zona verde de confirmação ("Academia saudável — nenhum membro em risco")
3. Lê os KPI cards com sparklines em alta para confirmar crescimento
4. Nenhuma ação necessária

### Considerações de UX

- A ordem visual da tela segue a hierarquia ação → contexto → detalhe
- A zona at-risk usa cor âmbar (não vermelho) como identidade visual da zona, reservando o vermelho para badges individuais de membros em estado crítico (≥ 18 dias)
- O mockup de referência está em `specs/mockups/analytics-dashboard-redesign-visual.md`
- Skeleton loaders devem ser exibidos nas mesmas dimensões dos componentes enquanto os dados carregam

## Restrições Técnicas de Alto Nível

Derivadas das Características Arquiteturais priorizadas na design spec:

| Característica | Critério mensurável |
|---|---|
| Usabilidade (valor-primeiro) | At-risk zone + 3 KPI cards visíveis above the fold em viewport 1280px sem scroll |
| Performance de percepção | Skeleton dos KPI cards resolve em < 2s com cache hit do TanStack Query (stale time 60s) |
| Manutenibilidade | Grafo de componentes de analytics reduzido de 8 para 4 componentes; Recharts removível se não usado em outros módulos |

**Integrações requeridas:**
- As 3 queries de analytics existentes (`useCheckInMetrics`, `useRetentionMetrics`, `useGrowthMetrics`) — mantidas com os mesmos parâmetros e stale time
- Os campos de dados utilizados pelas sparklines (`dailySeries`, `activeMembersTrend`, `newMembersPerPeriod`) já são retornados por essas queries

**Sem novos endpoints** — toda a feature usa dados já disponíveis na API.

## Fora de Escopo

- **Delta badges (variação percentual vs período anterior):** exigiria suporte adicional de backend; out of scope para esta entrega
- **Interatividade nas sparklines** (tooltips, hover): sparklines são puramente visuais nesta versão
- **Clique em membro at-risk com navegação:** a lista at-risk é informativa; ação de navegar ao perfil do membro é out of scope
- **Configuração do threshold at-risk pelo usuário:** o critério (padrão: 14 dias sem check-in, conforme definido pelo backend) não é configurável pelo admin nesta versão
- **Gráficos detalhados via drill-down:** a opção foi avaliada e descartada em favor da abordagem de sparklines passivas
- **Outras telas de admin:** o redesign é restrito a `/admin/analytics`
