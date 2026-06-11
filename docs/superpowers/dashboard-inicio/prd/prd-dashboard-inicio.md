---
created_at: "2026-05-25T10:15:49-03:00"
updated_at: "2026-05-25T10:15:49-03:00"
---

# PRD: Dashboard Início

## Visão Geral

Membros da academia carecem de visibilidade sobre sua frequência e histórico de check-ins após o login. Atualmente a tela pós-login é a listagem de academias — uma tela de descoberta, não de acompanhamento pessoal.

Este PRD define os requisitos para uma tela de dashboard em `/inicio` que se torna a **página principal pós-login**, exibindo métricas pessoais de frequência, histórico recente e padrões de atividade. Concomitantemente, o shell de navegação é refatorado de top-nav para sidebar lateral, alinhando a app ao padrão de produtos fitness modernos.

## Objetivos

- Membro visualiza suas principais métricas de frequência sem navegar para outras telas
- Membro identifica seu padrão de treino (dias preferidos, sequência) de forma imediata
- Membro vê o status dos últimos check-ins (validado, pendente, rejeitado) sem acessar a listagem completa
- Navegação da app se torna consistente e familiar (sidebar em todas as rotas autenticadas)
- Zero novos endpoints de API — todos os dados vêm de endpoints existentes

## Histórias de Usuário

### Persona Primária: Membro

**US-01 — Tela inicial personalizada**
Como membro, quero que ao fazer login eu chegue direto no meu dashboard pessoal, para que eu veja minhas informações sem precisar navegar.

**US-02 — Visão geral de frequência**
Como membro, quero ver meu total de check-ins, quantos fiz este mês e minha sequência atual, para que eu acompanhe minha evolução de frequência.

**US-03 — Reconhecimento do meu perfil**
Como membro, quero ver meu nome, e-mail e há quanto tempo sou membro, para que eu me sinta identificado na plataforma.

**US-04 — Padrão semanal**
Como membro, quero ver um gráfico de quantos check-ins fiz por dia da semana, para que eu identifique quais dias costumo treinar mais.

**US-05 — Histórico de atividade (heatmap)**
Como membro, quero ver um calendário visual dos últimos 3 meses indicando os dias em que fiz check-in, para que eu visualize minha consistência ao longo do tempo.

**US-06 — Últimos check-ins**
Como membro, quero ver uma lista dos 5 check-ins mais recentes com nome da academia, data e status, para que eu saiba se meus check-ins foram validados.

**US-07 — Distribuição de status**
Como membro, quero ver a proporção de check-ins validados, pendentes e rejeitados, para que eu identifique se tenho check-ins problemáticos acumulados.

**US-08 — Navegação consistente**
Como membro, quero uma sidebar lateral de navegação com acesso a todas as seções da app, para que eu navegue de forma consistente em qualquer tela.

### Persona Secundária: Admin

**US-09 — Seção admin na sidebar**
Como admin, quero que a sidebar exiba uma seção adicional com os links de administração (Usuários, Check-ins admin, Academias admin), para que eu acesse o painel administrativo sem sair do contexto da app.

## Funcionalidades Principais

### F-01 — Rota `/inicio` e Redirecionamento Pós-login

A rota `/inicio` passa a ser a **tela padrão após autenticação**. O redirecionamento atual de `/academias` é alterado para `/inicio`.

**Requisitos funcionais:**
- **RF-001** — A rota `/inicio` deve existir no grupo autenticado e ser acessível somente com sessão válida
- **RF-002** — Após login bem-sucedido, o usuário deve ser redirecionado para `/inicio`
- **RF-003** — A rota deve estar protegida pelo middleware existente de sessão

### F-02 — AppSidebar (Refatoração do Shell)

O `AuthenticatedShell` é refatorado para exibir uma sidebar lateral no lugar do top-nav com abas. A mudança se aplica a todas as rotas do grupo autenticado.

**Requisitos funcionais:**
- **RF-004** — A sidebar deve exibir os itens de navegação: Dashboard, Check-ins, Academias, Perfil, Assinatura
- **RF-005** — O item ativo deve ser destacado visualmente conforme o path atual
- **RF-006** — A sidebar deve exibir no rodapé o avatar com iniciais, nome e role do usuário logado
- **RF-007** — Em viewport mobile/tablet (<1024px), a sidebar deve ser ocultada e acessível por um botão hamburger que abre um drawer
- **RF-008** — Para usuários com role `ADMIN`, a sidebar deve exibir uma seção adicional com links administrativos

### F-03 — Card de Perfil (Hero)

Exibido no topo do conteúdo principal, consolida identidade e estatísticas principais.

**Requisitos funcionais:**
- **RF-009** — O card deve exibir: avatar com iniciais do nome, nome completo, e-mail, role e data de cadastro
- **RF-010** — O card deve exibir um badge de status da conta (Ativo/Inativo) com cor correspondente
- **RF-011** — O card deve exibir inline: total de check-ins, check-ins do mês atual e sequência atual

