---
created_at: "2026-05-30T19:37:25-03:00"
updated_at: "2026-05-30T19:37:25-03:00"
---

# PRD: Badges, Busca por Academia e Ordenação em Check-ins

## Visão Geral

Usuários autenticados e administradores da plataforma de academias não conseguem ver rapidamente quantos check-ins existem em cada categoria de status, nem filtrar a lista por academia ou alterar a ordem cronológica. Isso força navegar cegamente entre filtros e rolar listas sem contexto.

Esta feature adiciona três melhorias à tela de check-ins — tanto para membros (`/check-ins`) quanto para administradores (`/admin/check-ins`): contagem de totais por status visível nos próprios pills de filtro, campo de busca por nome de academia e controle de ordenação (mais recentes / mais antigos).

---

## Objetivos

1. **Reduzir a carga cognitiva** ao trocar filtros — o usuário vê os totais antes de clicar.
2. **Localizar check-ins de uma academia específica** sem precisar rolar toda a lista.
3. **Controlar a ordem de leitura** — quem precisa do check-in mais antigo pode acessar sem paginar do fim para o início.

---

## Histórias de Usuário

### US-01 — Ver contagem por status
**Como** membro ou admin autenticado,
**Eu quero** ver o total de check-ins de cada status diretamente nos pills de filtro (ex.: "Pendentes (12)"),
**Para que** eu saiba quantos itens existem em cada categoria antes de selecionar um filtro.

### US-02 — Buscar check-ins por academia
**Como** membro ou admin autenticado,
**Eu quero** digitar o nome de uma academia em um campo de busca e ver apenas os check-ins daquela academia,
**Para que** eu encontre rapidamente check-ins de um local específico sem percorrer a lista completa.

### US-03 — Ordenar por data
**Como** membro ou admin autenticado,
**Eu quero** alternar a ordenação da lista entre "Mais recentes" e "Mais antigos",
**Para que** eu possa ler o histórico na ordem que faz mais sentido para o meu contexto.

### US-04 — Preservar filtros na URL
**Como** membro ou admin autenticado,
**Eu quero** que o nome buscado, o filtro de status, a ordenação e a página sejam refletidos na URL,
**Para que** eu possa compartilhar, favoritar ou retornar à mesma visualização pelo botão voltar do browser.

### US-05 — Resultados vazios contextuais
**Como** membro ou admin autenticado,
**Eu quero** ver uma mensagem de estado vazio que indique que nenhum resultado foi encontrado para a busca ou filtro ativos,
**Para que** eu entenda que a lista está vazia por conta dos filtros aplicados, não por um erro.

---

## Funcionalidades Principais

### F-01 — Badges de contagem nos pills de filtro

Cada pill de filtro de status exibe o total de check-ins correspondente ao lado do label.

**Requisitos funcionais:**

- **RF-001**: O sistema deve exibir, ao lado de cada pill de status, o total de check-ins daquela categoria para o usuário autenticado (membro: apenas os próprios; admin: todos).
- **RF-002**: Os totais devem ser calculados independentemente do filtro de status ativo — o badge de "Pendentes" deve mostrar o total real mesmo quando o filtro "Aprovados" estiver selecionado.
- **RF-003**: O pill "Todos" deve exibir o total geral de check-ins.
- **RF-004**: Enquanto os totais estiverem sendo carregados, os pills devem ser exibidos sem badge (sem skeleton para evitar layout shift).
- **RF-005**: Os dados de contagem devem ser considerados frescos por no mínimo 30 segundos (evitar requisições redundantes ao navegar entre filtros).

---

### F-02 — Busca por nome de academia

Campo de texto que filtra os check-ins pelo nome da academia, enviando a query ao backend.

**Requisitos funcionais:**

