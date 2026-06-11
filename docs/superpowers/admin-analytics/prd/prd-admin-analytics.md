---
created_at: "2026-06-04T14:29:04-03:00"
updated_at: "2026-06-04T14:29:04-03:00"
---

# PRD: Admin Analytics

## Visão Geral

Admins do sistema não têm visibilidade agregada sobre a operação da academia: quanto os membros estão usando o espaço, quem está em risco de abandonar e como a base de membros evolui ao longo do tempo. Toda tomada de decisão operacional (ajustar horários, acionar membros inativos, avaliar crescimento) é feita sem dados, por intuição.

Esta feature entrega uma página dedicada `/admin/analytics` com métricas operacionais nas três dimensões que determinam a saúde da academia: **ocupação**, **retenção** e **crescimento**. O admin visualiza os números ao abrir a página, filtra por período pré-definido e faz drill-down nas seções que precisam de análise mais detalhada.

---

## Objetivos

- Admin consegue responder em menos de 30 segundos: "Quantos check-ins tivemos este mês? Qual nossa taxa de retenção? Quantos membros novos entraram?"
- Cada endpoint de analytics responde em menos de 500ms com o volume atual de dados
- Zero regressões nas features existentes de check-in e gestão de usuários

---

## Histórias de Usuário

- **US-01** — Como admin, eu quero ver KPIs de check-ins, retenção e novos membros numa visão unificada para que eu possa avaliar a saúde da academia sem navegar por múltiplas telas
- **US-02** — Como admin, eu quero filtrar todas as métricas por período pré-definido (7 dias, 30 dias, 3 meses, 12 meses) para que eu possa comparar o desempenho em janelas de tempo relevantes para o negócio
- **US-03** — Como admin, eu quero ver a evolução diária de check-ins em forma de gráfico para que eu possa identificar tendências, sazonalidade e dias de baixa frequência
- **US-04** — Como admin, eu quero ver a distribuição de check-ins por hora do dia para que eu possa identificar os horários de pico e tomar decisões sobre staff e infraestrutura
- **US-05** — Como admin, eu quero ver a taxa de retenção e a contagem de membros ativos versus inativos para que eu possa medir o churn e tomar ações de reengajamento
- **US-06** — Como admin, eu quero ver a lista de membros em risco (sem check-in recente) para que eu possa entrar em contato e prevenir o abandono
- **US-07** — Como admin, eu quero ver a curva de crescimento de membros e o número de novos cadastros por período para que eu possa avaliar o resultado de ações de aquisição
- **US-08** — Como membro (não-admin), eu quero ser impedido de acessar a página de analytics para que dados operacionais sensíveis permaneçam protegidos

---

## Funcionalidades Principais

### 1. Página de Analytics (`/admin/analytics`)

Ponto de entrada unificado para todas as métricas operacionais. Disponível exclusivamente para usuários autenticados com role admin.

**FR-001** — A página deve ser acessível somente por admins autenticados; tentativa de acesso por membro deve redirecionar para página inicial.

**FR-002** — A página deve exibir um seletor de período com as opções: 7 dias, 30 dias, 3 meses e 12 meses; o período padrão ao abrir a página deve ser 30 dias.

**FR-003** — O período selecionado deve ser persistido na URL como parâmetro `period` (ex: `?period=30d`) para que o link seja compartilhável entre admins.

### 2. KPI Row

Linha de três cards no topo da página com os indicadores mais importantes do período selecionado.

**FR-004** — A KPI row deve exibir: (a) total de check-ins no período, (b) taxa de retenção de membros em percentual e (c) número de novos membros cadastrados no período.

**FR-005** — Os KPI cards devem exibir estado de loading skeleton enquanto os dados são carregados.

**FR-006** — Em caso de erro ao carregar qualquer KPI, o card afetado deve exibir mensagem de erro sem bloquear os demais.

### 3. Seção de Check-ins (colapsável)

Detalhamento da ocupação da academia no período selecionado.

