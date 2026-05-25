"use client"

import { User } from "lucide-react"
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
		<div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-accent text-lg font-bold">
			{name ? (
				getInitials(name)
			) : (
				<User className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
			)}
		</div>
	)
}

function StatusBadge({ isActive }: { isActive: boolean }) {
	return (
		<span
			className={cn(
				"mt-1 inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
				isActive
					? "border-green-800/30 bg-green-900/20 text-green-400"
					: "border-red-800/30 bg-red-900/20 text-red-400",
			)}
		>
			<span
				className={cn(
					"h-1.5 w-1.5 rounded-full",
					isActive ? "bg-green-400" : "bg-red-400",
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
			<h2 className="text-base font-semibold">{me?.name ?? "—"}</h2>
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
		<div className="ml-auto flex gap-6">
			<div className="text-center">
				<p className="text-xl font-bold">{total}</p>
				<p className="text-xs text-muted-foreground">Total</p>
			</div>
			<div className="text-center">
				<p className="text-xl font-bold">{thisMonth}</p>
				<p className="text-xs text-muted-foreground">Este mês</p>
			</div>
			<div className="text-center">
				<p className="text-xl font-bold">{streak}</p>
				<p className="text-xs text-muted-foreground">Sequência</p>
			</div>
		</div>
	)
}

function ProfileHeroCardSkeleton() {
	return (
		<div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
			<Skeleton className="h-14 w-14 rounded-full" />
			<div className="flex flex-col gap-2">
				<Skeleton className="h-5 w-40" />
				<Skeleton className="h-4 w-56" />
				<Skeleton className="h-4 w-20" />
			</div>
			<div className="ml-auto flex gap-6">
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
		<div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-5">
			<Avatar name={me?.name} />
			<UserInfo me={me} />
			<InlineStats
				total={metrics?.checkInsCount ?? 0}
				thisMonth={thisMonth}
				streak={streak}
			/>
		</div>
	)
}
