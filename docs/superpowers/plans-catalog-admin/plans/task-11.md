# Task 11: Frontend — formulário de criação/edição de plano (dialog) [FR-001, FR-002, FR-003, FR-004, FR-005]

**Status:** DONE
**PRD:** `../prd/prd-plans-catalog-admin.md`
**Spec:** `../specs/plans-catalog-admin-design.md`
**Tier:** standard
**Depends on:** task-09, task-10

## Visão Geral

`PlanFormDialog` é o formulário de criação/edição de plano, em um dialog modal (não uma página
separada — decisão da Especificação Visual, diferente do padrão de `academias`), reaproveitando
`react-hook-form` + `zodResolver(planAdminSchema)` no mesmo padrão já usado em
`admin/academias/nova/page.tsx`. Cria (FR-001, nome/preço/periodicidade/tagline/features
obrigatórios, `stripePriceId` opcional) ou edita (FR-004) um plano; erro de validação (preço
negativo, nome vazio) aparece no campo via zod (FR-002, FR-003); a edição nunca envia nem altera
`isActive` — o formulário não tem nenhum campo de status (FR-005, reforça a decisão da task-05).
Falha de submissão HTTP é reportada por `toast.error`, sem descartar os dados já preenchidos. Esta
task conecta o dialog ao estado `isFormOpen`/`editingPlan` já criado pela task-10 em
`admin/planos/page.tsx`.

## Arquivos

- Create: `apps/frontend/src/features/plans-admin/components/plan-form-dialog.tsx`
- Create: `apps/frontend/src/features/plans-admin/components/plan-form-dialog.test.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/admin/planos/page.tsx`

## Interfaces

- **Consome:** `planAdminSchema`, `type PlanAdminInput` (task-09,
  `features/plans-admin/schemas/plan-admin-schema.ts`); `useCreatePlan(): UseMutationResult
  <PlanAdmin, ApiError, PlanAdminInput>`, `useUpdatePlan(): UseMutationResult<PlanAdmin, ApiError,
  { id: string; input: PlanAdminInput }>`, `type PlanAdmin` (task-09, `features/plans-admin/api/
  index.ts`); estado `isFormOpen: boolean`, `editingPlan: PlanAdmin | null`,
  `setIsFormOpen`/`setEditingPlan` de `admin/planos/page.tsx` (task-10) — esta task só lê/escreve
  esse estado já existente, não recria a lógica de listagem.
- **Produz:** `PlanFormDialog({ open: boolean; plan?: PlanAdmin | null; onOpenChange: (open:
  boolean) => void; onSuccess?: () => void })`
  (`apps/frontend/src/features/plans-admin/components/plan-form-dialog.tsx`).

### Conformidade com as Skills Padrão

- `tanstack-query-best-practices`: `useCreatePlan`/`useUpdatePlan` dentro do dialog, tratamento de
  `isPending`/erro de mutation.
- `shadcn`: `Dialog`/`DialogContent`/`DialogHeader`/`DialogFooter` para o modal.
- `tailwindcss`: layout do formulário dentro do dialog.
- `wcag-audit-patterns`: labels associados, mensagens de erro com `role="alert"`, foco preso no
  dialog (herdado do Radix `Dialog`).
- `typescript-advanced`: tipagem do modo criar/editar via `plan?: PlanAdmin | null`.

## Passos

- **Step 1: Write the failing test**

```typescript
// apps/frontend/src/features/plans-admin/components/plan-form-dialog.test.tsx
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { describe, expect, test, vi } from "vitest"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import { PlanFormDialog } from "./plan-form-dialog"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

describe("PlanFormDialog — criação", () => {
	test("envia priceCents calculado a partir do preço em reais e chama onSuccess", async () => {
		let receivedBody: Record<string, unknown> | null = null
		server.use(
			http.post(`${apiBaseUrl}/admin/plans`, async ({ request }) => {
				receivedBody = (await request.json()) as Record<string, unknown>
				return HttpResponse.json(
					{
						id: "plan-new",
						name: "Premium Mensal",
						priceCents: 4990,
						billingPeriod: "monthly",
						tagline: "Tagline.",
						features: ["Check-ins ilimitados"],
						isActive: true,
						stripePriceId: "",
					},
					{ status: 201 },
				)
			}),
		)
		const onSuccess = vi.fn()

		renderWithProviders(
			<PlanFormDialog open plan={null} onOpenChange={() => {}} onSuccess={onSuccess} />,
		)

		fireEvent.change(screen.getByLabelText(/nome/i), {
			target: { value: "Premium Mensal" },
		})
		fireEvent.change(screen.getByLabelText(/preço/i), {
			target: { value: "49.90" },
		})
		fireEvent.change(screen.getByLabelText(/tagline/i), {
			target: { value: "Tagline." },
		})
		fireEvent.change(screen.getByLabelText(/benefícios/i), {
			target: { value: "Check-ins ilimitados" },
		})
		fireEvent.click(screen.getByRole("button", { name: /salvar plano/i }))

		await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
		expect(receivedBody).toMatchObject({
			name: "Premium Mensal",
			priceCents: 4990,
			tagline: "Tagline.",
			features: ["Check-ins ilimitados"],
		})
	})

	test("preço negativo mostra erro no campo e não envia a requisição", async () => {
		let called = false
		server.use(
			http.post(`${apiBaseUrl}/admin/plans`, () => {
				called = true
				return HttpResponse.json({}, { status: 201 })
			}),
		)

		renderWithProviders(
			<PlanFormDialog open plan={null} onOpenChange={() => {}} />,
		)

		fireEvent.change(screen.getByLabelText(/nome/i), {
			target: { value: "Premium Mensal" },
		})
		fireEvent.change(screen.getByLabelText(/preço/i), {
			target: { value: "-1" },
		})
		fireEvent.change(screen.getByLabelText(/tagline/i), {
			target: { value: "Tagline." },
		})
		fireEvent.change(screen.getByLabelText(/benefícios/i), {
			target: { value: "Check-ins ilimitados" },
		})
		fireEvent.click(screen.getByRole("button", { name: /salvar plano/i }))

		await waitFor(() =>
			expect(screen.getByText(/preço não pode ser negativo/i)).toBeInTheDocument(),
		)
		expect(called).toBe(false)
	})
})
```

