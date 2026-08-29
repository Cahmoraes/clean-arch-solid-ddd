"use client"

import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { PageContainer } from "@/components/layout/page-container"
import { Card, CardContent } from "@/components/ui/card"
import { Eyebrow } from "@/components/ui/eyebrow"
import { useUserActivity } from "@/features/activity/api/use-user-activity"
import { ActivityPaginationCardHeader } from "@/features/activity/components/activity-pagination-card-header"
import { ActivityTab } from "@/features/activity/components/activity-tab"
import { getActivityPageFromParam } from "@/features/activity/lib/activity-pagination"
import { useUserById } from "@/features/profile/api"

export function AdminUserActivityView({ userId }: { userId: string }) {
	const router = useRouter()
	const searchParams = useSearchParams()
	const page = getActivityPageFromParam(searchParams.get("page"))

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
				<ActivityPaginationCardHeader
					pagination={activityData?.pagination}
					isTransitioning={isActivityFetching || isActivityPlaceholderData}
					onPageChange={handlePageChange}
					testIdPrefix="admin-activity-top"
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