### F-04 — KPI Cards

Quatro cards em grid exibindo as métricas principais.

**Requisitos funcionais:**
- **RF-012** — Exibir: Total de check-ins (lifetime), Check-ins do mês atual, Sequência atual (dias consecutivos), Status da conta
- **RF-013** — Durante carregamento, exibir skeleton em cada card individualmente
- **RF-014** — A sequência deve contar dias consecutivos com ao menos 1 check-in validado, regressivamente a partir de hoje (ou ontem, se hoje não houver check-in validado)

### F-05 — Gráfico de Frequência Semanal

Gráfico de barras mostrando o padrão de treino por dia da semana.

**Requisitos funcionais:**
- **RF-015** — Exibir barras para cada dia da semana (Dom–Sáb) com a contagem de check-ins daquele dia
- **RF-016** — O cálculo deve considerar todos os check-ins disponíveis no histórico carregado
- **RF-017** — O gráfico deve exibir tooltip com contagem ao hover

### F-06 — Heatmap de Atividade

Calendário visual dos últimos 90 dias indicando intensidade de check-ins por dia.

**Requisitos funcionais:**
- **RF-018** — Exibir grid de 13 semanas × 7 dias cobrindo os últimos 90 dias
- **RF-019** — Cada célula deve ter 5 níveis de intensidade: 0 check-ins, 1, 2, 3, 4 ou mais
- **RF-020** — Células devem exibir tooltip com data e contagem ao hover
- **RF-021** — Dias sem dados devem ter aparência distinta de dias com 0 check-ins (fora do período histórico disponível vs. dia sem treino)

### F-07 — Timeline de Últimos Check-ins

Lista vertical com os 5 check-ins mais recentes.

**Requisitos funcionais:**
- **RF-022** — Exibir: nome da academia, data/hora relativa e badge de status (Validado / Pendente / Rejeitado)
- **RF-023** — Badge de status deve ter cor semântica: verde (validado), amarelo (pendente), vermelho (rejeitado)
- **RF-024** — Exibir link "Ver todos" direcionando para `/check-ins`
- **RF-025** — Quando não houver check-ins, exibir empty state com mensagem orientativa

### F-08 — Gráfico de Status (Donut)

Distribuição proporcional dos check-ins por status.

**Requisitos funcionais:**
- **RF-026** — Exibir gráfico rosca com proporção de check-ins: Validado, Pendente, Rejeitado
- **RF-027** — Exibir legenda com label, cor e contagem absoluta para cada status
- **RF-028** — Quando todos os check-ins forem de um único status, o gráfico deve renderizar corretamente

### F-09 — Estados de Carregamento e Erro

**Requisitos funcionais:**
- **RF-029** — Cada widget deve exibir skeleton independente durante carregamento (sem bloquear a página inteira)
- **RF-030** — Em caso de erro de API, exibir mensagem de erro com botão de retry em cada widget afetado
- **RF-031** — Quando o usuário não possui nenhum check-in, o dashboard deve renderizar com KPIs zerados e empty states nos widgets de histórico

## Experiência do Usuário

**Jornada pós-login:**
1. Usuário faz login → redirecionado para `/inicio`
2. Dashboard carrega progressivamente (skeletons por widget, não loading global)
3. Perfil e KPIs aparecem primeiro (dados mais leves)
4. Gráficos e heatmap aparecem ao completar o carregamento do histórico

**Navegação:**
- Sidebar sempre visível em desktop; hamburger em mobile
- Item "Dashboard" sempre destacado como ativo quando em `/inicio`
- Usuário admin vê seção adicional na sidebar sem qualquer ação extra

**Acessibilidade:**
- Heatmap deve ter aria-label descritivo por célula (data + contagem)
- Gráficos devem ter título e descrição acessíveis via `aria-label`
- Sidebar deve ser navegável por teclado (Tab, Enter)

## Restrições Técnicas de Alto Nível

- Todos os dados devem ser obtidos dos endpoints existentes: `GET /users/me`, `GET /users/metrics`, `GET /check-ins/me`
- Nenhum endpoint novo ou campo novo na API é permitido nesta versão
- Os cálculos de streak, frequência semanal, heatmap e distribuição de status são feitos no cliente
- A biblioteca de gráficos deve ser compatível com o design system shadcn/ui existente
- O dashboard deve funcionar corretamente com histórico vazio (zero check-ins)

## Fora de Escopo

- Novos endpoints ou campos na API
- Notificações push ou atualizações em tempo real
- Exportação de dados de frequência
- Comparativo de desempenho entre membros
- Gamificação (badges, conquistas, rankings)
- Customização de widgets pelo usuário
- Perfil de outras academias ou membros
- Dados de assinatura ou pagamento no dashboard
