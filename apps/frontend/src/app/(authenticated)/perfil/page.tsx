"use client"

import { UserCircle } from "lucide-react"
import React from "react"
import { AdminBadge } from "@/components/ui/admin-badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { type Me, useMe, useMetrics } from "@/features/profile/api"
import { EditProfileModal } from "@/features/profile/components/EditProfileModal"

function getInitials(name: string): string {
	return name
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((word) => word[0].toUpperCase())
		.join("")
}

function formatDate(isoString: string): string {
	return new Intl.DateTimeFormat("pt-BR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(isoString))
}

const statusConfig = {
	activated: {
		label: "Ativo",
		className: "bg-green-950 text-green-400 border border-green-800",
	},
	suspended: {
		label: "Suspenso",
		className: "bg-red-950 text-red-400 border border-red-800",
	},
} as const

function StatusBadge({ status }: { status: string }) {
	const config =
		statusConfig[status as keyof typeof statusConfig] ?? statusConfig.activated
	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
		>
			<span className="h-1.5 w-1.5 rounded-full bg-current" />
			{config.label}
		</span>
	)
}

interface ProfileCardProps {
	me: Me | undefined
	meLoading: boolean
	meError: boolean
	meFetching: boolean
	onRetry: () => void
	checkInsCount: number | undefined
	metricsLoading: boolean
	metricsError: boolean
	onMetricsRetry: () => void
	onEdit: () => void
}

function ProfileCardLoading() {
	return (
		<div className="rounded-[12px] border border-border bg-card p-6">
			<div className="mb-4 flex items-center gap-3">
				<Skeleton className="h-12 w-12 rounded-full" />
				<div className="flex flex-col gap-2">
					<Skeleton className="h-4 w-36" />
					<Skeleton className="h-3 w-48" />
				</div>
			</div>
			<div className="grid grid-cols-2 gap-3">
				<Skeleton className="h-16 rounded-lg" />
				<Skeleton className="h-16 rounded-lg" />
				<Skeleton className="col-span-2 h-20 rounded-lg" />
			</div>
		</div>
	)
}

function ProfileCardError({
	meFetching,
	onRetry,
}: Pick<ProfileCardProps, "meFetching" | "onRetry">) {
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
					disabled={meFetching}
				>
					Tentar novamente
				</Button>
			}
		/>
	)
}

function ProfileCardHeader({ me }: { me: Me }) {
	return (
		<div className="flex items-center gap-3">
			<div
				aria-hidden="true"
				className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground"
			>
				{getInitials(me.name)}
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span
					data-testid="profile-name"
					className="truncate font-semibold text-foreground"
				>
					{me.name}
				</span>
				<span
					data-testid="profile-email"
					className="truncate text-sm text-muted-foreground"
				>
					{me.email}
				</span>
			</div>
			<div className="flex shrink-0 flex-col items-end gap-1">
				{me.role === "ADMIN" && <AdminBadge />}
				{me.status && <StatusBadge status={me.status} />}
			</div>
		</div>
	)
}

function CheckInsMetric({
	checkInsCount,
	metricsLoading,
	metricsError,
	onMetricsRetry,
}: Pick<
	ProfileCardProps,
	"checkInsCount" | "metricsLoading" | "metricsError" | "onMetricsRetry"
>) {
	if (metricsLoading) {
		return <Skeleton className="h-7 w-12" />
	}

	if (metricsError) {
		return (
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={onMetricsRetry}
				className="h-auto p-0 text-xs"
			>
				Tentar novamente
			</Button>
		)
	}

	return (
		<span
			data-testid="metric-checkins"
			className="font-display text-2xl font-semibold text-primary"
		>
			{checkInsCount ?? 0}
		</span>
	)
}

function ProfileCardInfoGrid({
	me,
	checkInsCount,
	metricsLoading,
	metricsError,
	onMetricsRetry,
}: Pick<
	ProfileCardProps,
	"me" | "checkInsCount" | "metricsLoading" | "metricsError" | "onMetricsRetry"
>) {
	if (!me) return null

	return (
		<div className="grid grid-cols-2 gap-3">
			<div className="rounded-lg bg-muted/50 p-3">
				<p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
					ID
				</p>
				<p
					data-testid="profile-id"
					className="truncate text-xs font-mono text-foreground"
				>
					{me.id}
				</p>
			</div>
			<div className="rounded-lg bg-muted/50 p-3">
				<p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
					Membro desde
				</p>
				<p data-testid="profile-created-at" className="text-sm text-foreground">
					{me.createdAt ? formatDate(me.createdAt) : "—"}
				</p>
			</div>
			<div className="col-span-2 flex items-center justify-between rounded-lg bg-muted/50 p-3">
				<div>
					<p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
						Check-ins realizados
					</p>
					<CheckInsMetric
						checkInsCount={checkInsCount}
						metricsLoading={metricsLoading}
						metricsError={metricsError}
						onMetricsRetry={onMetricsRetry}
					/>
				</div>
			</div>
		</div>
	)
}

function ProfileCard({
	me,
	meLoading,
	meError,
	meFetching,
	onRetry,
	checkInsCount,
	metricsLoading,
	metricsError,
	onMetricsRetry,
	onEdit,
}: ProfileCardProps) {
	if (meLoading) return <ProfileCardLoading />
	if (meError || !me) {
		return <ProfileCardError meFetching={meFetching} onRetry={onRetry} />
	}

	return (
		<div
			data-testid="profile-card"
			className="flex flex-col gap-5 rounded-[12px] border border-border bg-card p-6"
		>
			<ProfileCardHeader me={me} />
			<ProfileCardInfoGrid
				me={me}
				checkInsCount={checkInsCount}
				metricsLoading={metricsLoading}
				metricsError={metricsError}
				onMetricsRetry={onMetricsRetry}
			/>
			<Button
				type="button"
				variant="secondary"
				onClick={onEdit}
				data-testid="profile-edit-button"
				className="w-full"
			>
				✏️ Editar perfil
			</Button>
		</div>
	)
}

export default function ProfilePage() {
	const [editOpen, setEditOpen] = React.useState(false)
	const {
		data: me,
		isLoading: meLoading,
		isError: meError,
		refetch: meRefetch,
		isFetching: meFetching,
	} = useMe()
	const {
		data: metrics,
		isLoading: metricsLoading,
		isError: metricsError,
		refetch: metricsRefetch,
	} = useMetrics()

	return (
		<main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-10 sm:px-6">
			<header className="flex flex-col gap-1">
				<h1 className="font-display text-3xl font-semibold text-foreground">
					Meu perfil
				</h1>
				<p className="text-sm text-muted-foreground">
					Visualize e mantenha seus dados de acesso e acompanhe suas métricas.
				</p>
			</header>

			<ProfileCard
				me={me}
				meLoading={meLoading}
				meError={meError}
				meFetching={meFetching}
				onRetry={() => void meRefetch()}
				checkInsCount={metrics?.checkInsCount}
				metricsLoading={metricsLoading}
				metricsError={metricsError}
				onMetricsRetry={() => void metricsRefetch()}
				onEdit={() => {
					if (!editOpen) {
						setEditOpen(true)
					}
				}}
			/>

			{me ? (
				<EditProfileModal
					open={editOpen}
					onOpenChange={setEditOpen}
					currentName={me.name}
					hasPassword={me.hasPassword}
				/>
			) : null}
		</main>
	)
}