Run (from `apps/frontend`): `npx vitest run src/features/plans-admin/components/plan-form-dialog.test.tsx`
Expected: FAIL — `Cannot find module './plan-form-dialog'`

- **Step 2: Write minimal implementation**

```tsx
// apps/frontend/src/features/plans-admin/components/plan-form-dialog.tsx
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useId, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import type { PlanAdmin } from "@/features/plans-admin/api"
import { useCreatePlan, useUpdatePlan } from "@/features/plans-admin/api"
import {
	type PlanAdminInput,
	planAdminSchema,
} from "@/features/plans-admin/schemas/plan-admin-schema"
import { ApiError } from "@/lib/errors"

export interface PlanFormDialogProps {
	open: boolean
	plan?: PlanAdmin | null
	onOpenChange: (open: boolean) => void
	onSuccess?: () => void
}

function parseFeatures(text: string): string[] {
	return text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
}

function toDefaultValues(plan: PlanAdmin | null | undefined): PlanAdminInput {
	if (!plan) {
		return {
			name: "",
			price: 0,
			billingPeriod: "monthly",
			tagline: "",
			features: [],
			stripePriceId: "",
		}
	}
	return {
		name: plan.name,
		price: plan.priceCents / 100,
		billingPeriod: plan.billingPeriod,
		tagline: plan.tagline,
		features: [...plan.features],
		stripePriceId: plan.stripePriceId,
	}
}

function submitErrorMessage(error: unknown): string {
	if (error instanceof ApiError) return error.userMessage
	return "Não foi possível salvar o plano. Tente novamente."
}

export function PlanFormDialog({
	open,
	plan,
	onOpenChange,
	onSuccess,
}: PlanFormDialogProps) {
	const nameId = useId()
	const priceId = useId()
	const taglineId = useId()
	const featuresId = useId()
	const stripePriceIdFieldId = useId()
	const isEditing = Boolean(plan)

	const createPlan = useCreatePlan()
	const updatePlan = useUpdatePlan()
	const isPending = createPlan.isPending || updatePlan.isPending

	const {
		register,
		handleSubmit,
		reset,
		setValue,
		watch,
		formState: { errors },
	} = useForm<PlanAdminInput>({
		resolver: zodResolver(planAdminSchema),
		defaultValues: toDefaultValues(plan),
	})
	const [featuresText, setFeaturesText] = useState(
		toDefaultValues(plan).features.join("\n"),
	)

	useEffect(() => {
		const defaults = toDefaultValues(plan)
		reset(defaults)
		setFeaturesText(defaults.features.join("\n"))
	}, [plan, reset])

	async function onSubmit(values: PlanAdminInput) {
		try {
			if (plan) {
				await updatePlan.mutateAsync({ id: plan.id, input: values })
			} else {
				await createPlan.mutateAsync(values)
			}
			toast.success(
				plan ? "Plano atualizado com sucesso!" : "Plano criado com sucesso!",
			)
			onSuccess?.()
			onOpenChange(false)
		} catch (submitError) {
			toast.error(submitErrorMessage(submitError))
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isEditing ? "Editar plano" : "Novo plano"}</DialogTitle>
					<DialogDescription>
						Preencha os dados do plano de assinatura.
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={handleSubmit(onSubmit)}
					noValidate
					className="flex flex-col gap-4"
					aria-label="Formulário de plano"
				>
					<FormField
						id={nameId}
						label="Nome"
						error={errors.name?.message}
						{...register("name")}
					/>
					<FormField
						id={priceId}
						label="Preço (R$)"
						type="number"
						step="0.01"
						error={errors.price?.message}
						{...register("price", { valueAsNumber: true })}
					/>
					<div className="flex flex-col gap-2">
						<label
							htmlFor="plan-form-billing-period"
							className="text-sm font-medium text-foreground"
						>
							Periodicidade
						</label>
						<select
							id="plan-form-billing-period"
							className="flex h-10 w-full rounded-md border border-subtle bg-background px-4 py-2 text-base text-foreground focus-ring-duplo"
							{...register("billingPeriod")}
						>
							<option value="monthly">Mensal</option>
							<option value="yearly">Anual</option>
						</select>
					</div>
					<FormField
						id={taglineId}
						label="Tagline"
						error={errors.tagline?.message}
						{...register("tagline")}
					/>
					<div className="flex flex-col gap-2">
						<label
							htmlFor={featuresId}
							className="text-sm font-medium text-foreground"
						>
							Benefícios (um por linha)
						</label>
						<textarea
							id={featuresId}
							rows={4}
							value={featuresText}
							onChange={(event) => {
								setFeaturesText(event.target.value)
								setValue("features", parseFeatures(event.target.value), {
									shouldValidate: true,
								})
							}}
							className="flex w-full rounded-md border border-subtle bg-background px-4 py-2 text-base text-foreground focus-ring-duplo"
						/>
						{errors.features ? (
							<p role="alert" className="text-sm text-destructive">
								{errors.features.message}
							</p>
						) : null}
					</div>
					<FormField
						id={stripePriceIdFieldId}
						label="Stripe Price ID (opcional)"
						error={errors.stripePriceId?.message}
						{...register("stripePriceId")}
					/>

					<DialogFooter>
						<Button type="submit" disabled={isPending} aria-busy={isPending}>
							{isPending ? "Salvando..." : "Salvar plano"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
```

