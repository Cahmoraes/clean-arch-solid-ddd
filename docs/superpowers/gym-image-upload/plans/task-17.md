# Task 17: Página de edição `/admin/academias/[id]/editar` [FR-006, FR-007, FR-015]

**Status:** PENDING
**PRD:** `../prd/prd-gym-image-upload.md`
**Spec:** `../specs/gym-image-upload-design.md`
**Depends on:** task-14, task-15

## Visão Geral

Cria a tela de edição de academia (FR-006): carrega os dados atuais, pré-preenche o formulário (reusando o schema do cadastro), atualiza via `useUpdateGym` e permite trocar a imagem via `GymImageUploader` + `useSetGymImage` (FR-007). A proteção admin (FR-015) é herdada do route group `(authenticated)/admin` (mesmo mecanismo da página de cadastro).

> **Pré-requisito de integração:** o endpoint de detalhe `GET /gyms/:gymId` deve retornar `cnpj` para o pré-preenchimento (ver task-03, que adiciona `cnpj` ao DTO de detalhe, e task-11, que adiciona `cnpj?` ao `GymSummary`).

## Arquivos

- Create: `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.tsx`
- Test: `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.test.tsx`

### Conformidade com as Skills Padrão

- use react: separa `EditGymForm` (renderizado quando os dados chegam) da página (loading/erro).
- use tanstack-query-best-practices: usa `useGymById` para carregar e mutations para salvar.
- use test-antipatterns: mocka `next/navigation` e usa MSW para o detalhe; valida o pré-preenchimento.

## Passos

- **Step 1: Escrever o teste que falha**

Crie `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.test.tsx`:

```tsx
import { screen, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { describe, expect, test, vi } from "vitest"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"

vi.mock("next/navigation", () => ({
	useParams: () => ({ id: "gym-1" }),
	useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}))

import AdminEditarAcademiaPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

describe("AdminEditarAcademiaPage", () => {
	test("pré-preenche o formulário com os dados da academia", async () => {
		server.use(
			http.get(`${apiBaseUrl}/gyms/:id`, () =>
				HttpResponse.json({
					id: "gym-1",
					title: "Academia Volt",
					description: "Top",
					phone: "11999999999",
					address: "Rua A, 100",
					cnpj: "11222333000181",
					imageKey: null,
					latitude: -23.5,
					longitude: -46.6,
				}),
			),
		)
		renderWithProviders(<AdminEditarAcademiaPage />)
		await waitFor(() =>
			expect(screen.getByTestId("gym-form-title")).toHaveValue("Academia Volt"),
		)
		expect(screen.getByTestId("gym-form-cnpj")).toHaveValue("11222333000181")
	})
})
```

- **Step 2: Rodar o teste e confirmar a falha**

Run: `pnpm --filter frontend test -- -t "AdminEditarAcademiaPage"`
Expected: FAIL — `./page` não existe.

- **Step 3: Implementar a página de edição**

Crie `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.tsx`:

```tsx
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useParams, useRouter } from "next/navigation"
import { useId, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { FormField } from "@/components/ui/form-field"
import { Skeleton } from "@/components/ui/skeleton"
import {
	type Gym,
	useGymById,
	useSetGymImage,
	useUpdateGym,
} from "@/features/gyms/api"
import { GymImage } from "@/features/gyms/components/gym-image"
import { GymImageUploader } from "@/features/gyms/components/gym-image-uploader"
import { GymLocationPicker } from "@/features/gyms/components/gym-location-picker"
import {
	type CreateGymInput,
	createGymSchema,
} from "@/features/gyms/schemas/create-gym-schema"
import { ApiError } from "@/lib/errors"

function updateGymErrorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.status === 409) return "Já existe uma academia com este CNPJ."
		if (error.status === 404) return "Academia não encontrada."
		return error.userMessage
	}
	return "Não foi possível atualizar a academia. Tente novamente."
}

function EditGymForm({ gym }: { gym: Gym }) {
	const router = useRouter()
	const titleId = useId()
	const cnpjId = useId()
	const descriptionId = useId()
	const phoneId = useId()
	const [imageBlob, setImageBlob] = useState<Blob | null>(null)
	const { mutateAsync: updateGym, isPending } = useUpdateGym()
	const { mutateAsync: setGymImage } = useSetGymImage()
	const {
		register,
		handleSubmit,
		control,
		formState: { errors },
	} = useForm<CreateGymInput>({
		resolver: zodResolver(createGymSchema),
		defaultValues: {
			title: gym.title,
			cnpj: gym.cnpj ?? "",
			description: gym.description ?? "",
			phone: gym.phone ?? "",
			location: {
				address: gym.address ?? "",
				latitude: gym.latitude,
				longitude: gym.longitude,
			},
		},
	})

	async function onSubmit(values: CreateGymInput) {
		try {
			await updateGym({ id: gym.id, input: values })
			if (imageBlob) {
				try {
					await setGymImage({ id: gym.id, file: imageBlob })
				} catch {
					toast.error("Dados salvos, mas a imagem falhou. Tente reenviar.")
				}
			}
			toast.success("Academia atualizada com sucesso.")
			router.replace(`/academias/${gym.id}`)
		} catch (submitError) {
			toast.error(updateGymErrorMessage(submitError))
		}
	}

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			noValidate
			className="flex flex-col gap-4"
			aria-label="Formulário de edição de academia"
		>
			<GymImage
				imageKey={gym.imageKey}
				alt={gym.title}
				className="h-40 w-full rounded-[8px]"
			/>
			<FormField
				id={titleId}
				label="Nome"
				data-testid="gym-form-title"
				error={errors.title?.message}
				{...register("title")}
			/>
			<FormField
				id={cnpjId}
				label="CNPJ (apenas dígitos)"
				inputMode="numeric"
				data-testid="gym-form-cnpj"
				error={errors.cnpj?.message}
				{...register("cnpj")}
			/>
			<Controller
				control={control}
				name="location"
				render={({ field, fieldState }) => (
					<GymLocationPicker
						value={field.value}
						onChange={field.onChange}
						error={
							fieldState.error?.message ?? errors.location?.latitude?.message
						}
					/>
				)}
			/>
			<FormField
				id={descriptionId}
				label="Descrição (opcional)"
				data-testid="gym-form-description"
				error={errors.description?.message}
				{...register("description")}
			/>
			<FormField
				id={phoneId}
				label="Telefone (opcional, apenas dígitos)"
				inputMode="numeric"
				data-testid="gym-form-phone"
				error={errors.phone?.message}
				{...register("phone")}
			/>
			<GymImageUploader onCropped={setImageBlob} label="Trocar imagem (opcional)" />
			<div className="flex justify-end">
				<Button type="submit" data-testid="gym-form-submit" disabled={isPending}>
					{isPending ? "Salvando..." : "Salvar alterações"}
				</Button>
			</div>
		</form>
	)
}

export default function AdminEditarAcademiaPage() {
	const params = useParams<{ id: string }>()
	const id = params?.id
	const query = useGymById(id)

	return (
		<PageContainer
			as="section"
			width="narrow"
			aria-labelledby="editar-academia-title"
		>
			<header className="flex flex-col gap-2">
				<h1
					id="editar-academia-title"
					className="font-display text-3xl font-medium text-foreground"
				>
					Editar academia
				</h1>
				<p className="text-sm text-muted-foreground">
					Disponível apenas para administradores.
				</p>
			</header>

			{query.isLoading ? (
				<div className="flex flex-col gap-4" data-testid="gym-edit-loading">
					<Skeleton className="h-40 w-full" />
					<Skeleton className="h-10 w-full" />
				</div>
			) : null}

			{query.isError ? (
				<EmptyState
					title="Não foi possível carregar a academia"
					description={query.error?.userMessage ?? "Tente novamente."}
					action={
						<Button variant="outline" onClick={() => query.refetch()}>
							Tentar novamente
						</Button>
					}
				/>
			) : null}

			{query.data ? <EditGymForm gym={query.data} /> : null}
		</PageContainer>
	)
}
```

- **Step 4: Rodar o teste e confirmar o sucesso**

Run: `pnpm --filter frontend test -- -t "AdminEditarAcademiaPage"`
Expected: PASS.

- **Step 5: Tipos + lint + commit**

Run: `pnpm --filter frontend tsc:check`
Expected: zero erros.

Run: `pnpm --filter frontend lint:fix`
Expected: zero problemas.

```bash
git add "apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar"
git commit -m "feat(gyms): add admin gym edit page with data + image update"
```

## Critérios de Sucesso

- `/admin/academias/[id]/editar` carrega e pré-preenche os dados; salva via `PUT` e troca a imagem via upload. [FR-006, FR-007]
- Proteção admin herdada do route group `(authenticated)/admin`. [FR-015]
- Testes, `tsc:check` e `lint:fix` sem problemas.
