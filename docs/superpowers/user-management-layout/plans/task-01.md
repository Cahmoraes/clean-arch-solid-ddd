# Task 1: Refinar filtros segmentados e busca de usuários [FR-001, FR-002, FR-003, FR-004]

**Status:** PENDING
**PRD:** `../prd/prd-user-management-layout.md`
**Spec:** `../specs/user-management-layout-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

`UserFilterBar` já implementa a maior parte de FR-001..FR-004: o `SegmentedControl` desktop
aplica o filtro imediatamente (FR-001/FR-002 com contadores), a busca já debounça 500ms e
reinicia a paginação (FR-003), e selecionar um usuário no detalhe já preserva filtro e busca
(FR-004 — comportamento existente, sem regressão a corrigir).

O gap real está na versão mobile do filtro: o `Sheet` de filtros mantém um estado `pendingFilter`
local e só chama `onFilterChange` quando o administrador toca em "Aplicar". Isso contradiz a
decisão D2 da spec (`SegmentedControl` = filtro que se aplica imediatamente à mesma lista, não
uma seleção adiada como uma aba). Esta task remove o padrão pendente/Aplicar: qualquer seleção
dentro do `Sheet` mobile chama `onFilterChange` na hora e fecha o `Sheet`, igualando o
comportamento desktop.

## Arquivos

- Modify: `apps/frontend/src/features/admin/components/user-filter-bar.tsx`
- Test: `apps/frontend/src/features/admin/components/user-filter-bar.test.tsx`

### Conformidade com as Skills Padrão

- `shadcn`: o `Sheet` e o `SegmentedControl` usados aqui são primitives shadcn/Radix; a
  remoção do estado pendente precisa manter `onOpenChange`/`onValueChange` compondo do jeito
  que esses primitives esperam.
- `tailwindcss`: o botão "Limpar" passa de `flex-1` (par com "Aplicar") para `w-full`
  (ação única) — ajuste de classes Tailwind v4 sem introduzir novos tokens.
- `vercel-react-best-practices`: eliminar o estado local `pendingFilter` que só existia para
  atrasar uma atualização já disponível via prop (`activeFilter`) é remover state derivável
  desnecessário.
- `typescript-advanced`: `selectFilter(filter: UserFilter)` reaproveita o mesmo union type
  `UserFilter` já usado em `UserFilterBarProps`, sem criar tipos novos.
- `vitest` / `test-antipatterns`: o teste novo verifica o comportamento observável (o
  `Sheet` fecha e `onFilterChange` é chamado com o valor clicado), não o estado interno
  removido.

## Passos

- **Step 1: Write the failing test**

Substituir o teste que assume o padrão "Aplicar" por um teste que expõe o comportamento
correto (aplicar instantâneo + fechar o `Sheet`), em
`apps/frontend/src/features/admin/components/user-filter-bar.test.tsx`:

```tsx
import { render, screen, waitFor, within } from "@testing-library/react"
// ... (demais imports inalterados)

describe("UserFilterBar — mobile sheet", () => {
  // ... demais testes já existentes permanecem ...

  test("FR-001: seleção no Sheet mobile aplica o filtro imediatamente (sem botão Aplicar)", async () => {
    const onFilterChange = vi.fn()
    render(
      <UserFilterBar
        activeFilter="all"
        stats={STATS}
        onFilterChange={onFilterChange}
      />,
    )
    await userEvent.click(
      screen.getByRole("button", { name: /abrir filtros/i }),
    )
    const dialog = screen.getByRole("dialog")
    await userEvent.click(
      within(dialog).getByRole("button", { name: /membros/i }),
    )
    expect(onFilterChange).toHaveBeenCalledWith("member")
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })
})
```

Remover o teste antigo `"chama onFilterChange com pendingFilter ao clicar em Aplicar"` (ele
descreve o comportamento que está sendo eliminado).

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/admin/components/user-filter-bar.test.tsx`
Expected: FAIL — `expect(onFilterChange).toHaveBeenCalledWith("member")` recebe 0 chamadas,
porque clicar em "Membros" dentro do `Sheet` hoje só atualiza o `pendingFilter` local; é
necessário clicar em "Aplicar" para dispará-lo.

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/features/admin/components/user-filter-bar.tsx`, remover o estado
`pendingFilter` e os handlers `openSheet`/`applyFilter`/`clearFilter`, substituindo por uma
única função que aplica e fecha:

```tsx
export function UserFilterBar({
  activeFilter,
  stats,
  onFilterChange,
  className,
}: UserFilterBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false)

  function selectFilter(filter: UserFilter) {
    onFilterChange(filter)
    setSheetOpen(false)
  }

  return (
    <>
      {/* Desktop: inline filter bar */}
      <div className="hidden w-full md:block">
        <SegmentedControl
          aria-label="Filtrar usuários por categoria"
          items={buildItems(stats)}
          value={activeFilter}
          onValueChange={onFilterChange}
          className={cn("w-full", className)}
          countFloat={stats !== undefined}
        />
      </div>

      {/* Mobile: botão + Sheet */}
      <div className="flex items-center gap-2 md:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSheetOpen(true)}
          aria-label="Abrir filtros"
        >
          <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
          Filtros
        </Button>
        {activeFilter !== "all" && (
          <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
            {FILTER_LABEL[activeFilter]}
          </span>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="pb-8">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-4">
            <SegmentedControl
              aria-label="Selecionar filtro de usuários"
              items={buildItems(stats)}
              value={activeFilter}
              onValueChange={selectFilter}
              countFloat={stats !== undefined}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => selectFilter("all")}
            >
              Limpar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/features/admin/components/user-filter-bar.test.tsx`
Expected: PASS — todos os 12 testes do arquivo passam, incluindo o novo teste FR-001 e o
teste pré-existente `"chama onFilterChange com all ao clicar em Limpar"` (agora cobre o
mesmo `selectFilter("all")`).

- **Step 5: Commit** *(sequential execution only — em uma wave paralela o orquestrador
  commita na barreira de integração; se seu prompt indicar que você é um de vários
  implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos)*

```bash
git add apps/frontend/src/features/admin/components/user-filter-bar.tsx apps/frontend/src/features/admin/components/user-filter-bar.test.tsx
git commit -m "fix(admin-users): aplicar filtro mobile imediatamente ao selecionar"
```

## Critérios de Sucesso

- FR-001: selecionar uma categoria no `Sheet` mobile chama `onFilterChange` imediatamente e
  fecha o `Sheet`, sem exigir um botão "Aplicar" — coberto pelo novo teste
  `"FR-001: seleção no Sheet mobile aplica o filtro imediatamente (sem botão Aplicar)"`.
- FR-002: contagem por categoria continua exibida quando `stats` está disponível e ausente
  durante o loading — já coberto por `"deve exibir os contadores em cada tab quando stats
  estão presentes"` e `"não deve exibir badges quando stats são undefined (loading)"`, sem
  regressão.
- FR-003: busca por nome/e-mail com debounce de 500ms reiniciando a paginação — já coberto
  por `"não dispara busca antes do debounce de 500ms"` em `admin-users-page.test.tsx`, sem
  regressão.
- FR-004: selecionar um usuário no detalhe preserva o filtro ativo e a consulta de busca —
  comportamento existente (nenhum efeito em `page.tsx` limpa `activeFilter`/`inputQuery` ao
  selecionar), sem regressão introduzida por esta task.
