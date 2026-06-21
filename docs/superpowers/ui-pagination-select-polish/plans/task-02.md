# Task 2: Select de Status/Role — appearance-none + ChevronDown custom

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/ui-pagination-select-polish-design.md`
**Depends on:** N/A

## Visão Geral

`StatusField` e `RoleField` em `details-edit-form.tsx` usam `<select>` nativo sem `appearance-none`. O browser renderiza sua própria seta dropdown com posição e visual inconsistentes entre OSes. A solução: aplicar `appearance-none` para remover a seta nativa, adicionar `w-full pl-4 pr-10` ao select, envolver em `<div className="relative">` e sobrepor `ChevronDown` do lucide-react absolutamente posicionado à direita.

## Arquivos

- Modify: `apps/frontend/src/features/admin/components/user-detail/details-edit-form.tsx`
- Modify (tests): `apps/frontend/src/features/admin/components/user-detail/details-edit-form.test.tsx`

### Conformidade com as Skills Padrão

- `tailwindcss`: `appearance-none`, `relative`, `absolute`, `pointer-events-none`, `pl-4 pr-10`, `-translate-y-1/2` — classes de posicionamento e utilitárias Tailwind v4
- `shadcn`: consistência visual com os outros inputs do design system
- `vercel-react-best-practices`: manter estrutura de subcomponentes (`StatusField`, `RoleField`) sem introduzir estado ou complexidade extra
- `frontend-design`: ícone `text-muted-foreground` e posicionamento `right-3 top-1/2` seguindo escala de espaçamento do design system
- `refactoring`: extração mínima do wrapper `<div className="relative">` em cada campo

### Fidelidade Visual

- **Fonte de design original:** screenshot do usuário (seta nativa visível na imagem)
- **Decisões visuais já tomadas:** ChevronDown de 16×16px, cor `text-muted-foreground`, posição `right-3`, `pointer-events-none` para não bloquear o click no select

## Passos

- **Step 1: Escrever os testes falhando**

Adicionar ao final do `describe("DetailsEditForm")` em `apps/frontend/src/features/admin/components/user-detail/details-edit-form.test.tsx`:

```tsx
test("select de status tem appearance-none e ícone chevron", () => {
  renderForm()
  const statusSelect = screen.getByLabelText("Status")
  expect(statusSelect).toHaveClass("appearance-none")
  expect(statusSelect.parentElement?.querySelector("svg")).toBeInTheDocument()
})

test("select de permissão tem appearance-none e ícone chevron", () => {
  renderForm()
  const roleSelect = screen.getByLabelText("Permissão")
  expect(roleSelect).toHaveClass("appearance-none")
  expect(roleSelect.parentElement?.querySelector("svg")).toBeInTheDocument()
})
```

- **Step 2: Rodar os testes para confirmar que falham**

```bash
pnpm --filter frontend test -- --run "details-edit-form"
```

Esperado: os 2 novos testes falham (select não tem `appearance-none`, sem SVG no parentElement).

- **Step 3: Adicionar import do ChevronDown**

No topo de `apps/frontend/src/features/admin/components/user-detail/details-edit-form.tsx`, adicionar:

```tsx
import { ChevronDown } from "lucide-react"
```

- **Step 4: Modificar StatusField**

Substituir o `<select>` de status pelo bloco com wrapper e ícone:

```tsx
function StatusField({
  status,
  isPending,
  onChange,
}: {
  status: StatusValue
  isPending: boolean
  onChange: (v: StatusValue) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="edit-status"
        className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground"
      >
        Status
      </label>
      <div className="relative">
        <select
          id="edit-status"
          className="h-10 w-full appearance-none rounded-md border border-input bg-background pl-4 pr-10 text-sm text-foreground"
          value={status === "locked" ? "suspended" : status}
          onChange={(e) => onChange(e.target.value as StatusValue)}
          disabled={isPending}
        >
          <option value="activated">Ativo</option>
          <option value="suspended">Inativo</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  )
}
```

- **Step 5: Modificar RoleField**

Substituir o `<select>` de role pelo bloco com wrapper e ícone:

```tsx
function RoleField({
  role,
  isPending,
  onChange,
}: {
  role: RoleValue
  isPending: boolean
  onChange: (v: RoleValue) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="edit-role"
        className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground"
      >
        Permissão
      </label>
      <div className="relative">
        <select
          id="edit-role"
          className="h-10 w-full appearance-none rounded-md border border-input bg-background pl-4 pr-10 text-sm text-foreground"
          value={role}
          onChange={(e) => onChange(e.target.value as RoleValue)}
          disabled={isPending}
        >
          <option value="MEMBER">Membro</option>
          <option value="ADMIN">Admin</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  )
}
```

- **Step 6: Rodar todos os testes do arquivo para confirmar que passam**

```bash
pnpm --filter frontend test -- --run "details-edit-form"
```

Esperado: todos os testes passam (incluindo os pré-existentes de renderização, permissões, e interações de salvar).

- **Step 7: Rodar lint e type-check**

```bash
pnpm --filter frontend lint:fix
pnpm --filter frontend tsc:check
```

Esperado: zero erros em ambos.

- **Step 8: Verificar visualmente no browser**

Navegar para `/admin/usuarios`, abrir o painel de detalhes de um usuário e clicar em "Editar dados". Confirmar que:
- O select de "Status" exibe o `ChevronDown` alinhado à direita com espaço adequado
- O select de "Permissão" exibe o mesmo ícone
- Clicar no select abre o dropdown normalmente (ícone tem `pointer-events-none`)
- O texto "Ativo" / "Membro" não fica sobreposto pela seta

- **Step 9: Commit**

```bash
git add apps/frontend/src/features/admin/components/user-detail/details-edit-form.tsx \
        apps/frontend/src/features/admin/components/user-detail/details-edit-form.test.tsx
git commit -m "fix(admin): select de status e role com appearance-none e ícone custom"
```

## Critérios de Sucesso

- `StatusField` e `RoleField` renderizam `ChevronDown` do lucide-react absolutamente posicionado
- `<select>` tem `appearance-none` e `pr-10` (sem sobreposição de texto pela seta)
- Todos os testes pré-existentes de `details-edit-form.test.tsx` continuam passando
- 2 novos testes passando (appearance-none + svg presente)
- `lint:fix` e `tsc:check` sem erros
- Visual: seta consistente entre Chrome, Firefox e Safari
