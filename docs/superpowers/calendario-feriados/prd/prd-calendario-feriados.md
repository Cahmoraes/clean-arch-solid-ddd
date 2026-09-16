---
created_at: "2026-09-12T18:51:29-03:00"
updated_at: "2026-09-12T18:51:29-03:00"
---

# PRD: Calendário de Feriados Nacionais

## Visão Geral

Usuários autenticados hoje não têm, dentro da aplicação, uma forma de visualizar os feriados nacionais do Brasil. Esta feature adiciona uma nova página de calendário mensal que destaca visualmente os feriados nacionais, permitindo consultar qualquer mês/ano sem sair da aplicação e sem depender de disponibilidade de uma API externa.

## Objetivos

- Usuários autenticados conseguem identificar, em uma grade mensal, quais dias do mês vigente (ou de qualquer outro mês/ano) são feriados nacionais.
- A feature funciona de forma independente de rede/disponibilidade externa (feriados calculados localmente).
- A grade do calendário atende ao padrão de acessibilidade AA já exigido pelo projeto.

## Histórias de Usuário

- **US-01** — Como usuário autenticado, eu quero ver uma grade de calendário mensal com os feriados nacionais destacados, para que eu identifique rapidamente os feriados do mês.
- **US-02** — Como usuário autenticado, eu quero navegar entre meses e anos no calendário, para que eu consulte feriados de outros períodos além do mês atual.
- **US-03** — Como usuário autenticado, eu quero ver o nome do feriado ao interagir com um dia destacado, para que eu saiba qual feriado é aquele dia.

## Funcionalidades Principais

**Exibição da grade mensal com feriados destacados**
- O que faz: mostra o mês atual em formato de grade de calendário, com os dias de feriado nacional visualmente diferenciados dos demais.
- Por que importa: dá visibilidade imediata aos feriados sem precisar consultar uma fonte externa.
- Como funciona (alto nível): os feriados nacionais do ano exibido são calculados localmente no frontend.

- **FR-001** (US-01) — O sistema deve exibir uma grade de calendário mensal, iniciando no mês/ano atual ao acessar a rota.
- **FR-002** (US-01) — O sistema deve destacar visualmente todo dia que seja feriado nacional do Brasil dentro do mês exibido.
- **FR-003** (US-01) — O sistema deve calcular os feriados nacionais localmente, sem depender de uma chamada de rede ou de um endpoint de backend.
- **FR-007** (US-01) — A rota do calendário deve exigir que o usuário esteja autenticado.

**Navegação entre períodos**
- O que faz: permite trocar o mês e o ano exibidos.
- Por que importa: feriados de meses/anos futuros ou passados também são consultáveis.
- Como funciona (alto nível): controles de navegação avançam/retrocedem o mês e permitem selecionar outro ano.

- **FR-004** (US-02) — O sistema deve permitir navegar para o mês anterior e para o mês seguinte a partir do mês exibido.
- **FR-005** (US-02) — O sistema deve permitir selecionar um ano diferente do atual, atualizando os feriados destacados para o ano selecionado.

**Identificação do feriado**
- O que faz: revela o nome do feriado ao interagir com o dia destacado.
- Por que importa: o destaque visual sozinho não diz qual feriado é.
- Como funciona (alto nível): a interação com um dia destacado exibe o nome do feriado.

- **FR-006** (US-03) — Ao interagir (hover ou clique) com um dia destacado como feriado, o sistema deve exibir o nome do feriado correspondente.

**Acessibilidade**
- **FR-008** (US-01, US-02, US-03) — A grade do calendário deve ser navegável por teclado e expor rótulos acessíveis (incluindo o nome do feriado, quando presente) para leitores de tela.

## Experiência do Usuário

Fluxo principal: o usuário autenticado acessa a página do calendário, vê o mês atual com os feriados nacionais já destacados, pode avançar/retroceder mês ou trocar de ano, e ao passar o mouse ou tocar em um dia destacado vê o nome do feriado em um popover/tooltip. Não há um mockup visual curado nesta feature (a companion visual foi recusada durante o brainstorming); o layout segue o padrão de grade de calendário do componente `Calendar` do design system do projeto. Acessibilidade (navegação por teclado, rótulos para leitor de tela) é requisito, não um extra.

## Restrições Técnicas de Alto Nível

- **Acessibilidade (AA/WCAG):** a grade deve ser navegável por teclado e ter rótulos acessíveis — critério mensurável: dias com `aria-label` incluindo o nome do feriado quando houver.
- **Manutenibilidade:** a feature deve ficar isolada, sem introduzir acoplamento com outras áreas do produto — critério mensurável: 100% dos arquivos novos dentro do módulo próprio da feature.
- **Testabilidade:** a lógica de cálculo de feriados deve ser coberta por testes automatizados — critério mensurável: cobertura de teste unitário na lógica de obtenção e mapeamento de feriados.
- **Sem novas integrações externas:** os feriados não dependem de uma API externa nem de um novo endpoint de backend.

## Fora de Escopo

- Feriados estaduais e municipais.
- Backend/endpoint próprio para servir feriados.
- Notificações sobre feriados próximos.
- Integração com agendas externas (Google Calendar e similares).
- Feriados extraordinários decretados por lei avulsa fora do calendário nacional recorrente (limitação conhecida da fonte de dados, aceita no design).
