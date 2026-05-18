"use client"

import { Activity, KeyRound, UserCircle } from "lucide-react"
import Link from "next/link"
import { AdminBadge } from "@/components/ui/admin-badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { type Me, useMe, useMetrics } from "@/features/profile/api"
import { useAuthStore } from "@/lib/auth/auth-store"

interface ProfileSectionProps {
	data: Me | undefined
	isError: boolean
	isFetching: boolean
	isLoading: boolean
	onRetry: () => void
}

function ProfileSection({
	data,
	isError,
	isFetching,
	isLoading,
	onRetry,
}: ProfileSectionProps) {
	if (isLoading) {
		return (
			<div data-testid="profile-skeleton" className="flex flex-col gap-3">
				<Skeleton className="h-6 w-48" />
				<Skeleton className="h-4 w-64" />
				<Skeleton className="h-4 w-32" />
			</div>
		)
	}

	if (isError || !data) {
		return (
			<EmptyState
				icon={UserCircle}
				title="Não foi possível carregar seu perfil"
				description="Verifique sua conexão e tente novamente."
				action={
					<Button
						type="button"
						variant="secondary"
						onClick={onRetry}
						data-testid="profile-retry"
						disabled={isFetching}
					>
						Tentar novamente
					</Button>
				}
			/>
		)
	}

	return (
		<dl data-testid="profile-data" className="grid gap-4 sm:grid-cols-2">
			<div className="flex flex-col gap-1">
				<dt className="text-sm text-muted-foreground">Nome</dt>
				<dd
					data-testid="profile-name"
					className="text-base font-medium text-foreground"
				>
					{data.name}
				</dd>
			</div>
			<div className="flex flex-col gap-1">
				<dt className="text-sm text-muted-foreground">E-mail</dt>
				<dd
					data-testid="profile-email"
					className="text-base font-medium text-foreground"
				>
					{data.email}
				</dd>
			</div>
			<div className="flex flex-col gap-1">
				<dt className="text-sm text-muted-foreground">ID</dt>
				<dd
					data-testid="profile-id"
					className="text-base font-mono text-foreground"
				>
					{data.id}
				</dd>
			</div>
		</dl>
	)
}

function MetricsSection() {
	const { data, isLoading, isError, refetch, isFetching } = useMetrics()

	if (isLoading) {
		return (
			<div data-testid="metrics-skeleton" className="flex gap-4">
				<Skeleton className="h-24 w-40" />
			</div>
		)
	}

	if (isError || !data) {
		return (
			<EmptyState
				icon={Activity}
				title="Não foi possível carregar suas métricas"
				description="Tente novamente em instantes."
				action={
					<Button
						type="button"
						variant="secondary"
						onClick={() => refetch()}
						data-testid="metrics-retry"
						disabled={isFetching}
					>
						Tentar novamente
					</Button>
				}
			/>
		)
	}

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<div
				data-testid="metric-checkins"
				className="flex flex-col gap-2 rounded-[12px] border border-border bg-card p-5"
			>
				<span className="text-sm text-muted-foreground">
					Total de check-ins
				</span>
				<span className="font-display text-3xl font-semibold text-foreground">
					{data.checkInsCount}
				</span>
			</div>
		</div>
	)
}

export default function ProfilePage() {
	const { data, isLoading, isError, refetch, isFetching } = useMe()
	const { user } = useAuthStore()
	const isAdmin = user?.role === "ADMIN"
	const passwordActionLabel =
		data?.hasPassword === false ? "Definir senha" : "Alterar senha"

	return (
		<main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-4 py-10 sm:px-6">
			<header className="flex flex-col gap-2">
				<div className="flex items-center gap-3">
					<h1 className="font-display text-3xl font-semibold text-foreground">
						Meu perfil
					</h1>
					{isAdmin && <AdminBadge />}
				</div>
				<p className="text-sm text-muted-foreground">
					Visualize e mantenha seus dados de acesso e acompanhe suas métricas.
				</p>
			</header>

			<section
				aria-labelledby="profile-section-title"
				className="flex flex-col gap-4 rounded-[12px] border border-border bg-card p-6"
			>
				<div className="flex items-center justify-between gap-4">
					<h2
						id="profile-section-title"
						className="font-display text-xl font-medium text-foreground"
					>
						Dados pessoais
					</h2>
					<Button asChild variant="secondary">
						<Link
							href="/perfil/senha"
							data-testid="profile-change-password-link"
							className="inline-flex items-center gap-2"
						>
							<KeyRound className="h-4 w-4" />
							{passwordActionLabel}
						</Link>
					</Button>
				</div>
				<ProfileSection
					data={data}
					isError={isError}
					isFetching={isFetching}
					isLoading={isLoading}
					onRetry={() => {
						void refetch()
					}}
				/>
			</section>

			<section
				aria-labelledby="metrics-section-title"
				className="flex flex-col gap-4"
			>
				<h2
					id="metrics-section-title"
					className="font-display text-xl font-medium text-foreground"
				>
					Métricas
				</h2>
				<MetricsSection />
			</section>
		</main>
	)
}
