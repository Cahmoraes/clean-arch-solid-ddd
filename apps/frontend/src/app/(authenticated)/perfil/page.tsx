"use client"

import { UserCircle } from "lucide-react"
import React from "react"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Eyebrow } from "@/components/ui/eyebrow"
import { RoleBadge } from "@/components/ui/role-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/ui/status-badge"
import { type Me, useMe, useMetrics } from "@/features/profile/api"
import { EditProfileModal } from "@/features/profile/components/EditProfileModal"

const WEEK_DAYS = [
	{ id: "dom", label: "D" },
	{ id: "seg", label: "S" },
	{ id: "ter", label: "T" },
	{ id: "qua", label: "Q" },
	{ id: "qui", label: "Q" },
	{ id: "sex", label: "S" },
	{ id: "sab", label: "S" },
] as const

function formatDate(isoString: string): string {
	return new Intl.DateTimeFormat("pt-BR", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(isoString))
}

function toRole(role: string): "ADMIN" | "MEMBER" {
	return role === "ADMIN" ? "ADMIN" : "MEMBER"
}

const STATUS_CONFIG = {
	activated: { tone: "success", label: "Ativo" },
	suspended: { tone: "danger", label: "Suspenso" },
	locked: { tone: "warning", label: "Bloqueado" },
} as const

function ProfileStatusBadge({ status }: { status: string }) {
	const config =
		STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ??
		STATUS_CONFIG.activated
	return <StatusBadge tone={config.tone}>{config.label}</StatusBadge>
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
		<div className="grid grid-cols-[1.5fr_1fr] items-start gap-[18px] max-[1100px]:grid-cols-1">
			<div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
				<Skeleton className="h-[92px] rounded-none" />
				<div className="flex flex-col gap-3 p-7">
					<Skeleton className="h-12 w-12 rounded-full" />
					<Skeleton className="h-6 w-48" />
					<Skeleton className="h-4 w-64" />
					<div className="grid grid-cols-2 gap-3 pt-2">
						<Skeleton className="h-16 rounded-md" />
						<Skeleton className="h-16 rounded-md" />
					</div>
				</div>
			</div>
			<div className="rounded-lg border border-border bg-card p-7 shadow-sm">
				<Skeleton className="h-16 w-32" />
				<Skeleton className="mt-6 h-10 w-full" />
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

function CheckInsValue({
	checkInsCount,
	metricsLoading,
	metricsError,
	onMetricsRetry,
}: Pick<
	ProfileCardProps,
	"checkInsCount" | "metricsLoading" | "metricsError" | "onMetricsRetry"
>) {
	if (metricsLoading) {
		return <Skeleton className="h-5 w-10" />
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
			data-testid="profile-checkins"
			className="tabular font-mono text-[15px] font-semibold text-foreground"
		>
			{checkInsCount ?? 0}
		</span>
	)
}

function ProfileFactsGrid({
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
		<div className="grid grid-cols-2 gap-3 p-7">
			<div className="rounded-md border border-border bg-surface-2 p-4">
				<Eyebrow className="mb-2 block">ID</Eyebrow>
				<p
					data-testid="profile-id"
					className="truncate font-mono text-[13px] font-semibold text-foreground"
				>
					{me.id}
				</p>
			</div>
			<div className="rounded-md border border-border bg-surface-2 p-4">
				<Eyebrow className="mb-2 block">Membro desde</Eyebrow>
				<p
					data-testid="profile-created-at"
					className="text-[15px] font-semibold text-foreground"
				>
					{me.createdAt ? formatDate(me.createdAt) : "—"}
				</p>
			</div>
			<div className="col-span-2 flex items-center justify-between rounded-md border border-border bg-surface-2 p-4">
				<Eyebrow className="block">Check-ins realizados</Eyebrow>
				<CheckInsValue
					checkInsCount={checkInsCount}
					metricsLoading={metricsLoading}
					metricsError={metricsError}
					onMetricsRetry={onMetricsRetry}
				/>
			</div>
		</div>
	)
}

function MetricCard({
	checkInsCount,
	metricsLoading,
	metricsError,
	onMetricsRetry,
}: Pick<
	ProfileCardProps,
	"checkInsCount" | "metricsLoading" | "metricsError" | "onMetricsRetry"
>) {
	return (
		<div className="rounded-lg border border-border bg-card p-7 shadow-sm">
			<div className="flex flex-col border-b border-border pb-6">
				{metricsLoading ? (
					<Skeleton className="h-16 w-32" />
				) : metricsError ? (
					<Button
						type="button"
						variant="secondary"
						size="sm"
						onClick={onMetricsRetry}
					>
						Tentar novamente
					</Button>
				) : (
					<span
						data-testid="metric-checkins"
						className="tabular font-mono text-[68px] font-bold leading-[0.9] tracking-tight text-accent"
					>
						{checkInsCount ?? 0}
					</span>
				)}
				<span className="mt-1.5 text-sm text-muted-foreground">
					check-ins realizados
				</span>
			</div>
			<div className="pt-[22px]">
				<p className="mb-3.5 text-sm font-semibold text-foreground">
					Esta semana
				</p>
				<div className="flex gap-2">
					{WEEK_DAYS.map((day) => (
						<span
							key={day.id}
							className="flex aspect-square flex-1 items-center justify-center rounded-[10px] border border-border bg-surface-2 text-xs font-semibold text-subtle data-[on=true]:border-transparent data-[on=true]:bg-accent data-[on=true]:text-accent-foreground"
							data-on={false}
						>
							{day.label}
						</span>
					))}
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
		<div className="grid grid-cols-[1.5fr_1fr] items-start gap-[18px] max-[1100px]:grid-cols-1">
			<div
				data-testid="profile-card"
				className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
			>
				<div className="h-[92px] bg-gradient-to-r from-accent to-accent/40" />
				<div className="-mt-10 flex items-start justify-between gap-[18px] px-7">
					<Avatar name={me.name} size="lg" className="border-4 border-card" />
					<div className="mt-[46px] flex items-center gap-2">
						<RoleBadge role={toRole(me.role)} />
						<ProfileStatusBadge status={me.status} />
					</div>
				</div>
				<div className="px-7 pt-2">
					<h1
						data-testid="profile-name"
						className="font-display text-2xl font-semibold text-foreground"
					>
						{me.name}
					</h1>
					<p
						data-testid="profile-email"
						className="font-mono text-[13px] text-subtle"
					>
						{me.email}
					</p>
				</div>
				<ProfileFactsGrid
					me={me}
					checkInsCount={checkInsCount}
					metricsLoading={metricsLoading}
					metricsError={metricsError}
					onMetricsRetry={onMetricsRetry}
				/>
				<div className="px-7 pb-7">
					<Button
						type="button"
						variant="secondary"
						onClick={onEdit}
						data-testid="profile-edit-button"
						className="w-full"
					>
						Editar perfil
					</Button>
				</div>
			</div>

			<MetricCard
				checkInsCount={checkInsCount}
				metricsLoading={metricsLoading}
				metricsError={metricsError}
				onMetricsRetry={onMetricsRetry}
			/>
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
		<main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
			<header className="flex flex-col gap-1">
				<Eyebrow>Conta</Eyebrow>
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
