"use client"

import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { PageContainer } from "@/components/layout/page-container"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Eyebrow } from "@/components/ui/eyebrow"
import { NumberedPagination } from "@/components/ui/numbered-pagination"
import {
	type UserActivityPagination,
	useUserActivity,
} from "@/features/activity/api/use-user-activity"
import { ActivityTab } from "@/features/activity/components/activity-tab"
import { useUserById } from "@/features/profile/api"

function isValidActivityPageParam(pageParam: string | null): boolean {
	const parsedPage = Number(pageParam)
	return Number.isSafeInteger(parsedPage) && parsedPage > 0
}

function getActivityPage(pageParam: string | null): number {
	return isValidActivityPageParam(pageParam) ? Number(pageParam) : 1
}

function shouldShowTopPagination(
	pagination: UserActivityPagination | undefined,
): boolean {
	return !!pagination && pagination.totalPages > 1
}

function getTopActivityPage(
	pagination: UserActivityPagination | undefined,
): number {
	if (!pagination) return 1
	return Math.min(
		Math.max(pagination.page, 1),
		Math.max(pagination.totalPages, 1),
	)
}

function AdminActivityCardHeader({
	pagination,
	isTransitioning,
	onPageChange,
}: {
	pagination: UserActivityPagination | undefined
	isTransitioning: boolean
	onPageChange: (page: number) => void
}) {
	const showTopPagination = shouldShowTopPagination(pagination)
	const topPage = getTopActivityPage(pagination)

	return (
		<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 border-b border-border">
			<CardTitle as="h2">Histórico de atividades</CardTitle>
			<div className="flex flex-wrap items-center gap-3">
				<span className="inline-flex items-center rounded-full border bg-muted/40 px-2.5 py-1 font-mono text-[11px] font-medium tracking-wide text-muted-foreground">
					20 por página
				</span>
				{showTopPagination ? (
					<NumberedPagination
						page={topPage}
						totalPages={pagination ? pagination.totalPages : 1}
						onChange={onPageChange}
						testIdPrefix="admin-activity-top"
						disabled={isTransitioning}
						className="mx-0 w-auto justify-end"
					/>
				) : null}
			</div>
		</CardHeader>
	)
}

export function AdminUserActivityView({ userId }: { userId: string }) {
	const router = useRouter()
	const searchParams = useSearchParams()
	const page = getActivityPage(searchParams.get("page"))

	const { data: targetUser } = useUserById(userId)
	const {
		data: activityData,
		isLoading: isActivityLoading,
		isError: isActivityError,
		isFetching: isActivityFetching,
		isPlaceholderData: isActivityPlaceholderData,
	} = useUserActivity(userId, { page })

	function handlePageChange(nextPage: number) {
		const nextParams = new URLSearchParams(searchParams.toString())
		nextParams.set("page", String(nextPage))
		router.replace(`?${nextParams.toString()}`)
	}

	return (
		<PageContainer width="default" className="gap-6">
			<div>
				<Link
					href="/admin/usuarios"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft aria-hidden className="h-4 w-4" />
					Voltar para usuários
				</Link>
			</div>
			<header className="flex flex-col gap-1">
				<Eyebrow>
					admin / usuários / {targetUser?.name ?? userId} / atividade
				</Eyebrow>
				<h1 className="font-display text-3xl font-semibold text-foreground">
					Histórico de atividades
				</h1>
			</header>

			<Card className="w-full gap-0 rounded-[22px]">
				<AdminActivityCardHeader
					pagination={activityData?.pagination}
					isTransitioning={isActivityFetching || isActivityPlaceholderData}
					onPageChange={handlePageChange}
				/>
				<CardContent className="pt-6">
					<ActivityTab
						events={activityData?.events}
						pagination={activityData?.pagination}
						onPageChange={handlePageChange}
						isLoading={isActivityLoading}
						isError={isActivityError}
						isFetching={isActivityFetching}
						isPlaceholderData={isActivityPlaceholderData}
					/>
				</CardContent>
			</Card>
		</PageContainer>
	)
}

export default function AdminUserActivityPage() {
	const params = useParams<{ userId: string }>()
	const userId = params?.userId
	if (!userId) return null
	return <AdminUserActivityView userId={userId} />
}
