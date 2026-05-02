# Task 7.0 — Code Review (F3 Academias)

**Reviewer:** task-reviewer (sub-agent)
**Date:** 2025-01 (current session)
**Scope:** `apps/frontend/src/features/gyms/**`, `apps/frontend/src/app/(authenticated)/academias/**`, `apps/frontend/src/app/(authenticated)/admin/academias/nova/**`, `apps/frontend/src/test/msw/handlers.ts`

---

## Resumo executivo

✅ Implementação completa de F3 (busca paginada de academias, detalhe + botão de check-in placeholder, formulário admin de cadastro).

- **Build/typecheck:** `pnpm tsc:check` → ✅ sem erros
- **Lint:** `pnpm lint` → ✅ sem erros
- **Testes:** `pnpm test` → ✅ 150/150 (23 novos testes em gyms)

Nenhuma classificação **CRITICAL** ou **MAJOR** restante após a passagem do reviewer.

---

## Findings

### Positives ✅

1. **Separação de responsabilidades** — hooks (`useGymsByName`, `useGymById`, `useCreateGym`) extraídos como funções puras (`searchGymsByName`, `fetchGymById`, `createGymRequest`); páginas decompostas em sub-componentes (`GymResults`, `GymPagination`, `GymCard`, `DetailCard`, `DetailLoading`, `DetailError`, `DetailBody`).
2. **Conformidade com `tanstack-query-best-practices`** — `queryKey` factory (`gymsKeys`), `enabled` para gating de queries dependentes de input, `invalidateQueries` em `useCreateGym.onSuccess` para revalidar listagens.
3. **Conformidade com `zod`** — `createGymSchema` valida CNPJ (14 dígitos, apenas números), telefone numérico opcional, nome trim+min/max, lat/lng com bounds.
4. **Conformidade com `no-workarounds`** — 404 (no gyms found) tratado via `ApiError.status === 404` retornando lista vazia, não como hack. Tipos extras para endpoints fora da spec OpenAPI documentados em `extendedPaths.ts` com comentário e plano de remoção quando spec for regenerada.
5. **Acessibilidade** — `aria-labelledby`, `sr-only` labels, `role="alert"` em mensagens de erro de form (via `FormField`), `aria-disabled` em controles de paginação.
6. **EmptyState reutilizado** em três contextos (sem busca, sem resultados, erro) conforme RF-25.
7. **Skeleton** durante loading (RF-23), mensagem amigável em erro de rede via `ApiError.userMessage` (RF-24).
8. **AdminGuard** já protegia `/admin/*` (task 4.0); a página `nova/` herda do layout admin sem alterações cruzadas (RF-22).

### Major

_(nenhum encontrado)_

### Critical

_(nenhum encontrado)_

### Minor (registrados, não bloqueantes)

1. **GET /gyms/{id} fora da OpenAPI spec** — `extendedPaths.ts` define o tipo localmente. Comentário explica que deve ser removido quando `@repo/api-types` for regenerado. Não afeta auth nem error handling pois o middleware é path-agnóstico.
2. **Botão de check-in desabilitado** — intencional; lógica chega na task 8.0 (F4). `data-testid="gym-detail-checkin"` já presente para a task 8 plugar handler.
3. **Paginação heurística** — backend de search retorna apenas array; "próxima página" é habilitada quando `items.length >= RESULTS_PER_PAGE`. É a única estratégia possível com a resposta atual.

---

## Critérios de Sucesso (verificação)

| Critério | Status |
|---|---|
| Busca por nome retorna lista paginada | ✅ |
| Trocar página atualiza resultados sem reload | ✅ (page state em React; hook re-fetch automático) |
| Busca sem resultados exibe `EmptyState` | ✅ (handler 404 + items.length===0) |
| Tela de detalhes exibe todos os campos | ✅ |
| Botão de check-in visível | ✅ (disabled, lógica em 8.0) |
| Formulário admin envia dados e redireciona | ✅ (`router.replace(/academias/{id})`) |
| MEMBER bloqueado em `/admin/academias/nova` | ✅ (via `AdminGuard` no layout) |

---

## Arquivos compartilhados modificados

- `apps/frontend/src/test/msw/handlers.ts` — handlers MSW de gyms ajustados para devolver shape correto (`/gyms/search/:name` agora retorna array, `/gyms/:id` retorna objeto Gym, `POST /gyms` retorna `{message,id}`).

Nenhum outro arquivo fora de `src/features/gyms/**` ou `src/app/(authenticated)/(admin/)?academias/**` foi tocado.

---

## Decisão

**APROVADO.** Sem itens CRITICAL/MAJOR a resolver. Pronto para merge / próximas tasks.
