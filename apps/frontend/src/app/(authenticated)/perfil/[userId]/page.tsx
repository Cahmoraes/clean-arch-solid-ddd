"use client"

import { UserCircle } from "lucide-react"
import Link from "next/link"
import { use } from "react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { useUserById } from "@/features/profile/api"
import { ApiError } from "@/lib/errors"

interface PublicProfilePageProps {
	params: Promise<{ userId: string }>
}

function formatRole(role: string | undefined): string {
	if (role === "ADMIN") return "Administrador"
	if (role === "MEMBER") return "Membro"
	return role ?? "—"
}

export interface PublicProfileViewProps {
	userId: string
}

interface PublicProfileBodyProps {
	isLoading: boolean
	isError: boolean
	notFound: boolean
	isFetching: boolean
	data: ReturnType<typeof useUserById>["data"]
	refetch: () => void
}

function PublicProfileBody({
	isLoading,
	isError,
	notFound,
	isFetching,
	data,
	refetch,
}: PublicProfileBodyProps) {
	if (isLoading) {
		return (
			<div
				data-testid="public-profile-skeleton"
				className="flex flex-col gap-3"
			>
				<Skeleton className="h-6 w-48" />
				<Skeleton className="h-4 w-64" />
			</div>
		)
	}
	if (notFound) {
		return (
			<EmptyState
				icon={UserCircle}
				title="Usuário não encontrado"
				description="O ID informado não corresponde a nenhum usuário."
			/>
		)
	}
	if (isError || !data) {
		return (
			<EmptyState
				icon={UserCircle}
				title="Não foi possível carregar este perfil"
				description="Tente novamente em instantes."
				action={
					<Button
						type="button"
						variant="secondary"
						onClick={() => refetch()}
						data-testid="public-profile-retry"
						disabled={isFetching}
					>
						Tentar novamente
					</Button>
				}
			/>
		)
	}
	return (
		<dl data-testid="public-profile-data" className="grid gap-4 sm:grid-cols-2">
			<div className="flex flex-col gap-1">
				<dt className="text-sm text-muted-foreground">Nome</dt>
				<dd
					data-testid="public-profile-name"
					className="text-base font-medium text-foreground"
				>
					{data.name}
				</dd>
			</div>
			<div className="flex flex-col gap-1">
				<dt className="text-sm text-muted-foreground">E-mail</dt>
				<dd
					data-testid="public-profile-email"
					className="text-base font-medium text-foreground"
				>
					{data.email}
				</dd>
			</div>
			<div className="flex flex-col gap-1">
				<dt className="text-sm text-muted-foreground">Função</dt>
				<dd
					data-testid="public-profile-role"
					className="text-base font-medium text-foreground"
				>
					{formatRole(data.role)}
				</dd>
			</div>
			<div className="flex flex-col gap-1">
				<dt className="text-sm text-muted-foreground">ID</dt>
				<dd
					data-testid="public-profile-id"
					className="text-base font-mono text-foreground"
				>
					{data.id}
				</dd>
			</div>
		</dl>
	)
}

export function PublicProfileView({ userId }: PublicProfileViewProps) {
	const { data, isLoading, isError, error, refetch, isFetching } =
		useUserById(userId)

	const notFound = error instanceof ApiError && error.status === 404

	return (
		<main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6">
			<header className="flex flex-col gap-2">
				<Link
					href="/perfil"
					className="text-sm text-muted-foreground underline-offset-4 hover:underline"
					data-testid="public-profile-back"
				>
					← Voltar ao meu perfil
				</Link>
				<h1 className="font-display text-3xl font-semibold text-foreground">
					Perfil público
				</h1>
				<p className="text-sm text-muted-foreground">
					Informações públicas do usuário consultado.
				</p>
			</header>

			<section
				aria-labelledby="public-profile-section-title"
				className="flex flex-col gap-4 rounded-[12px] border border-border bg-card p-6"
			>
				<h2 id="public-profile-section-title" className="sr-only">
					Dados públicos
				</h2>
				<PublicProfileBody
					isLoading={isLoading}
					isError={isError}
					notFound={notFound}
					isFetching={isFetching}
					data={data}
					refetch={refetch}
				/>
			</section>
		</main>
	)
}

export default function PublicProfilePage({ params }: PublicProfilePageProps) {
	const { userId } = use(params)
	return <PublicProfileView userId={userId} />
}