- **RF-006**: O sistema deve exibir um campo de busca textual com placeholder "Buscar por academia...".
- **RF-007**: A busca deve ser parcial e case-insensitive — digitar "fit" deve retornar check-ins de "Academia Fit", "SmartFit" e "FitDance".
- **RF-008**: A query de busca deve ser enviada ao backend apenas após 300ms de inatividade (debounce), evitando requisições em cada keystroke.
- **RF-009**: Ao alterar o campo de busca, a paginação deve ser resetada para a página 1.
- **RF-010**: O campo deve exibir um botão de limpar (ícone X) quando contiver texto.
- **RF-011**: O valor da busca deve ser refletido na URL como parâmetro `gymName`.

---

### F-03 — Ordenação por data

Toggle que alterna a ordenação da lista entre mais recentes e mais antigos.

**Requisitos funcionais:**

- **RF-012**: O sistema deve exibir um botão toggle com ícone e label indicando a ordenação ativa: "↕ Mais recentes" (padrão) ou "↕ Mais antigos".
- **RF-013**: A ordenação padrão ao acessar a tela deve ser "Mais recentes" (`sortOrder=desc`).
- **RF-014**: Ao alternar a ordenação, a paginação deve ser resetada para a página 1.
- **RF-015**: O valor da ordenação deve ser refletido na URL como parâmetro `sortOrder` (`asc` ou `desc`).
- **RF-016**: Um valor inválido de `sortOrder` na URL deve ser ignorado e tratado como `desc`.

---

### F-04 — Preservação de estado na URL

**Requisitos funcionais:**

- **RF-017**: Os parâmetros `status`, `page`, `gymName` e `sortOrder` devem ser sincronizados com a URL sem criar novas entradas no histórico de navegação — voltar no browser deve levar à página anterior, não ao estado anterior dos filtros.
- **RF-018**: Ao carregar a página com parâmetros válidos na URL, os filtros, busca e ordenação devem ser aplicados automaticamente.
- **RF-019**: Quando a lista estiver vazia por conta de filtros ou busca ativos, o sistema deve exibir uma mensagem de estado vazio que indique os critérios aplicados (ex.: "Nenhum check-in encontrado para 'SmartFit' com status Pendente").

---

## Experiência do Usuário

### Jornada principal — membro buscando check-in de uma academia

1. Membro abre `/check-ins` e vê os pills com os totais: "Todos (8)", "Pendentes (2)", "Aprovados (5)", "Rejeitados (1)"
2. Digita "smart" no campo de busca → após 300ms, a lista exibe apenas check-ins da SmartFit
3. Clica no pill "Aprovados" → lista filtra por academia + status aprovado simultaneamente
4. Clica no toggle para "Mais antigos" → lista reordena; página reseta para 1

### Jornada principal — admin revisando pendências

1. Admin abre `/admin/check-ins`; pills mostram totais globais: "Pendentes (47)"
2. Clica em "Pendentes" → lista filtra; badge dos outros pills mantém seus totais reais
3. Digita o nome de uma academia para localizar check-ins de uma unidade específica
4. Compartilha a URL — o colega abre e vê exatamente a mesma visualização filtrada

### Layout

```
[Todos (42)] [Pendentes (12)] [Aprovados (25)] [Rejeitados (5)]

[🔍 Buscar por academia...]              [↕ Mais recentes]

──── lista ──────────────────────────────────────────────
< 1  2  3 ... >
```

---

## Restrições Técnicas de Alto Nível

- A busca por academia deve funcionar em conjunto com o filtro de status e a paginação existentes — todos os parâmetros são combinados na mesma requisição ao backend.
- Os endpoints de stats devem respeitar o escopo do usuário autenticado: membros recebem contagens apenas dos próprios check-ins; admins recebem contagens globais.
- A feature deve funcionar nas duas telas sem duplicação de lógica de negócio — componentes e hooks compartilhados onde aplicável.
- Nenhuma mudança no schema do banco de dados é necessária — o join com a tabela de academias já existe via relações Prisma.

---

## Fora de Escopo

- Filtro por intervalo de datas
- Busca por nome de usuário ou CPF
- Ordenação por campos além de `createdAt` (ex.: por status, por academia)
- Exportação da lista filtrada (CSV, PDF)
- Notificações em tempo real ao receber novos check-ins na tela
- Aplicação mobile (somente web)
