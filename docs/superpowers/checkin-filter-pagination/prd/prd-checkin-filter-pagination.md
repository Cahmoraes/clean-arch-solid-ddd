---
created_at: "2026-05-20T11:58:26-03:00"
updated_at: "2026-05-20T11:58:26-03:00"
---

# PRD: Filtro e Paginação de Check-ins

## Visão Geral

A tela de check-ins cresce continuamente com o tempo, tornando difícil encontrar check-ins por categoria. Este documento define os requisitos para adicionar filtro por status e paginação nas telas de check-ins do frontend — tanto para o usuário final quanto para o administrador —, melhorando a usabilidade e a navegabilidade da lista.

---

## Objetivos

- Permitir que o usuário visualize seus check-ins segmentados por status em menos de 2 cliques.
- Garantir que a lista nunca exceda 10 itens por página, evitando listas imensas e sem fim.
- Preservar o estado do filtro e da página na URL, possibilitando bookmark, compartilhamento e uso do botão voltar do browser.
- Aplicar a melhoria nas duas telas relevantes: histórico do usuário e painel admin.

---

## Histórias de Usuário

### Usuário final

- **US-01** — Como usuário, eu quero filtrar meus check-ins por status (todos, pendentes, aprovados, rejeitados) para que eu encontre rapidamente os check-ins de uma categoria específica sem precisar percorrer a lista inteira.
- **US-02** — Como usuário, eu quero que a lista de check-ins seja paginada para que a tela não fique sobrecarregada com centenas de itens.
- **US-03** — Como usuário, eu quero que o filtro e a página selecionados sejam preservados na URL para que eu possa voltar à mesma visualização após navegar para outra tela ou compartilhar o link com alguém.
- **US-04** — Como usuário, eu quero ver uma mensagem informativa quando nenhum check-in corresponde ao filtro selecionado para que eu saiba que a lista está vazia intencionalmente.

### Administrador

- **US-05** — Como administrador, eu quero filtrar os check-ins de todos os usuários por status no painel admin para que eu possa focar nas pendências ou auditar aprovações e rejeições de forma eficiente.
- **US-06** — Como administrador, eu quero paginação no painel admin para que eu possa gerenciar grandes volumes de check-ins sem degradação da experiência.

---

## Funcionalidades Principais

### F1 — Filtro por Status (Pills)

Exibição de botões pill acima da lista de check-ins, permitindo selecionar uma categoria por vez.

Categorias disponíveis:
- **Todos** — exibe todos os check-ins independentemente do status
- **Pendentes** — exibe apenas check-ins aguardando validação
- **Aprovados** — exibe apenas check-ins validados
- **Rejeitados** — exibe apenas check-ins rejeitados

**Requisitos funcionais:**

- **RF-001** — O sistema deve exibir 4 pills de filtro (Todos, Pendentes, Aprovados, Rejeitados) acima da lista de check-ins em ambas as telas.
- **RF-002** — Apenas um filtro pode estar ativo por vez.
- **RF-003** — O pill ativo deve ter destaque visual distinto dos inativos.
- **RF-004** — Ao selecionar um filtro diferente do atual, a lista deve ser atualizada para exibir somente check-ins do status selecionado.
- **RF-005** — Ao selecionar "Todos", a lista deve exibir check-ins de todos os status.
- **RF-006** — O filtro ativo deve ser refletido na URL como query param `status` (ex.: `?status=pending`).
- **RF-007** — Ao trocar o filtro, a página deve ser automaticamente resetada para 1.

### F2 — Paginação

Navegação entre páginas da lista de check-ins.

**Requisitos funcionais:**

- **RF-008** — A lista deve exibir no máximo 10 check-ins por página.
- **RF-009** — O componente de paginação deve ser exibido somente quando houver mais de uma página de resultados.
- **RF-010** — O número da página atual deve ser refletido na URL como query param `page` (ex.: `?page=2`).
- **RF-011** — Ao navegar entre páginas, o filtro de status ativo deve ser preservado.

### F3 — Sincronização com URL

Estado de filtro e página persistido na URL.

**Requisitos funcionais:**

- **RF-012** — Ao carregar a página com query params válidos (`status` e/ou `page`), o filtro e a página devem ser aplicados automaticamente.
- **RF-013** — Parâmetros inválidos na URL (`?status=foo`, `?page=abc`) devem ser ignorados e os valores padrão aplicados (`status=undefined` → "Todos", `page=1`).

### F4 — Estado Vazio Contextual

**Requisitos funcionais:**

- **RF-014** — Quando a lista estiver vazia após aplicar um filtro, o sistema deve exibir uma mensagem de estado vazio contextual ao filtro ativo (ex.: "Nenhum check-in pendente encontrado").

---

## Experiência do Usuário

### Jornada — Usuário filtrando check-ins

1. Usuário acessa `/check-ins` e vê a lista completa com o pill "Todos" ativo.
2. Usuário clica em "Pendentes".
3. A URL atualiza para `/check-ins?status=pending&page=1` sem recarregar a página.
4. A lista exibe apenas check-ins pendentes, página 1.
5. Se houver mais de 10 resultados, a paginação aparece abaixo da lista.
6. Usuário navega para a página 2 → URL atualiza para `?status=pending&page=2`.
7. Usuário clica em "Todos" → URL retorna para `?page=1` (sem parâmetro `status`), lista completa.

### Considerações de UX

- A transição entre filtros deve ser fluida — manter os dados anteriores visíveis enquanto os novos carregam (skeleton ou dados anteriores semi-opacos), evitando flash de tela vazia.
- Os pills devem ser responsivos e funcionar bem em telas menores (mobile-first).
- A paginação deve exibir botões de anterior/próxima e números de página.

---

## Restrições Técnicas de Alto Nível

- A implementação é exclusivamente no frontend — nenhuma mudança no backend é necessária.
- O backend já suporta os parâmetros `status` (`pending`, `validated`, `rejected`) e `page` nos endpoints `GET /check-ins/me` e `GET /check-ins`.
- O mapeamento entre label da UI ("Aprovados") e valor da API (`validated`) deve ser tratado no frontend.
- O estado do filtro/página deve ser gerenciado via URL search params do Next.js (não via estado local do React).

---

## Fora de Escopo

- Filtro por intervalo de datas.
- Busca textual por nome de academia.
- Ordenação customizável da lista.
- Mudanças no backend ou na API.
- Exportação da lista filtrada.
- Filtros combinados (status + data simultaneamente) — apenas status por enquanto.
