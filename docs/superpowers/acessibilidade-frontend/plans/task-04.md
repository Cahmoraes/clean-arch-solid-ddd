# Task 4: `gym-image-uploader` — rótulo associado ao input de imagem [FR-001]

**Status:** PENDING
**PRD:** `../prd/prd-acessibilidade-frontend.md`
**Spec:** `../specs/acessibilidade-frontend-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

`GymImageUploader` (`apps/frontend/src/features/gyms/components/gym-image-uploader.tsx`) renderiza um `<span className="text-sm font-medium text-foreground">{label}</span>` (L68) imediatamente antes do `<input type="file" ...>` (L69-75), sem `id`/`htmlFor` associando os dois — o rótulo é só visual, não programático. Um leitor de tela que foca o `<input>` não anuncia "Imagem da academia (opcional)". Esta task troca o `<span>` por um `<label htmlFor={fileInputId}>`, gera `fileInputId` via `useId()` (padrão já usado em `gym-location-picker.tsx:87`, `gym-location-picker.tsx` importa `useId` de `"react"`) e adiciona `id={fileInputId}` ao `<input>`, fechando a associação programática exigida por FR-001.

## Arquivos

- Modify: `apps/frontend/src/features/gyms/components/gym-image-uploader.tsx`
- Modify: `apps/frontend/src/features/gyms/components/gym-image-uploader.test.tsx`

### Conformidade com as Skills Padrão

- `vercel-react-best-practices`: gerar o id do input via `useId()` (hook estável do React 19, evita colisão de ids entre múltiplas instâncias do componente na mesma árvore) em vez de uma string hardcoded.
- `wcag-audit-patterns`: critério 1.3.1 (Info and Relationships) / 4.1.2 (Name, Role, Value) — todo controle de formulário precisa de nome acessível programático, não apenas texto visualmente adjacente; `<label htmlFor>` é a técnica canônica para um `<input type="file">`.
- `test-antipatterns`: o teste deve validar o comportamento observável (associação programática via `getByLabelText`, que reflete exatamente o que uma AT enxerga), não implementação interna (não testar o valor do atributo `id` isoladamente).

## Passos

- **Step 1: Write the failing test**

Adicionar ao arquivo de teste existente `apps/frontend/src/features/gyms/components/gym-image-uploader.test.tsx`, dentro do `describe("GymImageUploader", () => { ... })`, após o `beforeEach` e antes/depois dos testes já existentes:

```tsx
	test("associa o rótulo ao input de arquivo via label/htmlFor", () => {
		renderWithProviders(<GymImageUploader onCropped={vi.fn()} />)
		expect(screen.getByLabelText(/imagem da academia/i)).toBe(
			screen.getByTestId("gym-image-input"),
		)
	})
```

Nenhum import novo é necessário — `screen`, `renderWithProviders`, `vi` e `GymImageUploader` já estão importados no topo do arquivo.

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/features/gyms/components/gym-image-uploader.test.tsx -t "associa o rótulo ao input de arquivo via label/htmlFor"`
Expected: FAIL — `TestingLibraryElementError: Unable to find a label with the text of: /imagem da academia/i` (o `<span>` atual não é um `<label>`, então `getByLabelText` não encontra nenhum elemento associado).

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/features/gyms/components/gym-image-uploader.tsx`, trocar o import de `useCallback, useState` por `useCallback, useId, useState`:

```tsx
import { useCallback, useId, useState } from "react"
```

Declarar `fileInputId` no corpo do componente, junto aos demais `useState` (após `const [error, setError] = useState<string | null>(null)`):

```tsx
	const [error, setError] = useState<string | null>(null)
	const fileInputId = useId()
```

Trocar o `<span>` e o `<input>` (L68-75 atuais) por:

```tsx
			<label htmlFor={fileInputId} className="text-sm font-medium text-foreground">
				{label}
			</label>
			<input
				id={fileInputId}
				type="file"
				accept="image/*"
				data-testid="gym-image-input"
				onChange={handleFileChange}
				className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
			/>
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/features/gyms/components/gym-image-uploader.test.tsx -t "associa o rótulo ao input de arquivo via label/htmlFor"`
Expected: PASS

- **Step 5: Commit** *(sequential execution only — em execução paralela o orquestrador commita na barreira de integração. Se o seu prompt indicar que você é um de vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/frontend/src/features/gyms/components/gym-image-uploader.tsx apps/frontend/src/features/gyms/components/gym-image-uploader.test.tsx
git commit -m "fix(a11y): associa rotulo ao input de imagem em GymImageUploader"
```

## Critérios de Sucesso

- `screen.getByLabelText(/imagem da academia/i)` retorna exatamente o `<input type="file" data-testid="gym-image-input">` — associação programática label/input funcionando (FR-001).
- Nenhum texto visual ou comportamento de crop/upload muda: os 3 testes pré-existentes em `gym-image-uploader.test.tsx` continuam passando sem alteração.
- `<span>` não associado é eliminado do markup; o rótulo é sempre um `<label htmlFor>` real.

