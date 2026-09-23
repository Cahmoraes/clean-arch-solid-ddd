# Tarefas: Vínculo Plano-Assinatura-Usuário

**Spec:** `../specs/subscription-plan-link-design.md`
**PRD:** `../prd/prd-subscription-plan-link.md`

**Tech Stack:** backend apps/backend: TypeScript · vitest · unit `npx vitest --run --config ./test/vite.config.app-domain.ts <arquivo>`, prisma `npx vitest --run --config ./test/vite.config.integration.ts <arquivo>`, business-flow `npx vitest run --config ./test/vite.config.business-flow.ts <arquivo>`; frontend apps/frontend: Next.js · vitest + happy-dom + MSW · `pnpm --filter frontend exec vitest run <arquivo>`

---

## Tarefas

- [ ] 1. Domínio: campos do plano/período em Subscription, transições e erros [FR-003, FR-010, FR-012, FR-013, FR-014, FR-017] → `task-01.md`
- [ ] 2. Persistência: migration, repositórios e lookups [FR-001, FR-004] → `task-02.md`
- [ ] 3. Gateway: alteração de price da assinatura [FR-009] → `task-03.md`
- [ ] 4. CreateSubscription grava plano e período, encerra vencida [FR-001, FR-002, FR-004, FR-018] → `task-04.md`
- [ ] 5. GET /subscriptions/me [FR-005, FR-006, FR-008, FR-017, FR-019] → `task-05.md`
- [ ] 6. PATCH /subscriptions/me/plan [FR-009, FR-010, FR-012] → `task-06.md`
- [ ] 7. POST /subscriptions/me/cancel [FR-013, FR-014, FR-016] → `task-07.md`
- [ ] 8. Regenerar tipos da API em @repo/api-types → `task-08.md`
- [ ] 9. Frontend: hooks e handlers MSW da assinatura [FR-005, FR-006] → `task-09.md`
- [ ] 10. Frontend: tela /assinatura com plano vigente, troca e cancelamento [FR-007, FR-010, FR-011, FR-015, FR-019] → `task-10.md`

## Restrições Globais

- `currentPeriodStart`, `currentPeriodEnd`: instantes UTC (ISO 8601 na API); o frontend formata no fuso do navegador como data (dia).
- `currentPeriodEnd` = `currentPeriodStart` + 1 mês (`Plan.billing_period = MONTHLY`) ou + 1 ano (`YEARLY`), calculado localmente (decisão "só escrita local").
- No máximo uma assinatura ativa por usuário (guarda no use case + índice único parcial em `user_id` onde a assinatura está ativa).
- `GET /plans` não muda.
- Cancelar duas vezes: idempotente, retorna a assinatura com `cancelAtPeriodEnd = true`.
- Tela desatualizada que tente trocar após cancelamento agendado recebe erro `SubscriptionCancellationScheduledError` (HTTP 409) e o frontend recarrega a assinatura.
- `GET /subscriptions/me` sem assinatura: 200 com `null` (estado normal da tela, não erro).

## Foco de Revisão

- Fim de período em 31 de janeiro, plano mensal → resultado clampa para o último dia de fevereiro, nunca transborda para março → `task-01`
- `isExpired` exatamente em `currentPeriodEnd` → vencida (agora >= fim) e um instante antes não vencida → `task-01`
- Duas criações concorrentes para o mesmo usuário → uma vence, a outra falha com conflito pelo índice único, nunca duas ativas → `task-02`
- `priceId` de plano inativado ao assinar → recusado como plano não encontrado, sem chamar o gateway → `task-04`
- Falha do gateway na troca de plano → erro visível, `planId` local inalterado → `task-06`
