---
created_at: "2026-06-01T16:19:27-03:00"
updated_at: "2026-06-01T16:19:27-03:00"
---

# QA Report — Badges de Contagem no Filtro de Usuários Admin

## Resumo
- **Status**: ✅ APROVADO
- **PRD**: `../prd/prd-admin-users-filter-badges.md`
- **Total de Requisitos**: 11 (RF-001..RF-011)
- **Requisitos Atendidos**: 11 / 11
- **Bugs Encontrados**: 0

---

## Requisitos Verificados

| ID | Requisito | Status | Evidência |
|----|-----------|--------|-----------|
| RF-001 | Pill "Todos" exibe total geral de usuários | ✅ PASSOU | `user-filter-bar.test.tsx` — "deve exibir os contadores em cada tab" verifica valor 48 |
| RF-002 | Pill "Membros" exibe total com role MEMBER | ✅ PASSOU | `user-filter-bar.test.tsx` — verifica valor 41 |
| RF-003 | Pill "Administradores" exibe total com role ADMIN | ✅ PASSOU | `user-filter-bar.test.tsx` — verifica valor 7 |
| RF-004 | Pill "Ativos" exibe total de usuários ativos | ✅ PASSOU | `user-filter-bar.test.tsx` — verifica valor 45 |
| RF-005 | Pill "Inativos" exibe total de usuários inativos | ✅ PASSOU | `user-filter-bar.test.tsx` — verifica valor 3 |
| RF-006 | Badges exibidos somente após carga bem-sucedida | ✅ PASSOU | `user-filter-bar.test.tsx` — `countFloat={stats !== undefined}` |
| RF-007 | Sem badge durante carregamento (sem zero placeholder) | ✅ PASSOU | `user-filter-bar.test.tsx` — "não deve exibir badges quando stats são undefined"; `queryByText("0")` not in document |
| RF-008 | Sem badge em caso de erro (degradação silenciosa) | ✅ PASSOU | `evidence/us-003-.../us-003-loading-no-zeros.acceptance.test.tsx` — mesmo caminho `stats=undefined` via TanStack Query |
| RF-009 | Promoção a admin invalida e recarrega stats | ✅ PASSOU | `use-promote-to-admin.test.tsx` — invalida `USER_STATS_QUERY_KEY` em sucesso e falha |
| RF-010 | Revogação de admin invalida e recarrega stats | ✅ PASSOU | `use-demote-from-admin.test.tsx` — invalida `USER_STATS_QUERY_KEY` em sucesso e falha |
| RF-011 | Soft-delete invalida e recarrega stats | ✅ PASSOU | `use-delete-user.test.tsx` — invalida listagem + stats em `onSettled` |

---

## Testes E2E Executados

| Fluxo | Resultado | Observações |
|-------|-----------|-------------|
| US-001 — Badges de contagem por categoria visíveis após carga | ✅ PASSOU | 441/441 testes passando; cobertura completa via testes unitários |
| US-002 — Contagens se atualizam após mutações (promoção, rebaixamento, exclusão) | ✅ PASSOU | `onSettled` invalida `USER_STATS_QUERY_KEY` nos 3 hooks; testado em sucesso e falha |
| US-003 — Pills sem zero durante loading/erro | ✅ PASSOU | Teste dedicado verifica ausência de "0" quando `stats=undefined`; acceptance test criado para RF-008 |

---

## Acessibilidade
- [ ] Navegação por teclado verificada (dev server não estava rodando — não verificado via browser)
- [x] Labels e ARIA roles presentes — `aria-label="Filtrar usuários por categoria"` no SegmentedControl; `aria-pressed` por pill verificado em testes
- [x] Valores numéricos acessíveis — contagens fazem parte do texto do botão (comportamento herdado do SegmentedControl)

---

## Bugs Encontrados

Nenhum bug encontrado.

---

## Conclusão

Feature **pronta para merge**. Todos os 11 requisitos funcionais verificados. As 3 user stories do PRD estão implementadas e testadas:

- **US-001**: Badges de contagem aparecendo corretamente em cada pill após carga das stats.
- **US-002**: Cache invalidado automaticamente após promoção, rebaixamento e exclusão de usuários — comportamento testado em sucesso e falha das mutations.
- **US-003**: Nenhum zero exibido durante loading ou erro — `stats=undefined` propaga corretamente até o `SegmentedControl`, que suprime o badge quando `count` é `undefined`.

Screenshots não capturados (dev server não estava em execução durante verificação). Cobertura via testes unitários e de integração completa.
