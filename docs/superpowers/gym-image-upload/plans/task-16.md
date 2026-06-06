# Task 16: Integrar uploader na página de cadastro [FR-001, FR-002]

**Status:** PENDING
**PRD:** `../prd/prd-gym-image-upload.md`
**Spec:** `../specs/gym-image-upload-design.md`
**Depends on:** task-14, task-15

## Visão Geral

Adiciona o `GymImageUploader` à página de cadastro e, no submit, após criar a academia, envia a imagem cropada (se houver) via `useSetGymImage` (FR-001, FR-002). Falha no upload não invalida a criação já concluída (imagem é opcional).

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/admin/academias/nova/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/admin/academias/nova/page.test.tsx`

### Conformidade com as Skills Padrão

- use react: estado local para o blob; composição com o uploader.
- use test-antipatterns: teste verifica presença do input de imagem (sem depender do canvas).

## Passos

- **Step 1: Atualizar a página de cadastro**

Em `apps/frontend/src/app/(authenticated)/admin/academias/nova/page.tsx`:

1. Ajuste os imports (adicione `useState`, o uploader e o hook de imagem):

```tsx
import { useId, useState } from "react"
```
```tsx
import { useCreateGym, useSetGymImage } from "@/features/gyms/api"
import { GymImageUploader } from "@/features/gyms/components/gym-image-uploader"
```

2. Dentro do componente, adicione o estado e o hook (após `useCreateGym`):

```tsx
	const { mutateAsync, isPending } = useCreateGym()
	const { mutateAsync: setGymImage } = useSetGymImage()
	const [imageBlob, setImageBlob] = useState<Blob | null>(null)
```

3. Substitua o `onSubmit` por:

```tsx
	async function onSubmit(values: CreateGymInput) {
		try {
			const { id } = await mutateAsync(values)
			if (imageBlob) {
				try {
					await setGymImage({ id, file: imageBlob })
				} catch {
					toast.error(
						"Academia criada, mas a imagem falhou. Você pode adicioná-la na edição.",
					)
				}
			}
			toast.success("Academia cadastrada com sucesso.")
			router.replace(`/academias/${id}`)
		} catch (submitError) {
			toast.error(createGymErrorMessage(submitError))
		}
	}
```

4. Adicione o uploader no formulário, logo antes do bloco do botão de submit (`<div className="flex justify-end">`):

```tsx
				<GymImageUploader onCropped={setImageBlob} />

				<div className="flex justify-end">
```

- **Step 2: Escrever/atualizar o teste**

Em `apps/frontend/src/app/(authenticated)/admin/academias/nova/page.test.tsx`, adicione um teste que confirma o input de imagem presente:

```tsx
	test("exibe o campo de upload de imagem", () => {
		renderWithProviders(<AdminNovaAcademiaPage />)
		expect(screen.getByTestId("gym-image-input")).toBeInTheDocument()
	})
```

> Confirme os imports do teste (`renderWithProviders`, `screen`, `AdminNovaAcademiaPage`, `describe`, `test`, `expect`). Os testes de submit existentes continuam válidos — sem imagem, `imageBlob` é null e nenhum upload é disparado.

- **Step 3: Rodar os testes**

Run: `pnpm --filter frontend test -- -t "AdminNovaAcademia"`
Expected: PASS (testes existentes + o novo). Se o nome do `describe` for outro, ajuste o filtro `-t`.

- **Step 4: Tipos + lint + commit**

Run: `pnpm --filter frontend tsc:check`
Expected: zero erros.

Run: `pnpm --filter frontend lint:fix`
Expected: zero problemas.

```bash
git add "apps/frontend/src/app/(authenticated)/admin/academias/nova"
git commit -m "feat(gyms): upload gym image during creation flow"
```

## Critérios de Sucesso

- A página de cadastro mostra o uploader; ao criar com imagem, a foto é enviada após a criação. [FR-001, FR-002]
- Falha de imagem não bloqueia a criação. Testes, `tsc:check` e `lint:fix` sem problemas.
