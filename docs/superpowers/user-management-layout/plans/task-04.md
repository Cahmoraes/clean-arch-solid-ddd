# Task 4: Adaptar detalhe para drawer responsivo e restauração de foco [FR-012, FR-013, FR-014]

**Status:** PENDING
**PRD:** `../prd/prd-user-management-layout.md`
**Spec:** `../specs/user-management-layout-design.md`
**Tier:** standard
**Depends on:** task-02

## Visão Geral

Três gaps reais na apresentação split-view desktop / drawer mobile:

1. **Breakpoint errado**: `useIsDesktop` usa `(min-width: 768px)`, mas a PRD (FR-012/FR-013) e
   a spec definem 1024px como o limiar entre split-view e drawer. Como `page.tsx` e
   `UserDetailContainer` decidem seu layout a partir desse hook, o breakpoint incorreto afeta
   os dois.
2. **Proporção do grid errada** (FR-012): o grid split-view usa
   `md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]` (~45/55%, e no breakpoint errado). A spec e o
   mockup curado (`../specs/mockups/user-management-layout-visual.md`) pedem ~40/60% a partir
   de 1024px.
3. **Drawer mobile e retorno de foco** (FR-013/FR-014): o detalhe mobile hoje usa o `Dialog`
   genérico (modal centralizado), não o `Sheet` (drawer lateral) que a spec descreve para
   mobile; e ao fechar o drawer, o foco do teclado se perde — não retorna para a linha da
   lista que originou a abertura, quebrando a navegação por teclado para usuários que dependem
   dela.

Esta task corrige as três coisas em sequência: primeiro o breakpoint (infraestrutura
compartilhada por FR-012 e FR-013), depois a proporção do grid (FR-012), depois a conversão
para `Sheet` com retorno de foco (FR-013/FR-014).

## Arquivos

- Modify: `apps/frontend/src/lib/hooks/use-is-desktop.ts`
- Modify: `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-detail/user-detail-container.tsx`
- Test: `apps/frontend/src/lib/hooks/use-is-desktop.test.tsx`
- Test: `apps/frontend/src/app/(authenticated)/admin/usuarios/page.test.tsx`
- Test: `apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx`
- Test: `apps/frontend/src/features/admin/components/user-detail/user-detail-container.test.tsx`

### Conformidade com as Skills Padrão

- `tailwindcss`: troca de todas as classes responsivas de `md:` para `lg:` (breakpoint 1024px
  no Tailwind v4 padrão) e ajuste da fração do grid (`minmax(0,0.4fr)_minmax(0,0.6fr)`).
- `shadcn`: substituição do primitive `Dialog` pelo `Sheet` (ambos shadcn/Radix) para o
  detalhe mobile, incluindo o uso do callback de ciclo de vida `onCloseAutoFocus` do
  `SheetContent`.
- `ui-ux-pro-max`: validação de que a nova proporção ~40/60% e o breakpoint 1024px atendem à
  responsividade e densidade descritas na spec e no mockup.
- `vercel-react-best-practices`: o retorno de foco é implementado com uma `ref` (
  `lastUserIdRef`) e um callback de ciclo de vida do Radix, evitando chamadas síncronas de
  `.focus()` que seriam sobrescritas pela própria gestão de foco do `FocusScope` do Radix
  durante a animação de fechamento.
- `typescript-advanced`: a nova prop opcional `onDrawerClosed?: (userId: string) => void` é
  tipada e propagada por `UserDetailContainerProps` e pelos props internos de `MobileView`.
- `playwright-cli`: os testes de componente cobrem os três breakpoints-chave (768px via
  `isDesktopMock.mockReturnValue(false)`, 1024px+ via `mockReturnValue(true)`); uma checagem
  E2E direcionada nesses viewports pode ser feita com esta skill caso se deseje validação de
  ponta a ponta além do nível de componente.
- `vitest` / `test-antipatterns`: cada mudança tem um teste que falha antes e passa depois,
  verificando comportamento observável (classes CSS renderizadas, foco do DOM, papel
  `dialog`), nunca detalhes de implementação do Radix.

## Passos

### Ciclo 1 — Breakpoint desktop: 768px → 1024px (infraestrutura para FR-012/FR-013)

- **Step 1: Write the failing test**

Em `use-is-desktop.test.tsx`, adicionar um teste que fixa a media query real usada pelo hook:

```tsx
test("consulta a media query a partir do breakpoint de 1024px (lg:)", () => {
  mockMatchMedia(true)
  renderHook(() => useIsDesktop())
  expect(window.matchMedia).toHaveBeenCalledWith("(min-width: 1024px)")
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/lib/hooks/use-is-desktop.test.tsx`
Expected: FAIL — `window.matchMedia` foi chamado com `"(min-width: 768px)"`, não
`"(min-width: 1024px)"`.

- **Step 3: Write minimal implementation**

Em `use-is-desktop.ts`:

```ts
const DESKTOP_QUERY = "(min-width: 1024px)"
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/lib/hooks/use-is-desktop.test.tsx`
Expected: PASS — os 5 testes do arquivo passam (os 4 pré-existentes continuam válidos porque
testam o comportamento do hook via `mockMatchMedia`, independente do valor literal da query).

### Ciclo 2 — Proporção do split-view ~40/60% a partir de 1024px (FR-012)

- **Step 1: Write the failing test**

Em `page.test.tsx`, adicionar:

```tsx
test("FR-012: grid split-view usa proporção ~40/60 a partir do breakpoint de 1024px (lg:)", async () => {
  server.use(
    http.get(`${apiBaseUrl}/users`, () =>
      HttpResponse.json(
        {
          users: [userFixture("u1", 1)],
          pagination: { page: 1, limit: 10, total: 1 },
        },
        { status: 200 },
      ),
    ),
  )
  renderPage()

  const grid = await screen.findByTestId("admin-users-grid")
  expect(grid.className).toContain(
    "lg:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)]",
  )
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run "src/app/(authenticated)/admin/usuarios/page.test.tsx"`
Expected: FAIL — não existe elemento com `data-testid="admin-users-grid"` (o wrapper do grid
não tem esse hook de teste) e a classe atual é `md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]`.

- **Step 3: Write minimal implementation**

Em `page.tsx`, no wrapper do grid mestre-detalhe:

```tsx
<div
  data-testid="admin-users-grid"
  className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)]"
>
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run "src/app/(authenticated)/admin/usuarios/page.test.tsx"`
Expected: PASS — todos os testes do arquivo passam, incluindo o novo teste FR-012.

### Ciclo 3 — Drawer mobile via Sheet + retorno de foco à linha de origem (FR-013/FR-014)

- **Step 1: Write the failing test**

Em `user-detail-container.test.tsx`, atualizar as duas asserções que checam as classes
responsivas do wrapper desktop (`md:` → `lg:`, coerente com o Ciclo 1):

```tsx
test("no desktop, aplica classes de posicionamento sticky ao wrapper do UserDetailPanel", () => {
  isDesktopMock.mockReturnValue(true)
  const { container } = renderContainer(buildUser())
  const wrapper = container.firstChild as HTMLElement
  expect(wrapper.className).toContain("lg:self-start")
  expect(wrapper.className).toContain("lg:sticky")
  expect(wrapper.className).toContain("lg:top-4")
  expect(wrapper.className).toContain("lg:max-h-[calc(100vh-2rem)]")
  expect(wrapper.className).toContain("lg:overflow-y-auto")
})

test("no desktop sem usuário (EmptyState), wrapper tem classe self-start e sticky", () => {
  isDesktopMock.mockReturnValue(true)
  const { container } = renderContainer(null)
  const wrapper = container.firstChild as HTMLElement
  expect(wrapper.className).toContain("lg:self-start")
  expect(wrapper.className).toContain("lg:sticky")
})
```

Em `admin-users-page.test.tsx`, adicionar o teste de retorno de foco, reutilizando
`mockUsersList`/`renderPage` disponibilizados pela task-02:

```tsx
test("FR-014: ao fechar o drawer mobile, o foco retorna para a linha de origem", async () => {
  isDesktopMock.mockReturnValue(false)
  const user = userEvent.setup()
  mockUsersList()
  renderPage()

  const rowButton = within(
    await screen.findByTestId("user-row-user-1"),
  ).getByRole("button")
  await user.click(rowButton)

  expect(screen.getByRole("dialog")).toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: /close/i }))

  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
  expect(rowButton).toHaveFocus()
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/admin/components/user-detail/user-detail-container.test.tsx`
Expected: FAIL — as classes ainda são `md:*`, não `lg:*`.

Run: `pnpm --filter frontend exec vitest run "src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx"`
Expected: FAIL — `rowButton` não recupera o foco após o fechamento do `Dialog`; nada no
código atual devolve foco a uma linha específica.

- **Step 3: Write minimal implementation**

Em `user-detail-container.tsx`, trocar `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/
`DialogDescription` por `Sheet`/`SheetContent`/`SheetHeader`/`SheetTitle`/`SheetDescription`,
ajustar as classes `md:` → `lg:` do `DesktopView`, adicionar a prop `onDrawerClosed` e o
rastreio do último usuário exibido:

```tsx
import { useEffect, useRef } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export interface UserDetailContainerProps {
  user: AdminUser | null
  onClose: () => void
  onUserPatched?: (patch: Partial<AdminUser>) => void
  onDrawerClosed?: (userId: string) => void
}

// DesktopView: trocar "md:self-start md:sticky md:top-4 md:max-h-[calc(100vh-2rem)] md:overflow-y-auto"
// por "lg:self-start lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
// (nas duas ocorrências: EmptyState e o card com UserDetailPanel).

