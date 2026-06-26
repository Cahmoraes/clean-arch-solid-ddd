# Task 2: Atualizar EditGymForm: cancelar, troca de componente de imagem e desacoplamento do upload [FR-001, FR-002, FR-003, FR-004, FR-008, FR-016]

**Status:** DONE
**PRD:** `../prd/prd-gym-edit-upload-overlay.md`
**Spec:** `../specs/gym-edit-upload-overlay-design.md`
**Tier:** standard
**Depends on:** task-01

## Visão Geral

Modifica `EditGymForm` em `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.tsx` para:
1. Substituir `<GymImage />` + `<GymImageUploader />` por `<GymImageEditOverlay />` (task-01)
2. Remover o estado `imageBlob`, a função `uploadImageIfPresent` e a chamada dela no `onSubmit`
3. Adicionar botão "Cancelar" com `variant="outline"` na row de ações, navegando para `/admin/academias`
4. Adicionar `gap-2` no container de ações para espaçar os botões

Também adiciona testes para o botão Cancelar e verifica que `GymImageUploader` foi removido da renderização.

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.tsx`
- Create: `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.test.tsx`

### Conformidade com as Skills Padrão

- `shadcn`: uso do `Button` com `variant="outline"` do shadcn/ui
- `tailwindcss`: adição de `gap-2` na div de ações
- `tanstack-query-best-practices`: remoção da lógica de upload do `onSubmit` — mutation `useSetGymImage` agora é responsabilidade exclusiva do `GymImageEditOverlay`
- `typescript-advanced`: remoção de estado/tipos relacionados ao `imageBlob` (`Blob | null`)
- `vercel-react-best-practices`: separação de preocupações — form cuida de dados, overlay cuida de imagem
- `test-antipatterns`: mock de `useRouter` via `vi.mock("next/navigation")`, sem testar implementação interna
- `code-style`: indentação tab, aspas duplas, sem ponto-e-vírgula desnecessário

## Passos

- **Step 1: Escrever os testes que falham**

  Criar `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.test.tsx`:

  ```typescript
  import { screen } from "@testing-library/react"
  import userEvent from "@testing-library/user-event"
  import { describe, expect, test, vi } from "vitest"
  import { renderWithProviders } from "@/test/render"
  import AdminEditarAcademiaPage from "./page"

  const mockPush = vi.fn()
  const mockReplace = vi.fn()

  vi.mock("next/navigation", () => ({
  	useRouter: () => ({ push: mockPush, replace: mockReplace }),
  	useParams: () => ({ id: "gym-123" }),
  }))

  vi.mock(
  	"@/features/gyms/components/gym-image-edit-overlay",
  	() => ({
  		GymImageEditOverlay: () => (
  			<div data-testid="gym-image-edit-overlay-mock" />
  		),
  	}),
  )

  describe("AdminEditarAcademiaPage", () => {
  	test("deve renderizar GymImageEditOverlay em vez de GymImageUploader", async () => {
  		renderWithProviders(<AdminEditarAcademiaPage />)
  		await screen.findByTestId("gym-image-edit-overlay-mock")
  		expect(
  			screen.queryByTestId("gym-image-input"),
  		).not.toBeInTheDocument()
  	})

  	test("deve renderizar o botão Cancelar com variant outline", async () => {
  		renderWithProviders(<AdminEditarAcademiaPage />)
  		const cancelBtn = await screen.findByTestId("gym-form-cancel")
  		expect(cancelBtn).toBeInTheDocument()
  	})

  	test("deve navegar para /admin/academias ao clicar em Cancelar", async () => {
  		const user = userEvent.setup()
  		renderWithProviders(<AdminEditarAcademiaPage />)
  		const cancelBtn = await screen.findByTestId("gym-form-cancel")
  		await user.click(cancelBtn)
  		expect(mockPush).toHaveBeenCalledWith("/admin/academias")
  	})

  	test("não deve chamar mockPush ao submeter o formulário", async () => {
  		renderWithProviders(<AdminEditarAcademiaPage />)
  		await screen.findByTestId("gym-form-submit")
  		expect(mockPush).not.toHaveBeenCalled()
  	})
  })
  ```

  > Nota: para que `renderWithProviders` carregue o formulário, o MSW deve ter um handler `GET /gyms/:id` que retorna dados válidos. Esse handler já existe em `src/test/msw/handlers.ts` (handler `GET /gyms/:id` retorna `{ id: "gym-123", title: "Stub Gym", ... }`). O `useParams` retorna `{ id: "gym-123" }` para corresponder.

- **Step 2: Rodar os testes para confirmar que falham**

  ```bash
  pnpm --filter frontend test -- --run "AdminEditarAcademiaPage"
  ```

  Esperado: `FAIL` — botão Cancelar não existe ainda, `GymImageEditOverlay` não foi importado

- **Step 3: Modificar EditGymForm no page.tsx**

  Abrir `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.tsx` e aplicar as seguintes alterações:

  **3a. Atualizar imports** — remover `GymImage` e `GymImageUploader`, adicionar `GymImageEditOverlay`:

  ```typescript
  // REMOVER estas linhas:
  import { GymImage } from "@/features/gyms/components/gym-image"
  import { GymImageUploader } from "@/features/gyms/components/gym-image-uploader"

  // ADICIONAR esta linha (no lugar das removidas):
  import { GymImageEditOverlay } from "@/features/gyms/components/gym-image-edit-overlay"
  ```

  **3b. Remover import de `useSetGymImage`** da lista de imports de `@/features/gyms/api`:

  ```typescript
  // ANTES:
  import {
  	type Gym,
  	useGymById,
  	useSetGymImage,
  	useUpdateGym,
  } from "@/features/gyms/api"

  // DEPOIS:
  import { type Gym, useGymById, useUpdateGym } from "@/features/gyms/api"
  ```

  **3c. Remover estado `imageBlob` e hook `useSetGymImage`** dentro de `EditGymForm`:

  ```typescript
  // REMOVER estas linhas (dentro de EditGymForm):
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)
  const { mutateAsync: setGymImage } = useSetGymImage()
  ```

  **3d. Remover a função `uploadImageIfPresent` inteiramente:**

  ```typescript
  // REMOVER este bloco:
  async function uploadImageIfPresent() {
  	if (!imageBlob) return
  	try {
  		await setGymImage({ id: gym.id, file: imageBlob })
  	} catch {
  		toast.error("Dados salvos, mas a imagem falhou. Tente reenviar.")
  	}
  }
  ```

  **3e. Remover chamada `uploadImageIfPresent` do `onSubmit`:**

  ```typescript
  // ANTES:
  async function onSubmit(values: CreateGymInput) {
  	try {
  		await updateGym({ id: gym.id, input: values })
  		await uploadImageIfPresent()
  		toast.success("Academia atualizada com sucesso.")
  		router.replace(`/academias/${gym.id}`)
  	} catch (submitError) {
  		toast.error(updateGymErrorMessage(submitError))
  	}
  }

  // DEPOIS:
  async function onSubmit(values: CreateGymInput) {
  	try {
  		await updateGym({ id: gym.id, input: values })
  		toast.success("Academia atualizada com sucesso.")
  		router.replace(`/academias/${gym.id}`)
  	} catch (submitError) {
  		toast.error(updateGymErrorMessage(submitError))
  	}
  }
  ```

  **3f. Substituir `<GymImage />` por `<GymImageEditOverlay />` no JSX:**

  ```typescript
  // ANTES (linha ~95-99 no JSX do form):
  <GymImage
  	imageKey={gym.imageKey}
  	alt={gym.title}
  	className="h-40 w-full rounded-[8px]"
  />

  // DEPOIS:
  <GymImageEditOverlay
  	gymId={gym.id}
  	imageKey={gym.imageKey}
  	gymTitle={gym.title}
  />
  ```

  **3g. Remover `<GymImageUploader />` do JSX (imediatamente antes do div de ações):**

  ```typescript
  // REMOVER este elemento:
  <GymImageUploader
  	onCropped={setImageBlob}
  	label="Trocar imagem (opcional)"
  />
  ```

  **3h. Atualizar o div de ações** — adicionar `gap-2` e botão Cancelar:

  ```typescript
  // ANTES:
  <div className="flex justify-end">
  	<Button
  		type="submit"
  		data-testid="gym-form-submit"
  		disabled={isPending}
  	>
  		{isPending ? "Salvando..." : "Salvar alterações"}
  	</Button>
  </div>

  // DEPOIS:
  <div className="flex justify-end gap-2">
  	<Button
  		type="button"
  		variant="outline"
  		data-testid="gym-form-cancel"
  		onClick={() => router.push("/admin/academias")}
  	>
  		Cancelar
  	</Button>
  	<Button
  		type="submit"
  		data-testid="gym-form-submit"
  		disabled={isPending}
  	>
  		{isPending ? "Salvando..." : "Salvar alterações"}
  	</Button>
  </div>
  ```

  **3i. Remover import de `useState`** se não for mais usado após as remoções acima — verificar se `useState` ainda é usado em outro lugar no componente. Após as remoções, `useState` não é mais necessário em `EditGymForm` (o estado `imageBlob` foi o único). Se `useId` ainda for usado, manter `useId`; remover apenas `useState`:

  ```typescript
  // ANTES:
  import { useId, useState } from "react"

  // DEPOIS (se useState não for mais usado):
  import { useId } from "react"
  ```

- **Step 4: Rodar os testes para confirmar que passam**

  ```bash
  pnpm --filter frontend test -- --run "AdminEditarAcademiaPage"
  ```

  Esperado: `PASS` em todos os 4 testes

- **Step 5: Rodar todos os testes de gyms para garantir ausência de regressões**

  ```bash
  pnpm --filter frontend test -- --run "gyms"
  ```

  Esperado: todos os testes existentes de gym passando (incluindo `gym-image-uploader.test.tsx` — não foi modificado)

- **Step 6: Verificar TypeScript**

  ```bash
  pnpm --filter frontend tsc:check
  ```

  Esperado: zero erros de tipo

- **Step 7: Rodar lint**

  ```bash
  pnpm --filter frontend lint:fix
  ```

  Esperado: zero problemas

- **Step 8: Build de produção**

  ```bash
  pnpm --filter frontend build
  ```

  Esperado: build concluído com sucesso

- **Step 9: Commit**

  ```bash
  git add apps/frontend/src/app/\(authenticated\)/admin/academias/\[id\]/editar/page.tsx \
    apps/frontend/src/app/\(authenticated\)/admin/academias/\[id\]/editar/page.test.tsx
  git commit -m "feat(gyms): update EditGymForm with cancel button and image overlay

  FR-001, FR-002, FR-003, FR-004, FR-008, FR-016
  - Cancel button (variant=outline) navigates to /admin/academias
  - GymImageEditOverlay replaces GymImage + GymImageUploader
  - Upload logic removed from form submit (image upload is now independent)"
  ```

## Critérios de Sucesso

- Botão "Cancelar" com `data-testid="gym-form-cancel"` visível ao lado de "Salvar alterações" (FR-001)
- Botão usa `variant="outline"` (FR-002)
- Clique em Cancelar chama `router.push("/admin/academias")` (FR-003)
- Botão Cancelar tem `type="button"` — não dispara submit (FR-004)
- `GymImageUploader` não aparece mais no formulário de edição (FR-008)
- `onSubmit` não contém mais chamada de upload de imagem (FR-016)
- Todos os 4 testes unitários da página passam
- Testes existentes de gym não regridem
- `tsc:check` sem erros
- `lint:fix` sem erros
- `build` bem-sucedido
