# Task 5: Integrar estados, anúncios acessíveis e cobertura final da página [FR-015, FR-016]

**Status:** PENDING
**PRD:** `../prd/prd-user-management-layout.md`
**Spec:** `../specs/user-management-layout-design.md`
**Tier:** standard
**Depends on:** task-01, task-02, task-03, task-04

## Visão Geral

FR-016 (estados de carregamento, erro, vazio e paginação) já está integralmente implementado
e coberto por testes existentes em `page.test.tsx` (`"exibe Skeleton durante o carregamento e
depois lista"`, `"exibe EmptyState quando lista está vazia"`, `"navega entre páginas via
paginação"`, `"exibe mensagem de erro amigável em falha de rede"`) — nenhum código novo é
necessário para esse FR, apenas confirmação de que ele continua funcionando após as tasks
1-4.

O gap real é FR-015: não existe hoje nenhuma região `aria-live` na página de usuários que
anuncie, para tecnologia assistiva, quantos usuários foram encontrados ou qual usuário está
selecionado — mudanças de filtro/busca/seleção só são percebidas visualmente. Esta task
adiciona essa região e, como fechamento da feature, um teste E2E que percorre o fluxo
completo (login → busca → seleção → detalhe → fechamento no mobile), reaproveitando os
helpers de E2E já existentes (`loginViaUi`, `provisionUser`).

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`
- Test: `apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx`
- Create: `apps/frontend/e2e/admin-user-management-layout.spec.ts`

### Conformidade com as Skills Padrão

- `vercel-react-best-practices`: `buildLiveAnnouncement` é uma função pura extraída do JSX
  (fácil de testar/ler), calculada a cada render a partir de props já existentes
  (`isLoading`, `data?.pagination.total`, `activeSelectedUser`), sem estado adicional.
- `typescript-advanced`: assinatura tipada
  `buildLiveAnnouncement(isLoading: boolean, total: number | undefined, selectedUser: AdminUser | null): string`,
  reaproveitando o tipo `AdminUser` já importado no arquivo.
- `tanstack-query-best-practices`: a contagem anunciada vem de `data?.pagination.total`
  (react-query), e a mensagem some (`""`) enquanto `isLoading` é verdadeiro, evitando
  anunciar um total desatualizado/transitório.
- `vitest` / `test-antipatterns`: o teste novo verifica o texto anunciado via
  `data-testid` dedicado (evita colisão com a região `role="status"` própria do
  `EmptyState`), não a lógica interna da função.
- `playwright-cli`: o novo teste E2E usa a mesma estrutura de outros specs do diretório
  (`test.describe`/`test`, `loginViaUi`, `provisionUser`, locators por `data-testid`/`role`),
  cobrindo o fluxo ponta a ponta que os testes de componente não alcançam (navegação real de
  página, backend real).
- `ui-ux-pro-max`: a região `aria-live` é `sr-only` (não introduz nenhuma mudança visual),
  preservando a hierarquia/densidade já validadas nas tasks anteriores.

## Passos

- **Step 1: Write the failing test**

Em `admin-users-page.test.tsx`, adicionar:

```tsx
test("FR-015: anuncia a contagem de resultados e a seleção via região aria-live", async () => {
  const user = userEvent.setup()
  mockUsersList(buildManyUsers(2))
  renderPage()

  await screen.findByTestId("user-row-user-1")
  const status = screen.getByTestId("admin-users-live-region")
  expect(status).toHaveTextContent(/2 usuários encontrados/i)

  await user.click(
    within(screen.getByTestId("user-row-user-2")).getByRole("button"),
  )
  expect(status).toHaveTextContent(/usuário 2 selecionado/i)
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run "src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx"`
Expected: FAIL — `screen.getByTestId("admin-users-live-region")` não encontra nenhum
elemento, porque a página não renderiza nenhuma região `aria-live` própria (só a do
`EmptyState`, quando vazio).

- **Step 3: Write minimal implementation**

Em `page.tsx`, adicionar a função de montagem da mensagem e a região `sr-only`:

```tsx
// FR-015: monta a mensagem anunciada por tecnologia assistiva quando a
// contagem de resultados ou a seleção mudam. Vazio durante o carregamento
// para não anunciar um total transitório/desatualizado.
function buildLiveAnnouncement(
  isLoading: boolean,
  total: number | undefined,
  selectedUser: AdminUser | null,
): string {
  if (isLoading || total === undefined) return ""
  const countText = `${total} usuário${total === 1 ? "" : "s"} encontrado${total === 1 ? "" : "s"}.`
  const selectionText = selectedUser ? `${selectedUser.name} selecionado.` : ""
  return [countText, selectionText].filter(Boolean).join(" ")
}
```

```tsx
{/* dentro de AdminUsersContent, antes do grid mestre-detalhe: */}
<div
  role="status"
  aria-live="polite"
  data-testid="admin-users-live-region"
  className="sr-only"
>
  {buildLiveAnnouncement(
    isLoading,
    data?.pagination.total,
    activeSelectedUser,
  )}
</div>
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run "src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx"`
Expected: PASS — o teste FR-015 passa: a região anuncia `"2 usuários encontrados."` após o
carregamento e `"Usuário 2 selecionado."` após o clique na segunda linha.

- **Step 5: Write the E2E flow test**

Criar `apps/frontend/e2e/admin-user-management-layout.spec.ts`, cobrindo o fluxo integrado
descrito na PRD (busca → seleção → detalhe, com fechamento do drawer no mobile), seguindo o
padrão dos specs existentes em `e2e/`:

```ts
import { expect, test } from "@playwright/test"
import { loginViaUi, provisionUser } from "./helpers/auth"

test.describe("Admin gerencia usuários — fluxo integrado", () => {
  test("busca, seleciona e abre o detalhe de um usuário", async ({ page, request }) => {
    const admin = await provisionUser(request, { role: "ADMIN" })
    const member = await provisionUser(request, { role: "MEMBER" })
    const memberId = member.id
    if (!memberId) throw new Error("Member id ausente após provisionUser")

    await loginViaUi(page, admin)
    await page.goto("/admin/usuarios")

    await page.getByTestId("admin-users-search").fill(member.email)

    const row = page.getByTestId(`user-row-${memberId}`)
    await expect(row).toBeVisible({ timeout: 15_000 })
    await row.click()

    await expect(page.getByRole("tab", { name: "Detalhes" })).toBeVisible()
    await expect(page.getByText(member.email)).toBeVisible()

    const liveRegion = page.getByTestId("admin-users-live-region")
    await expect(liveRegion).toContainText(/selecionado/i)
  })
})
```

- **Step 6: Run the E2E test to verify it passes**

Run: `pnpm --filter frontend exec playwright test e2e/admin-user-management-layout.spec.ts`
Expected: PASS — o fluxo completo roda contra o backend real (via `provisionUser`/
`loginViaUi`), confirmando busca, seleção e anúncio `aria-live` em conjunto, como validação
final de integração das tasks 1-4.

- **Step 7: Commit** *(sequential execution only — em uma wave paralela o orquestrador
  commita na barreira de integração; se seu prompt indicar que você é um de vários
  implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos)*

```bash
git add "apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx" \
  "apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx" \
  apps/frontend/e2e/admin-user-management-layout.spec.ts
git commit -m "feat(admin-users): anunciar contagem/seleção via aria-live e cobrir o fluxo integrado em E2E"
```

## Critérios de Sucesso

- FR-015: uma região `aria-live="polite"` anuncia a contagem de resultados após o
  carregamento e o nome do usuário selecionado após uma seleção — coberto por
  `"FR-015: anuncia a contagem de resultados e a seleção via região aria-live"` e, em nível
  E2E, pela asserção `liveRegion).toContainText(/selecionado/i)` no novo spec.
- FR-016: estados de carregamento, vazio, erro e paginação continuam corretos após a
  integração das tasks 1-4 — coberto pelos testes pré-existentes em `page.test.tsx`
  (`"exibe Skeleton durante o carregamento e depois lista"`, `"exibe EmptyState quando lista
  está vazia"`, `"navega entre páginas via paginação"`, `"exibe mensagem de erro amigável em
  falha de rede"`), sem nenhuma regressão introduzida por esta task.
- Integração: o spec E2E `admin-user-management-layout.spec.ts` exercita o fluxo completo da
  rota `/admin/usuarios` (login, busca, seleção, visualização do detalhe) contra o backend
  real, servindo como verificação final de que as tasks 1-4 compõem corretamente.
