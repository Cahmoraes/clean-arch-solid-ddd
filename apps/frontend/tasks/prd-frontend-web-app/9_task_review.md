# Review — Tarefa 9.0: F5 Assinatura Demo

**Status final:** ✅ APROVADA — sem achados CRITICAL ou MAJOR pendentes.

## Escopo revisado

- `apps/frontend/src/features/subscriptions/schemas/index.ts` (novo)
- `apps/frontend/src/features/subscriptions/api/useCreateSubscription.ts` (novo)
- `apps/frontend/src/features/subscriptions/api/useCreateSubscription.test.tsx` (novo)
- `apps/frontend/src/app/(authenticated)/assinatura/page.tsx` (novo)
- `apps/frontend/src/app/(authenticated)/assinatura/page.test.tsx` (novo)
- `apps/frontend/src/test/msw/handlers.ts` (handler `POST /subscriptions` retorna payload tipado)

## Critérios da Tarefa

| Critério | Status | Evidência |
| --- | --- | --- |
| Aviso de "fluxo demonstrativo / sem cobrança" visível antes do clique | ✅ | `<DemoBanner />` renderizado 2× na página + teste `exibe aviso de demonstração visível sem interação` |
| Botão exibe loading durante a chamada | ✅ | `aria-busy={isPending}` + texto "Processando…" + teste `mostra estado de loading no botão durante a chamada` |
| Sucesso exibe dados da subscription (mínimo: id) | ✅ | `<Confirmation>` com `subscription.subscriptionId` e `status` + teste `envia priceId do plano selecionado e exibe confirmação com id retornado` |
| Erro exibe mensagem amigável | ✅ | `subscriptionErrorMessage()` mapeia `ApiError.userMessage` + teste `exibe mensagem amigável quando o backend falha` |
| Mutation não é retentada automaticamente | ✅ | `useMutation({ retry: 0, … })` + teste explícito `não retenta automaticamente em caso de falha` (verifica `calls === 1`) |

## Resultados de Testes

- `pnpm vitest run src/features/subscriptions src/app/(authenticated)/assinatura` → **8/8 passaram**
- `pnpm test` (suite completa do app) → **149/149 passaram, 37/37 arquivos**
- `pnpm tsc:check` → sem erros nos arquivos da feature 9 (erros pré-existentes em `admin/academias/nova/page.tsx` não foram tocados — fora de escopo)
- `pnpm lint` → sem erros nos arquivos da feature 9

## Achados por Severidade

### CRITICAL — 0

Nenhum.

### MAJOR — 0

Nenhum (após correções aplicadas durante a implementação).

### MINOR — 2

1. **MINOR — paymentMethodId fictício hard-coded no client**
   `DEMO_PAYMENT_METHOD_ID = "pm_demo_card_visa"` é enviado a cada submit. Aceitável no escopo demonstrativo do PRD (F5 declara "Stripe fictício, sem integração real"), mas se o backend evoluir para validar o token Stripe contra a API real, o valor falhará. Mitigação possível futura: chave de feature flag para alternar para Stripe Elements quando disponível.
2. **MINOR — Schema response valida apenas mínimo {subscriptionId, status}**
   `createSubscriptionResponseSchema` aceita strings não vazias. Se o backend acrescentar campos (ex.: `currentPeriodEnd`), o componente não os exibirá. Sem impacto funcional para a Tarefa 9.

### POSITIVE — 5

1. **Aviso de demonstração reforçado em duas posições** (topo e logo acima do botão de submit). Garante visibilidade na rolagem em telas pequenas conforme RF-20.
2. **`useCreateSubscription` valida o payload de resposta com Zod** antes de retornar — evita confiar em `data` cru do `openapi-fetch` e gera erro `ApiError(502, "invalid_response")` amigável caso o backend regrida.
3. **`mutationKey` exportada (`["subscriptions", "create"]`)** permite coordenação futura (ex.: `useIsMutating`) sem strings duplicadas.
4. **PlanCard usa `<input type="radio">` real envelopado em `<label>`** — atende a regra `lint/a11y/useSemanticElements` e mantém suporte nativo a navegação por teclado e leitores de tela.
5. **Hook de fluxo (`useSubscriptionFlow`) extrai estado/efeitos** — reduz a complexidade cognitiva do componente principal e facilita futuros testes isolados.

## Conformidade com Skills

| Skill | Status |
| --- | --- |
| `tanstack-query-best-practices` — `retry: 0` na mutation, `mutationKey` estável, `reset()` ao trocar plano | ✅ |
| `typescript-advanced` — tipos derivados via `paths` (`@repo/api-types`) e `z.infer` para inputs/respostas | ✅ |
| `test-antipatterns` — testes usam apenas MSW + Testing Library, sem mocks de módulos da feature | ✅ |
| `no-workarounds` — sem `as any`, sem `eslint-disable`/`biome-ignore`; o único `catch {}` documentado preserva o erro via `useMutation.error` | ✅ |
| `zod` — schemas com mensagens em PT-BR e parsing seguro (`safeParse`) | ✅ |
| `ui-ux-pro-max` — DESIGN.md respeitado (rounded-full, monocromático, sem sombras), `aria-busy`, `role="alert"`, `aria-live` | ✅ |
| `tdd` — testes redigidos junto com a implementação cobrindo aviso, loading, sucesso, erro e ausência de retry | ✅ |

## Arquivos compartilhados modificados

- `src/test/msw/handlers.ts` — atualizou o stub default de `POST /subscriptions` para retornar `{ subscriptionId, status }` (antes retornava `{}`). Necessário porque outras suites podem disparar essa rota e o schema agora exige campos válidos. Mudança backward-compatible.

Nenhum arquivo de navegação compartilhada foi alterado (o item `/assinatura` em `AuthenticatedShell.NAV_ITEMS` já existia desde a Task 4).

## Bloqueadores

Nenhum.
