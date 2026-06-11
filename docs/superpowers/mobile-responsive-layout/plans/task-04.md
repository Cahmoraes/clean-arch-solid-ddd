# Task 4: Member check-ins — corrigir espaçamento filtro/busca [FR-008]

**Status:** DONE
**PRD:** `../prd/prd-mobile-responsive-layout.md`
**Spec:** `../specs/mobile-responsive-layout-design.md`
**Depends on:** N/A

## Visão Geral

Na tela de check-ins do membro, `CheckInFilterBar` e a linha busca/ordenação são irmãos diretos no `PageContainer`, criando um gap maior que o padrão `gap-3` entre eles. A correção envolve envolver os dois em um único `div` com `flex flex-wrap items-center gap-3`, espelhando o padrão da tela admin.

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/check-ins/page.tsx`

### Conformidade com as Skills Padrão

- no-workarounds: solução CSS pura, sem hook de layout

## Passos

- **Step 1: Localizar a seção a modificar no arquivo**

Abrir `apps/frontend/src/app/(authenticated)/check-ins/page.tsx` e localizar as linhas (aproximadamente 177–190):

```tsx
<CheckInFilterBar
  status={status}
  onStatusChange={setStatus}
  stats={statsData}
/>

<div className="flex gap-3">
  <CheckInSearchInput
    value={gymNameInput}
    onChange={setGymNameInput}
    placeholder="Buscar por academia..."
  />
  <CheckInSortToggle value={sortOrder} onValueChange={setSortOrder} />
</div>
```

- **Step 2: Substituir as duas seções por um container unificado**

Trocar as linhas acima por:

```tsx
<div className="flex flex-wrap items-center gap-3">
  <CheckInFilterBar
    status={status}
    onStatusChange={setStatus}
    stats={statsData}
  />
  <div className="flex flex-1 gap-2 min-w-0">
    <CheckInSearchInput
      value={gymNameInput}
      onChange={setGymNameInput}
      placeholder="Buscar por academia..."
      className="flex-1"
    />
    <CheckInSortToggle value={sortOrder} onValueChange={setSortOrder} />
  </div>
</div>
```

> **Por que `flex-1 min-w-0`:** garante que o input de busca + sort ocupem o espaço restante na linha quando o FilterBar (desktop inline) e a busca cabem na mesma linha em viewports intermediárias. `min-w-0` evita overflow do flex item.

- **Step 3: Rodar lint e typecheck**

```bash
pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check
```

Expected: zero erros

- **Step 4: Verificar que nenhum teste existente quebrou**

```bash
pnpm --filter frontend test -- src/app
```

Expected: todos os testes passam (ou "no test files found" caso não haja testes na pasta app)

- **Step 5: Commit**

```bash
cd apps/frontend
git add src/app/\(authenticated\)/check-ins/page.tsx
git commit -m "fix(check-ins): align filter/search spacing to gap-3 pattern

Envolve CheckInFilterBar e linha busca/sort em container
flex-wrap gap-3, espelhando o padrão da tela admin.
Elimina o gap excessivo na visão de membro.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- FR-008: `CheckInFilterBar` e linha busca/sort na página membro estão no mesmo container `flex flex-wrap items-center gap-3`
- Espaçamento entre filtro e busca é visualmente equivalente ao da tela admin (`gap-3`)
- `pnpm --filter frontend tsc:check` sem erros
- Nenhum teste existente quebrou
