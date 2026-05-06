"use client"

import { ShieldCheck } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import {
	type CheckIn,
	useCheckIns,
	useValidateCheckIn,
} from "@/features/check-ins/api"
import { CheckInItem } from "@/features/check-ins/components/check-in-item"
import { ApiError } from "@/lib/errors"

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3"]

function LoadingState() {
	return (
		<ul
			data-testid="admin-checkins-skeleton"
			aria-label="Carregando check-ins pendentes"
			className="flex flex-col gap-2"
		>
			{SKELETON_KEYS.map((key) => (
				<li key={key}>
					<Skeleton className="h-16 w-full rounded-[12px]" />
				</li>
			))}
		</ul>
	)
}

function validateErrorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		if (error.status === 409) {
			return "Este check-in já foi validado ou expirou."
		}
		return error.userMessage
	}
	return "Não foi possível validar o check-in. Tente novamente."
}

interface ValidateButtonProps {
	checkIn: CheckIn
}

function ValidateButton({ checkIn }: ValidateButtonProps) {
	const { mutateAsync, isPending } = useValidateCheckIn()
	async function handleClick() {
		try {
			await mutateAsync(checkIn.id)
			toast.success("Check-in validado com sucesso.")
		} catch (submitError) {
			toast.error(validateErrorMessage(submitError))
		}
	}
	return (
		<Button
			type="button"
			size="sm"
			onClick={handleClick}
			disabled={isPending}
			aria-busy={isPending}
			data-testid={`admin-checkin-validate-${checkIn.id}`}
		>
			{isPending ? "Validando..." : "Validar"}
		</Button>
	)
}

interface BodyProps {
	query: ReturnType<typeof useCheckIns>
}

function PendingError({ query }: BodyProps) {
	return (
		<EmptyState
			title="Não foi possível carregar os check-ins pendentes"
			description={query.error?.userMessage}
			action={
				<Button
					variant="outline"
					onClick={() => query.refetch()}
					data-testid="admin-checkins-retry"
				>
					Tentar novamente
				</Button>
			}
		/>
	)
}

function PendingEmpty() {
	return (
		<EmptyState
			icon={ShieldCheck}
			title="Nenhum check-in pendente"
			description="Todos os check-ins foram validados."
		/>
	)
}

function PendingList({ items }: { items: ReadonlyArray<CheckIn> }) {
	return (
		<ul data-testid="admin-checkins-list" className="flex flex-col gap-2">
			{items.map((checkIn) => (
				<CheckInItem
					key={checkIn.id}
					checkIn={checkIn}
					action={<ValidateButton checkIn={checkIn} />}
				/>
			))}
		</ul>
	)
}

function AdminCheckInsBody({ query }: BodyProps) {
	if (query.isLoading) return <LoadingState />
	if (query.isError) return <PendingError query={query} />
	if (!query.isSuccess) return null
	const items = (query.data?.items ?? []).filter(
		(item) => item.validatedAt === null,
	)
	if (items.length === 0) return <PendingEmpty />
	return <PendingList items={items} />
}

export default function AdminCheckInsPage() {
	const [page] = useState(1)
	const query = useCheckIns({ page, status: "pending" })

	return (
		<section
			aria-labelledby="admin-checkins-title"
			className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6"
		>
			<header className="flex flex-col gap-1">
				<h1
					id="admin-checkins-title"
					className="font-display text-3xl font-medium text-foreground"
				>
					Check-ins pendentes
				</h1>
				<p className="text-sm text-muted-foreground">
					Valide as presenças registradas pelos membros.
				</p>
			</header>

			<AdminCheckInsBody query={query} />
		</section>
	)
}