**FR-007** — A seção deve exibir um gráfico de linha com a evolução diária de check-ins ao longo do período.

**FR-008** — Para períodos de 3 meses ou 12 meses, a série temporal deve ser agregada por semana (não por dia) para manter a legibilidade do gráfico.

**FR-009** — A seção deve exibir um gráfico de barras com a distribuição de check-ins por hora do dia (0h–23h) para identificação de horários de pico.

**FR-010** — A seção deve estar aberta por padrão ao carregar a página.

### 4. Seção de Retenção (colapsável)

Métricas de engajamento e risco de churn dos membros.

**FR-011** — A seção deve exibir a contagem absoluta de membros ativos e inativos, e a taxa de churn em percentual. Membro inativo: sem check-in nos últimos 30 dias (fixo, independente do período selecionado).

**FR-012** — A seção deve exibir a lista de membros em risco: sem check-in nos últimos 14 dias. Cada item deve mostrar nome do membro e quantidade de dias desde o último check-in.

**FR-013** — A seção deve estar fechada por padrão ao carregar a página.

### 5. Seção de Crescimento (colapsável)

Evolução da base de membros ao longo do período.

**FR-014** — A seção deve exibir um gráfico de área com a evolução cumulativa do total de membros ativos no período.

**FR-015** — A seção deve exibir um gráfico de barras com o número de novos membros cadastrados por semana ou mês dentro do período.

**FR-016** — A seção deve estar fechada por padrão ao carregar a página.

---

## Experiência do Usuário

**Fluxo principal:**

1. Admin acessa `/admin/analytics` (link no sidebar admin)
2. Página carrega com período padrão de 30 dias; KPI row aparece em skeleton durante o fetch
3. KPI row exibe os três indicadores; seção de Check-ins já aparece expandida com os gráficos
4. Admin troca o período para 7 dias via seletor no topo; todos os dados refazem fetch automaticamente
5. Admin expande a seção de Retenção para ver membros em risco e planeja ação de reengajamento
6. Admin compartilha a URL `analytics?period=7d` com outro admin para análise conjunta

**Estados da UI:**

- **Loading:** skeleton nos KPI cards e placeholder nas seções durante o fetch inicial
- **Error:** cada seção tem error boundary independente — falha numa seção não afeta as demais
- **Empty:** quando o período não tem dados (ex: academia recém-aberta), exibir estado vazio com mensagem explicativa em vez de gráfico em zero
- **Responsive:** layout funcional em mobile (cards empilhados, gráficos com scroll horizontal se necessário)

---

## Restrições Técnicas de Alto Nível

**Manutenibilidade:** cada endpoint de analytics deve ter responsabilidade única e seguir os padrões de Clean Architecture já estabelecidos no projeto (use case → interface de repositório → implementação Prisma).

**Performance:** cada endpoint de analytics deve responder em menos de 500ms com o volume atual de dados. Índices compostos nas colunas `created_at` e `(user_id, created_at)` da tabela de check-ins são pré-requisito antes da implementação dos use cases.

**Observabilidade:** erros em queries de analytics devem ser logados no backend com contexto do período solicitado. Cada seção da UI deve ter error boundary próprio.

**Segurança:** os três endpoints de analytics devem exigir autenticação e role admin. Dados de membros em risco (lista com nome e dias inativos) são dados pessoais — o acesso deve ser restrito e logado.

---

## Fora de Escopo

- Exportação de dados em CSV, PDF ou qualquer formato
- Atualização automática dos dados (polling, SSE, WebSocket)
- Filtro por data range livre (apenas períodos pré-definidos)
- Comparativo entre membros individuais
- Customização de widgets ou layout pelo admin
- Métricas financeiras (MRR, LTV, receita)
- Agendamento de relatórios por e-mail
- Histórico de analytics ou comparação entre períodos simultâneos
- Dashboard analytics para membros (visão individual mais rica que o dashboard atual)
