# Task 5: `gym-cnpj-field` — indicador de obrigatoriedade acessível [FR-002]

**Status:** PENDING
**PRD:** `../prd/prd-acessibilidade-frontend.md`
**Spec:** `../specs/acessibilidade-frontend-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

`GymCnpjField` (`apps/frontend/src/features/gyms/components/gym-cnpj-field.tsx`) renderiza `<FieldShell id={id} label="CNPJ" error={error}>` (L28) sem a prop `showRequiredIndicator`, embora CNPJ seja obrigatório em `create-gym-schema.ts` — `cnpj: z.string().trim().regex(numericOnly, ...).length(CNPJ_DIGITS, ...)`, sem `.optional()` (diferente de `phone`, que tem `.optional().or(z.literal(""))` em `create-gym-schema.ts:51-58`, e cujo `GymPhoneField` corretamente omite `showRequiredIndicator` — não alterar `gym-phone-field.tsx`). `FieldShell` (`apps/frontend/src/components/ui/field-shell.tsx:22-60`) já implementa o padrão completo de indicador (traço visual `aria-hidden` + `<span className="sr-only">(obrigatório)</span>`, sem asterisco visível) atrás da prop `showRequiredIndicator` — esta task só ativa a prop, sem recriar o padrão. Complementa com `required aria-required="true"` no `IMaskInput` (biblioteca `react-imask`, já importada no arquivo), fechando a associação ARIA exigida por FR-002.

## Arquivos

- Modify: `apps/frontend/src/features/gyms/components/gym-cnpj-field.tsx`
- Test: `apps/frontend/src/features/gyms/components/gym-cnpj-field.test.tsx` (arquivo novo — não existe teste dedicado hoje)

### Conformidade com as Skills Padrão

- `shadcn`: `FieldShell` é o wrapper compartilhado de campo (label + conteúdo + erro) do design system do projeto — a task consome a prop `showRequiredIndicator` já exposta por ele em vez de recriar o markup do indicador.
- `wcag-audit-patterns`: critério 3.3.2 (Labels or Instructions) / 4.1.2 (Name, Role, Value) — campo obrigatório precisa comunicar isso tanto visualmente (traço) quanto programaticamente (`aria-required="true"` + texto para leitor de tela), sem depender só de cor/asterisco solto.
- `vercel-react-best-practices`: manter o componente controlado (`value`/`onAccept`) intacto — a mudança é puramente de props/atributos, sem introduzir estado novo ou efeitos.
- `test-antipatterns`: testar o comportamento observável via `aria-required` e texto `sr-only` renderizado (o que uma AT expõe), não a prop interna `showRequiredIndicator` do `FieldShell` isoladamente.

## Passos

- **Step 1: Write the failing test**

Criar `apps/frontend/src/features/gyms/components/gym-cnpj-field.test.tsx`:

```tsx
import { screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { renderWithProviders } from "@/test/render"
import { GymCnpjField } from "./gym-cnpj-field"

describe("GymCnpjField", () => {
	test("indica o campo obrigatório via aria-required e texto para leitor de tela", () => {
		renderWithProviders(
			<GymCnpjField id="cnpj" value="" onAccept={vi.fn()} />,
		)
		expect(screen.getByLabelText(/cnpj/i)).toHaveAttribute(
			"aria-required",
			"true",
		)
		expect(screen.getByText("(obrigatório)")).toBeInTheDocument()
		expect(screen.queryByText("*")).not.toBeInTheDocument()
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/gyms/components/gym-cnpj-field.test.tsx -t "indica o campo obrigatório via aria-required e texto para leitor de tela"`
Expected: FAIL — `expect(screen.getByLabelText(/cnpj/i)).toHaveAttribute("aria-required", "true")` recebe `null` (o `IMaskInput` hoje não tem `aria-required`), e/ou `screen.getByText("(obrigatório)")` lança `TestingLibraryElementError: Unable to find an element with the text: (obrigatório)` (o `FieldShell` não recebe `showRequiredIndicator`).

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/features/gyms/components/gym-cnpj-field.tsx`, ativar o indicador no `FieldShell` (L28):

```tsx
		<FieldShell id={id} label="CNPJ" error={error} showRequiredIndicator>
```

E adicionar `required aria-required="true"` ao `IMaskInput` (após `unmask` em L32):

```tsx
			<IMaskInput
				id={id}
				mask="00.000.000/0000-00"
				unmask
				required
				aria-required="true"
				value={value}
				onAccept={onAccept}
				onBlur={onBlur}
				inputMode="numeric"
				placeholder="00.000.000/0000-00"
				data-testid={testId}
				aria-invalid={Boolean(error) || undefined}
				aria-describedby={error ? `${id}-error` : undefined}
				className={MASKED_INPUT_CLASS}
			/>
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/features/gyms/components/gym-cnpj-field.test.tsx -t "indica o campo obrigatório via aria-required e texto para leitor de tela"`
Expected: PASS

- **Step 5: Commit** *(sequential execution only — em execução paralela o orquestrador commita na barreira de integração. Se o seu prompt indicar que você é um de vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/frontend/src/features/gyms/components/gym-cnpj-field.tsx apps/frontend/src/features/gyms/components/gym-cnpj-field.test.tsx
git commit -m "fix(a11y): indica CNPJ como campo obrigatorio em GymCnpjField"
```

## Critérios de Sucesso

- `screen.getByLabelText(/cnpj/i)` (o `IMaskInput` associado via `id`/`htmlFor` ao `FieldShell`) tem `aria-required="true"` (FR-002).
- O `<label>` renderiza o texto `sr-only` "(obrigatório)" (via `FieldShell`'s `showRequiredIndicator`), sem nenhum asterisco (`*`) visível solto no DOM.
- `gym-phone-field.tsx` permanece inalterado — telefone continua opcional, sem `showRequiredIndicator` nem `aria-required`.