function MobileView({
  user,
  onClose,
  onUserPatched,
  onDrawerClosed,
}: {
  user: AdminUser | null
  onClose: () => void
  onUserPatched?: (patch: Partial<AdminUser>) => void
  onDrawerClosed?: (userId: string) => void
}) {
  // FR-014: guarda o último usuário exibido para devolver o foco à linha de
  // origem quando o Radix efetivamente desmontar o conteúdo (onCloseAutoFocus),
  // já que nesse momento `user` (prop) já pode ter voltado a `null`.
  const lastUserIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (user) lastUserIdRef.current = user.id
  }, [user])

  return (
    <Sheet
      open={user !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent
        className="w-full overflow-y-auto sm:max-w-md"
        onCloseAutoFocus={(event) => {
          // Assumimos o controle do foco pós-fechamento: o Radix não conhece
          // a linha que abriu o drawer (Sheet controlado, sem `SheetTrigger`),
          // então delegamos ao chamador via `onDrawerClosed`.
          event.preventDefault()
          if (lastUserIdRef.current) onDrawerClosed?.(lastUserIdRef.current)
        }}
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Detalhes do usuário</SheetTitle>
          <SheetDescription>
            Visualize os dados da conta e execute ações administrativas.
          </SheetDescription>
        </SheetHeader>
        {user ? (
          <UserDetailPanel
            user={user}
            onClose={onClose}
            onUserPatched={onUserPatched}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

export function UserDetailContainer({
  user,
  onClose,
  onUserPatched,
  onDrawerClosed,
}: UserDetailContainerProps) {
  const isDesktop = useIsDesktop()
  if (isDesktop) {
    return (
      <DesktopView user={user} onClose={onClose} onUserPatched={onUserPatched} />
    )
  }
  return (
    <MobileView
      user={user}
      onClose={onClose}
      onUserPatched={onUserPatched}
      onDrawerClosed={onDrawerClosed}
    />
  )
}
```

Em `page.tsx`, propagar `focusRow` (já existente desde a task-02) como o novo callback:

```tsx
<UserDetailContainer
  user={activeSelectedUser}
  onClose={handleModalClose}
  onUserPatched={handleUserPatched}
  onDrawerClosed={focusRow}
/>
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/features/admin/components/user-detail/user-detail-container.test.tsx`
Expected: PASS — todos os testes do arquivo passam com as classes `lg:*`.

Run: `pnpm --filter frontend exec vitest run "src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx"`
Expected: PASS — o teste FR-014 passa: `rowButton` recupera o foco depois que o `Sheet`
termina de fechar (`getByRole("dialog")` deixa de existir e `toHaveFocus()` é satisfeito).

- **Step 5: Commit** *(sequential execution only — em uma wave paralela o orquestrador
  commita na barreira de integração; se seu prompt indicar que você é um de vários
  implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos)*

```bash
git add apps/frontend/src/lib/hooks/use-is-desktop.ts apps/frontend/src/lib/hooks/use-is-desktop.test.tsx \
  "apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx" \
  "apps/frontend/src/app/(authenticated)/admin/usuarios/page.test.tsx" \
  "apps/frontend/src/app/(authenticated)/admin/usuarios/admin-users-page.test.tsx" \
  apps/frontend/src/features/admin/components/user-detail/user-detail-container.tsx \
  apps/frontend/src/features/admin/components/user-detail/user-detail-container.test.tsx
git commit -m "fix(admin-users): corrigir breakpoint/proporção do split-view e converter detalhe mobile em drawer com retorno de foco"
```

## Critérios de Sucesso

- FR-012: em viewport >= 1024px, lista e detalhe aparecem em split-view com colunas
  `minmax(0,0.4fr)`/`minmax(0,0.6fr)` (~40/60%) — coberto por
  `"FR-012: grid split-view usa proporção ~40/60 a partir do breakpoint de 1024px (lg:)"`.
- FR-013: em viewport menor que 1024px, o detalhe é apresentado em um `Sheet` (drawer) sem
  perder o usuário selecionado — coberto pelos testes existentes de `user-detail-container.test.tsx`
  que verificam `role="dialog"` no mobile (papel preservado pela conversão Dialog→Sheet) e
  pelo teste pré-existente `"no mobile, exibe o painel em Dialog e fecha no botão X"` em
  `admin-users-page.test.tsx`, que continua passando sem alteração de comportamento externo.
- FR-014: fechar o drawer mobile devolve o foco à linha da lista que o abriu — coberto por
  `"FR-014: ao fechar o drawer mobile, o foco retorna para a linha de origem"`.
- Cobertura de viewport: os testes de componente cobrem explicitamente mobile (`isDesktopMock`
  retornando `false`, equivalente a <1024px, incluindo 375px/768px) e desktop (`true`,
  >=1024px); nenhum teste de E2E multi-viewport foi criado nesta task — se desejado, pode ser
  adicionado depois com a skill `playwright-cli` sem alterar o contrato aqui validado.
