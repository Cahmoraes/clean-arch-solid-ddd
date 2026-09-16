# Task 2: Implementar seleção persistente e navegação da lista [FR-005, FR-006, FR-007, FR-008]

**Status:** DONE
**PRD:** `../prd/prd-user-management-layout.md`
**Spec:** `../specs/user-management-layout-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

A lista de usuários (`page.tsx`) já realça a linha selecionada e permite clique para trocar a
seleção (FR-005/FR-006). Faltam dois comportamentos exigidos pela spec de layout mestre-detalhe
(seção "Navegação"): FR-007 — mover a seleção com `ArrowUp`/`ArrowDown` deve também mover o foco
visível do teclado para a linha correspondente (hoje `handleListKeyNavigation` só troca o estado
`selectedUser`, sem chamar `.focus()`) — e FR-008 — no desktop, quando a lista carrega com
resultados e nenhum usuário está selecionado (nem por clique, nem por `?userId=` na URL), o
primeiro usuário da página deve ser selecionado automaticamente para que o painel de detalhe não
fique vazio no primeiro carregamento. O `?userId=` existente tem precedência: quando a URL
informa um usuário, o auto-select do primeiro item não pode sobrescrever a seleção do deep-link.
Este auto-select é restrito ao desktop (`useIsDesktop`):
no mobile a apresentação do detalhe é um `Sheet` sob demanda, então selecionar automaticamente
abriria o drawer sem ação do administrador.

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`
- Test: `apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx`
- Test: `apps/frontend/src/app/(authenticated)/admin/usuarios/page.test.tsx`

### Conformidade com as Skills Padrão

- `vercel-react-best-practices`: o auto-select roda em um `useEffect` com dependências
  explícitas (`isDesktop`, `data?.users`, `selectedUser`) e sem causar loop de re-render (só
  seta estado quando ainda não há seleção); `focusRow` usa uma `ref` para DOM, não estado.
- `typescript-advanced`: `focusRow(userId: string)` e o parâmetro `event: KeyboardEvent<HTMLDivElement>`
  reaproveitam os tipos já existentes no arquivo, sem introduzir `any`.
- `tanstack-query-best-practices`: o efeito de auto-select depende de `data?.users` vindo do
  `useUsers` (react-query) — a condição `!data?.users?.length` evita rodar antes dos dados
  chegarem ou disparar com uma lista vazia.
- `vitest` / `test-antipatterns`: os testes novos verificam comportamento observável via
  Testing Library (`aria-pressed`, `toHaveFocus`, papéis de aba), não estado interno; os
  testes pré-existentes que ficaram ambíguos por causa do novo texto duplicado (painel +
  lista) foram escopados com `within(...)` em vez de `getByText` global.

## Passos

- **Step 1: Write the failing test**

Em `admin-users-page.test.tsx`, substituir o teste `"não exibe o painel de detalhes
inicialmente"` (que assumia que nada é selecionado por padrão) por dois testes que capturam o
novo comportamento — um para lista com resultados (auto-seleção) e um para lista vazia (sem
seleção possível) — e adicionar o teste de navegação por teclado:

```tsx
test("FR-008: seleciona automaticamente o primeiro usuário quando há resultados e nenhum estava selecionado", async () => {
  mockUsersList()
  renderPage()

  await waitFor(() => {
    expect(screen.getByTestId("admin-users-list")).toBeInTheDocument()
  })
  expect(screen.getByRole("tab", { name: "Detalhes" })).toBeInTheDocument()
  expect(
    within(screen.getByTestId("user-row-user-1")).getByRole("button"),
  ).toHaveAttribute("aria-pressed", "true")
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
})

test("preserva o usuário indicado por ?userId= mesmo quando ele não é o primeiro resultado", async () => {
  mockUsersList([
    buildUser(),
    buildUser({ id: "user-2", name: "Carlos Lima", email: "carlos@example.com" }),
  ])
  window.history.pushState({}, "", "/admin/usuarios?userId=user-2")
  renderPage()

  await waitFor(() => {
    expect(
      within(screen.getByTestId("user-row-user-2")).getByRole("button"),
    ).toHaveAttribute("aria-pressed", "true")
  })
  expect(
    within(screen.getByTestId("user-row-user-1")).getByRole("button"),
  ).toHaveAttribute("aria-pressed", "false")
})

test("não exibe o painel de detalhes quando não há resultados", async () => {
  mockUsersList([])
  renderPage()

  await waitFor(() => {
    expect(screen.getByText(/nenhum usuário cadastrado/i)).toBeInTheDocument()
  })
  expect(screen.getByText(/selecione um usuário/i)).toBeInTheDocument()
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
})

test("FR-007: ArrowDown move a seleção e o foco visível para a próxima linha da lista", async () => {
  const user = userEvent.setup()
  mockUsersList([
    buildUser(),
    buildUser({ id: "user-2", name: "Carlos Lima", email: "carlos@example.com" }),
  ])
  renderPage()

  const row1Button = within(
    await screen.findByTestId("user-row-user-1"),
  ).getByRole("button")
  row1Button.focus()

  await user.keyboard("{ArrowDown}")

  const row2Button = within(screen.getByTestId("user-row-user-2")).getByRole(
    "button",
  )
  expect(row2Button).toHaveAttribute("aria-pressed", "true")
  expect(row2Button).toHaveFocus()
  expect(row1Button).toHaveAttribute("aria-pressed", "false")

  await user.keyboard("{ArrowUp}")

  expect(row1Button).toHaveAttribute("aria-pressed", "true")
  expect(row1Button).toHaveFocus()
})
```

