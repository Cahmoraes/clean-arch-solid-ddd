---
created_at: "2026-05-27T23:40:14-03:00"
updated_at: "2026-05-27T23:40:14-03:00"
---

# QA Report — Users List Filters

## Resumo
- **Status**: ✅ APROVADO
- **PRD**: `../prd/prd-users-list-filters.md`
- **Total de Histórias de Usuário**: 6
- **Histórias Aprovadas**: 6 / 6
- **Total de Requisitos**: 20 (RF-001 a RF-020)
- **Requisitos Atendidos**: 20 / 20
- **Bugs Encontrados**: 0 (falhas pré-existentes não relacionadas listadas em observações)

---

## Histórias de Usuário Verificadas

| US | História | Status | Evidência |
|----|----------|--------|-----------|
| US-001 | Layout com mesma largura das outras listagens | ✅ PASSOU | Análise estática: `max-w-3xl` idêntico em `/admin/usuarios` e `/check-ins` |
| US-002 | Ver total de usuários por categoria no topo | ✅ PASSOU | `user-filter-bar.test.tsx` (5 testes) + `use-user-stats.test.tsx` (2 testes) + acceptance test RF-004 |
| US-003 | Filtrar lista por categoria selecionando tab | ✅ PASSOU | `use-users.test.tsx` (5 testes filter) + `fetch-users.business-flow-test.ts` (5 testes backend) |
| US-004 | Combinar filtro de categoria com busca por texto | ✅ PASSOU | `fetch-users.usecase.test.ts` + acceptance test frontend simultâneo |
| US-005 | Paginação reiniciada ao trocar filtro | ✅ PASSOU | 3 acceptance tests (`handleFilterChange` → `setPage(1)`) |
| US-006 | Contadores refletem após promover/rebaixar | ✅ PASSOU | 4 testes RF-016 em `use-promote-to-admin.test.tsx` e `use-demote-from-admin.test.tsx` |

---

## Requisitos Verificados

| ID | Requisito | Status | Evidência |
|----|-----------|--------|-----------|
| RF-001 | Container com largura máxima equivalente à página de check-ins | ✅ PASSOU | `page.tsx` L272: `mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6` |
| RF-002 | Barra com cinco categorias: Todos, Membros, Administradores, Ativos, Inativos | ✅ PASSOU | `user-filter-bar.test.tsx` — 5 tabs renderizadas |
| RF-003 | Badge numérico por categoria | ✅ PASSOU | `user-filter-bar.test.tsx` — valores 48/41/7/45/3 no DOM |
| RF-004 | Contadores independentes da paginação | ✅ PASSOU | `useUserStats` chama `GET /users/stats` independente de `GET /users`; acceptance test confirmado |
| RF-005 | Tab "Todos" selecionada por padrão | ✅ PASSOU | `useState<UserFilter>("all")` em `page.tsx` L224 |
| RF-006 | Apenas uma categoria ativa por vez | ✅ PASSOU | Controlled component; `aria-pressed=true` em um único botão |
| RF-007 | Tab "Membros" → role=MEMBER | ✅ PASSOU | `use-users.test.tsx` + `fetch-users.business-flow-test.ts` |
| RF-008 | Tab "Administradores" → role=ADMIN | ✅ PASSOU | `use-users.test.tsx` + `fetch-users.business-flow-test.ts` |
| RF-009 | Tab "Ativos" → status=active | ✅ PASSOU | `use-users.test.tsx` + `fetch-users.business-flow-test.ts` |
| RF-010 | Tab "Inativos" → status=inactive | ✅ PASSOU | `use-users.test.tsx` + `fetch-users.business-flow-test.ts` |
| RF-011 | Tab "Todos" remove filtro | ✅ PASSOU | `use-users.test.tsx` — sem role/status quando filter='all' |
| RF-012 | Trocar filtro reseta paginação para página 1 | ✅ PASSOU | `handleFilterChange` → `setPage(1)`; 3 acceptance tests passando |
| RF-013 | Filtro categoria + busca texto combinados | ✅ PASSOU | `use-users.ts`: `buildFilterParams` spread + `params.query` na mesma requisição |
| RF-014 | Endpoint `GET /users/stats` retorna totais por categoria | ✅ PASSOU | `get-user-stats.business-flow-test.ts` — 3 testes HTTP |
| RF-015 | Endpoint protegido — apenas ADMIN | ✅ PASSOU | Business-flow: 401 sem token, 403 para MEMBER |
| RF-016 | Contadores atualizados após promoção/rebaixamento | ✅ PASSOU | `onSettled` invalida `USER_STATS_QUERY_KEY` em promote, demote, activate, suspend |
| RF-017 | Backend aceita parâmetro `role` opcional | ✅ PASSOU | `fetch-users.business-flow-test.ts` — role=MEMBER/ADMIN |
| RF-018 | Backend aceita parâmetro `status` opcional | ✅ PASSOU | `fetch-users.business-flow-test.ts` — status=active/inactive |
| RF-019 | Sem filtros → comportamento preservado (todos os usuários) | ✅ PASSOU | Testes existentes de listagem sem filtro continuam passando |
| RF-020 | Filtros role/status combinados com busca por texto | ✅ PASSOU | `fetch-users.usecase.test.ts` — query "joão" + role MEMBER |

---

## Testes Executados

| Suíte | Resultado | Observações |
|-------|-----------|-------------|
| `user-filter-bar.test.tsx` (5 testes) | ✅ PASSOU | RF-002, RF-003, RF-005, RF-006 |
| `use-user-stats.test.tsx` (2 testes) | ✅ PASSOU | RF-004 parcial |
| `use-users.test.tsx` (9 testes de filtro) | ✅ PASSOU | RF-007 a RF-011, RF-013 |
| `get-user-stats.business-flow-test.ts` (3 testes) | ✅ PASSOU | RF-014, RF-015 |
| `fetch-users.business-flow-test.ts` (5 novos testes) | ✅ PASSOU | RF-017, RF-018, RF-019 |
| `fetch-users.usecase.test.ts` (6 novos testes) | ✅ PASSOU | RF-020 |
| `get-user-stats.usecase.test.ts` (4 testes) | ✅ PASSOU | RF-014 unitário |
| Acceptance tests criados pelo QA Gate | ✅ PASSOU | RF-004, RF-012, RF-013, RF-016 |

---

## Acessibilidade
- [x] `aria-pressed` implementado nos botões de filtro (`aria-pressed="true"` na tab ativa)
- [x] `aria-label` nos botões para leitores de tela
- [x] `fieldset` com `aria-label="Filtrar usuários por categoria"`
- [ ] Contraste do badge sobre botão ativo não verificado por ferramenta WCAG — recomendado inspecionar visualmente antes do merge (badge `bg-muted text-muted-foreground` sobre `variant="primary"`)

---

## Bugs Encontrados

Nenhum bug relacionado à feature encontrado.

**Falhas pré-existentes** (não relacionadas a `users-list-filters`):
- Backend: timeouts de bcrypt em testes de `change-password`, `reset-password`, `authenticate` (teste lento por design, pré-existente)
- Frontend: `admin-users-page.test.tsx` e `perfil/senha/page.test.tsx` com falhas de setup MSW (pré-existentes, não introduzidas por esta feature)

---

## Conclusão

Feature `users-list-filters` aprovada para merge. Todos os 6 user stories e 20 requisitos funcionais verificados com evidência de teste. Zero falhas introduzidas por esta feature. Única ressalva pendente: verificação visual de contraste do badge de contagem no estado ativo do filtro (não bloqueante).
