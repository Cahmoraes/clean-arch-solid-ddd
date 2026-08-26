# Task 6: `EditProfileModal` — indicador de obrigatoriedade acessível no nome [FR-002]

**Status:** IN_PROGRESS
**PRD:** `../prd/prd-acessibilidade-frontend.md`
**Spec:** `../specs/acessibilidade-frontend-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

`EditProfileModal` (`apps/frontend/src/features/profile/components/EditProfileModal.tsx`) renderiza `<Input id="profile-name">` (L80-97) sem `required`/`aria-required`, embora `updateProfileSchema = z.object({ name: z.string().trim().min(5).max(30) })` (`apps/frontend/src/features/profile/schemas/update-profile-schema.ts`) exija o campo preenchido. O input já tem `aria-invalid`/`aria-describedby` corretos para o estado de erro — falta apenas comunicar a obrigatoriedade em si. Esta task aplica o mesmo padrão já validado em `form-field.tsx`/`field-shell.tsx` (e replicado em `contact-form.tsx`/`gym-cnpj-field.tsx`): `required aria-required="true"` no `<Input>` + `<span className="sr-only">(obrigatório)</span>` dentro do `<Label>`, sem asterisco visível solto (D6).

## Arquivos

- Modify: `apps/frontend/src/features/profile/components/EditProfileModal.tsx`
- Test: `apps/frontend/src/features/profile/components/EditProfileModal.test.tsx` (arquivo novo — não existe teste dedicado hoje)

### Conformidade com as Skills Padrão

- `shadcn`: `Label`/`Input` são primitivas shadcn/ui (`@/components/ui/label`, `@/components/ui/input`) — o indicador de obrigatoriedade deve seguir o mesmo markup (`sr-only` dentro do `Label`) já usado em `FormField`/`FieldShell`, sem recriar o padrão com uma abordagem divergente.
- `wcag-audit-patterns`: critério 3.3.2 (Labels or Instructions) / 4.1.2 (Name, Role, Value) — campo obrigatório precisa expor isso programaticamente (`aria-required="true"`) e via texto para leitor de tela, não só por convenção visual implícita.
- `vercel-react-best-practices`: a mudança é puramente de atributos/markup no JSX existente — não introduz estado, efeito ou re-render adicional no componente controlado.
- `test-antipatterns`: o teste novo valida o contrato observável (`aria-required` no input associado via `getByLabelText`, texto `sr-only` renderizado), não a implementação interna do `Label`/`Input`.

## Passos

- **Step 1: Write the failing test**

Criar `apps/frontend/src/features/profile/components/EditProfileModal.test.tsx`:

```tsx
import { screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { renderWithProviders } from "@/test/render"
import { EditProfileModal } from "./EditProfileModal"

describe("EditProfileModal", () => {
	test("indica o campo Nome como obrigatório via aria-required e texto para leitor de tela", () => {
		renderWithProviders(
			<EditProfileModal
				open
				onOpenChange={vi.fn()}
				currentName="Maria Silva"
				hasPassword
			/>,
		)
		expect(screen.getByLabelText(/nome/i)).toHaveAttribute(
			"aria-required",
			"true",
		)
		expect(screen.getByText("(obrigatório)")).toBeInTheDocument()
		expect(screen.queryByText("*")).not.toBeInTheDocument()
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/profile/components/EditProfileModal.test.tsx`
Expected: FAIL — `expect(screen.getByLabelText(/nome/i)).toHaveAttribute("aria-required", "true")` recebe `null` (o `Input` hoje não tem `aria-required`), e `screen.getByText("(obrigatório)")` lança `TestingLibraryElementError: Unable to find an element with the text: (obrigatório)` (o `Label` não tem o `span` sr-only).

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/features/profile/components/EditProfileModal.tsx`, ajustar o bloco do campo Nome (L80-97):

```tsx
					<div className="flex flex-col gap-2">
						<Label htmlFor="profile-name">
							Nome
							<span className="sr-only">(obrigatório)</span>
						</Label>
						<Input
							id="profile-name"
							data-testid="edit-profile-name-input"
							value={name}
							onChange={(event) => {
								setName(event.target.value)
								if (nameError) {
									setNameError(null)
								}
							}}
							disabled={isPending}
							autoComplete="name"
							autoFocus
							required
							aria-required="true"
							aria-invalid={Boolean(nameError) || undefined}
							aria-describedby={nameError ? "profile-name-error" : undefined}
						/>
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/features/profile/components/EditProfileModal.test.tsx`
Expected: PASS — `Test Files 1 passed`, `Tests 1 passed`.

- **Step 5: Commit** *(execução paralela — se seu prompt indicar que você é um de vários implementadores em uma wave compartilhada, pule este passo e apenas reporte os arquivos alterados; o orquestrador comita na barreira de integração.)*

```bash
git add apps/frontend/src/features/profile/components/EditProfileModal.tsx apps/frontend/src/features/profile/components/EditProfileModal.test.tsx
git commit -m "fix(a11y): indica nome como campo obrigatorio em EditProfileModal"
```

## Critérios de Sucesso

- `Input#profile-name` tem `required` e `aria-required="true"` (FR-002).
- O `Label` do campo Nome contém o texto `sr-only` "(obrigatório)", sem nenhum asterisco (`*`) visível solto no DOM (D6).
- `EditProfileModal.test.tsx` cobre as duas asserções acima e passa.