Run (from `apps/frontend`): `npx vitest run src/features/plans-admin/components/plan-form-dialog.test.tsx`
Expected: PASS

- **Step 3: Write the failing test**

```typescript
// apenas o novo describe/test — adicionar ao arquivo existente
describe("PlanFormDialog — edição", () => {
	test("pré-preenche os campos a partir do plano recebido, sem campo de status", async () => {
		const plan = {
			id: "plan-1",
			name: "Premium Anual",
			priceCents: 47900,
			billingPeriod: "yearly" as const,
			tagline: "Economia anual.",
			features: ["Tudo do mensal"],
			isActive: true,
			stripePriceId: "price_demo_yearly",
		}

		renderWithProviders(
			<PlanFormDialog open plan={plan} onOpenChange={() => {}} />,
		)

		expect(screen.getByLabelText(/nome/i)).toHaveValue("Premium Anual")
		expect(screen.getByLabelText(/preço/i)).toHaveValue(479)
		expect(screen.getByLabelText(/tagline/i)).toHaveValue("Economia anual.")
		expect(screen.queryByLabelText(/status|ativo|inativo/i)).not.toBeInTheDocument()
	})
})
```

Run (from `apps/frontend`): `npx vitest run src/features/plans-admin/components/plan-form-dialog.test.tsx`
Expected: PASS — `toDefaultValues`/`reset` do Step 2 já preenchem o formulário a partir de `plan`
e o dialog nunca renderiza um campo de status; este passo confirma explicitamente a regra da
FR-005 antes de conectar o dialog à página

- **Step 4: Write minimal implementation** *(conectar o dialog à página — sem novo teste
  dedicado; a listagem/toggle da task-10 permanece coberta por `admin/planos/page.test.tsx`)*

```tsx
// apps/frontend/src/app/(authenticated)/admin/planos/page.tsx
import { PlanFormDialog } from "@/features/plans-admin/components/plan-form-dialog"

// substitui o comentário "PlanFormDialog é conectado a isFormOpen/editingPlan pela task-11"
<PlanFormDialog
	open={isFormOpen}
	plan={editingPlan}
	onOpenChange={setIsFormOpen}
	onSuccess={() => setEditingPlan(null)}
/>
```

Run (from `apps/frontend`): `npx vitest run "src/app/(authenticated)/admin/planos/page.test.tsx"`
Expected: PASS — os testes de listagem/inativação da task-10 continuam passando com o dialog
agora renderizado (fechado por padrão, `open={isFormOpen}` é `false` até um clique em "Editar"/
"Novo plano")

- **Step 5: Commit** *(apenas quando `workflow.auto_commit` for `true` — o prompt do
  implementador informa; caso contrário, pular este passo e reportar os arquivos)*

```bash
git add apps/frontend/src/features/plans-admin/components/plan-form-dialog.tsx \
  apps/frontend/src/features/plans-admin/components/plan-form-dialog.test.tsx \
  apps/frontend/src/app/\(authenticated\)/admin/planos/page.tsx
git commit -m "feat(plans-admin): add plan create/edit form dialog"
```

## Critérios de Sucesso

- `PlanFormDialog` cria um plano enviando `priceCents` calculado a partir do preço digitado em
  reais (FR-001).
- Preço negativo é rejeitado no campo pelo zod, sem chamar a API (FR-002); nome vazio segue o
  mesmo caminho (FR-003).
- Em modo edição, os campos são pré-preenchidos a partir do plano recebido e **nenhum** campo de
  status/`isActive` é renderizado (FR-004, FR-005).
- Falha de submissão HTTP mostra `toast.error` sem fechar o dialog nem limpar os campos já
  preenchidos.
