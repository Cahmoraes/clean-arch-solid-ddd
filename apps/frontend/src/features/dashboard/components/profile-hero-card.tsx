"use client"

import { User } from "lucide-react"
import { PixelScene } from "@/components/ui/pixel-scene"
import { Skeleton } from "@/components/ui/skeleton"
import { type Me, useMe, useMetrics } from "@/features/profile/api"
import { cn } from "@/lib/cn"

function getInitials(name: string): string {
	return name
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0])
		.join("")
		.toUpperCase()
}

function formatMemberSince(createdAt: string): string {
	return new Date(createdAt).toLocaleDateString("pt-BR", {
		month: "short",
		year: "numeric",
	})
}

function Avatar({ name }: { name?: string }) {
	return (
		<div
			data-testid="hero-avatar"
			className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground text-lg font-bold"
		>
			{name ? (
				getInitials(name)
			) : (
				<User className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
			)}
		</div>
	)
}

function StatusBadge({ isActive }: { isActive: boolean }) {
	const statusClass = isActive
		? "border-transparent bg-success-soft text-success"
		: "border-transparent bg-muted text-muted-foreground"
	return (
		<span
			data-testid="hero-badge"
			className={cn(
				"mt-1 inline-flex w-fit items-center gap-1.5 rounded-sm border px-2.5 py-0.5 text-xs font-medium",
				statusClass,
			)}
		>
			<span
				data-testid="hero-status-dot"
				className={cn(
					"h-1.5 w-1.5 rounded-none",
					isActive ? "bg-success" : "bg-muted-foreground/70",
				)}
				aria-hidden="true"
			/>
			{isActive ? "Conta ativa" : "Conta suspensa"}
		</span>
	)
}

function UserInfo({ me }: { me?: Me }) {
	const isActive = me?.status === "activated"
	return (
		<div className="flex flex-col gap-1">
			<h2 className="text-base font-semibold text-primary">
				{me?.name ?? "—"}
			</h2>
			<p className="text-sm text-muted-foreground">{me?.email}</p>
			{me?.createdAt && (
				<p className="text-xs text-muted-foreground">
					Membro desde {formatMemberSince(me.createdAt)}
				</p>
			)}
			<StatusBadge isActive={isActive} />
		</div>
	)
}

function InlineStats({
	total,
	thisMonth,
	streak,
}: {
	total: number
	thisMonth: number
	streak: number
}) {
	return (
		<div className="flex w-full justify-center gap-6 border-t border-border pt-4 md:ml-auto md:w-auto md:border-0 md:pt-0 md:justify-start">
			<div className="text-center">
				<p className="text-lg font-semibold text-primary md:text-xl">{total}</p>
				<p className="text-xs text-muted-foreground">Total</p>
			</div>
			<div className="text-center">
				<p className="text-lg font-semibold text-primary md:text-xl">
					{thisMonth}
				</p>
				<p className="text-xs text-muted-foreground">Este mês</p>
			</div>
			<div className="text-center">
				<p className="text-lg font-semibold text-primary md:text-xl">
					{streak}
				</p>
				<p className="text-xs text-muted-foreground">Sequência</p>
			</div>
		</div>
	)
}

function ProfileHeroCardSkeleton() {
	return (
		<div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 md:flex-row md:flex-wrap md:items-center">
			<div className="flex items-center gap-4">
				<Skeleton className="h-14 w-14 rounded-md" />
				<div className="flex flex-col gap-2">
					<Skeleton className="h-5 w-40" />
					<Skeleton className="h-4 w-56" />
					<Skeleton className="h-4 w-20" />
				</div>
			</div>
			<div className="flex w-full justify-center gap-6 border-t border-border pt-4 md:ml-auto md:w-auto md:border-0 md:pt-0">
				<Skeleton className="h-12 w-12" />
				<Skeleton className="h-12 w-12" />
				<Skeleton className="h-12 w-12" />
			</div>
		</div>
	)
}

interface ProfileHeroCardProps {
	thisMonth: number
	streak: number
}

export function ProfileHeroCard({ thisMonth, streak }: ProfileHeroCardProps) {
	const { data: me, isLoading } = useMe()
	const { data: metrics } = useMetrics()

	if (isLoading) {
		return <ProfileHeroCardSkeleton />
	}

	return (
		<div className="relative isolate flex flex-col gap-4 overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm md:flex-row md:flex-wrap md:items-center">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-16 opacity-60"
			>
				<PixelScene scene="hero" animated />
			</div>
			<div className="flex items-center gap-4">
				<Avatar name={me?.name} />
				<UserInfo me={me} />
			</div>
			<InlineStats
				total={metrics?.checkInsCount ?? 0}
				thisMonth={thisMonth}
				streak={streak}
			/>
		</div>
	)
}