Em `page.test.tsx`, escopar duas asserções que ficam ambíguas (o e-mail passa a aparecer tanto
na lista quanto, potencialmente, no painel de detalhe auto-selecionado):

```tsx
expect(
  within(screen.getByTestId("admin-users-list")).getByText("user1@example.com"),
).toBeInTheDocument()
// ...
await waitFor(() =>
  expect(
    within(screen.getByTestId("admin-users-list")).getByText("user2@example.com"),
  ).toBeInTheDocument(),
)
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run "src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx"`
Expected: FAIL — o teste FR-008 falha porque nenhuma linha vem com `aria-pressed="true"` sem
clique prévio (não há auto-seleção); o teste FR-007 falha porque `ArrowDown` troca
`aria-pressed` mas `row2Button` não recebe foco (`handleListKeyNavigation` não chama
`.focus()`).

- **Step 3: Write minimal implementation**

Em `page.tsx`, importar `useIsDesktop`, adicionar `listContainerRef`, o efeito de auto-seleção
restrito ao desktop, a função `focusRow`, e chamar `focusRow` a partir da navegação por
teclado:

```tsx
import { useIsDesktop } from "@/lib/hooks/use-is-desktop"

// ... dentro de AdminUsersContent:
const listContainerRef = useRef<HTMLDivElement>(null)
const isDesktop = useIsDesktop()
const initialUserId = searchParams.get("userId")

// FR-008: seleciona o primeiro usuário quando há resultados e nenhum
// usuário está selecionado. A seleção por ?userId= tem precedência para
// preservar deep-links mesmo quando o usuário não é o primeiro resultado.
// Restrito ao desktop: no mobile a apresentação é sob demanda (drawer),
// então selecionar automaticamente abriria o drawer sem ação do usuário.
useEffect(() => {
  if (
    !isDesktop ||
    initialUserId ||
    selectedUser ||
    !data?.users?.length
  ) {
    return
  }
  setSelectedUser(data.users[0])
}, [isDesktop, initialUserId, data?.users, selectedUser])

function focusRow(userId: string) {
  const row = listContainerRef.current?.querySelector<HTMLElement>(
    `[data-testid="user-row-${userId}"] [role="button"]`,
  )
  row?.focus()
}

function handleListKeyNavigation(event: KeyboardEvent<HTMLDivElement>) {
  const list = data?.users
  if (!isArrowKey(event.key) || !list || list.length === 0) return
  event.preventDefault()
  const nextIndex = resolveNextIndex(list, activeSelectedUser, event.key)
  const nextUser = list[nextIndex]
  setSelectedUser(nextUser)
  focusRow(nextUser.id)
}

// no JSX, atribuir a ref ao container que recebe o onKeyDown:
// biome-ignore lint/a11y/noStaticElementInteractions: navegação por teclado entre linhas da lista
<div ref={listContainerRef} onKeyDown={handleListKeyNavigation}>
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run "src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx" "src/app/(authenticated)/admin/usuarios/page.test.tsx"`
Expected: PASS — todos os testes dos dois arquivos passam, incluindo os três novos/reescritos
(FR-008 com resultados, sem resultados, e FR-007 navegação por teclado).

- **Step 5: Commit** *(sequential execution only — em uma wave paralela o orquestrador
  commita na barreira de integração; se seu prompt indicar que você é um de vários
  implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos)*

```bash
git add "apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx" "apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx" "apps/frontend/src/app/(authenticated)/admin/usuarios/page.test.tsx"
git commit -m "feat(admin-users): auto-selecionar primeiro usuário e mover foco na navegação por teclado"
```

## Critérios de Sucesso

- FR-005/FR-006: a linha selecionada continua realçada visualmente e a troca de seleção por
  clique continua funcionando — cobertura pré-existente sem regressão (nenhum teste de
  clique/realce foi alterado nesta task).
- FR-007: `ArrowDown`/`ArrowUp` movem a seleção **e** o foco do teclado para a linha
  correspondente — coberto por `"FR-007: ArrowDown move a seleção e o foco visível para a
  próxima linha da lista"`.
- FR-008: com resultados e nenhuma seleção prévia, o primeiro usuário é selecionado
  automaticamente no desktop — coberto por `"FR-008: seleciona automaticamente o primeiro
  usuário quando há resultados e nenhum estava selecionado"`; com lista vazia, nenhuma
  seleção é forçada — coberto por `"não exibe o painel de detalhes quando não há
  resultados"`.
